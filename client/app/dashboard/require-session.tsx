"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useIsClient, useSession } from "@/lib/session";

export function RequireSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const isClient = useIsClient();

  // Wait until the stored session has been read before sending anyone to log in.
  useEffect(() => {
    if (isClient && !session) router.replace("/");
  }, [isClient, session, router]);

  return session ? children : null;
}
