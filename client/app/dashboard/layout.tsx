import { LogOutIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/lib/users";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <p className="min-w-0 truncate text-base leading-6 font-semibold tracking-tight">
            Kvist &amp; Bjælke Login Platform
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                  {initials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-medium">{currentUser.name}</span>
                <span className="text-xs text-muted-foreground">
                  {currentUser.role}
                </span>
              </div>
            </div>
            <div aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
            {/* Not wired up until login exists. */}
            <Button type="button" variant="outline" size="sm">
              <LogOutIcon />
              Log out
            </Button>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
