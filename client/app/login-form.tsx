"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, login } from "@/lib/api";
import { setSession, useSession } from "@/lib/session";

export function LoginForm() {
  const router = useRouter();
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      setSession(
        await login({
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
        })
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign you in. Try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-destructive bg-card p-3 text-sm"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-destructive">
              Couldn&apos;t sign you in
            </span>
            <span className="text-muted-foreground">{error}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={error ? true : undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
        />
      </div>

      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin motion-reduce:animate-none" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
