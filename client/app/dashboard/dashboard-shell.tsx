"use client";

import { useEffect } from "react";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getMe, logout } from "@/lib/api";
import { getSession, setSession, useSession } from "@/lib/session";
import { roleLabels } from "@/lib/users";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = useSession();

  // Refresh the stored user once per visit, so a role someone else changed
  // shows up without logging in again. A deleted account gets a 401, which
  // clears the session and sends you back to log in.
  const token = session?.token;
  useEffect(() => {
    if (!token) return;
    getMe()
      .then((user) => {
        const current = getSession();
        if (current?.token === token) setSession({ ...current, user });
      })
      .catch(() => {});
  }, [token]);

  const user = session?.user;

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <p className="min-w-0 truncate text-base leading-6 font-semibold tracking-tight">
            Kvist &amp; Bjælke Login Platform
          </p>
          {user && (
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground uppercase">
                    {user.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col leading-tight sm:flex">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {roleLabels[user.role]}
                  </span>
                </div>
              </div>
              <div aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await logout();
                  toast.success("You're logged out.");
                }}
              >
                <LogOutIcon />
                Log out
              </Button>
            </div>
          )}
        </div>
      </header>
      {children}
    </>
  );
}
