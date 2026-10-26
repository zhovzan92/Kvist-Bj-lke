import { useSyncExternalStore } from "react";

import type { User } from "./users";

export type Session = {
  token: string;
  user: User;
};

const KEY = "kvist-bjaelke.session";
const listeners = new Set<() => void>();
let current: Session | null = read();

function read(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return isExpired(session.token) ? null : session;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getSession(): Session | null {
  if (current && isExpired(current.token)) setSession(null);
  return current;
}

export function setSession(session: Session | null) {
  current = session;
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}

const noop = () => () => {};

// False while rendering on the server and during hydration, so pages can wait
// for the stored session before deciding to redirect.
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
