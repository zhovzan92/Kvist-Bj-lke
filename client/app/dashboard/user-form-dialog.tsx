"use client";

import { useState } from "react";
import { CircleAlertIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, createUser, updateUser } from "@/lib/api";
import {
  EMAIL_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  roleLabels,
  toRole,
  type Role,
  type User,
} from "@/lib/users";

export function UserFormDialog({
  user,
  roleOptions,
  open,
  onOpenChange,
  onSaved,
}: {
  /** The user being edited. Leave out to create a new user. */
  user?: User;
  roleOptions: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the saved user, and whether it was just created. */
  onSaved: (user: User, created: boolean) => void;
}) {
  const isEdit = user !== undefined;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const details = {
      username: String(form.get("username") ?? ""),
      email: String(form.get("email") ?? ""),
      role: toRole(String(form.get("role") ?? "")),
    };
    const password = String(form.get("password") ?? "");

    setError(null);
    setPending(true);
    try {
      const saved = user
        ? await updateUser(user.id, { ...details, newPassword: password })
        : await createUser({ ...details, password });
      onSaved(saved, !user);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Couldn't ${user ? "save the changes" : "create the user"}. Try again.`
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${user.username}` : "New user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Change this user's details or set a new password."
              : "Create an account. They sign in with the username and password you set."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="flex gap-3 rounded-lg border border-destructive p-3 text-sm"
            >
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-destructive">
                  {isEdit ? "Couldn't save changes" : "Couldn't create user"}
                </span>
                <span className="text-muted-foreground">{error}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-username">Username</Label>
            <Input
              id="user-username"
              name="username"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              minLength={USERNAME_MIN}
              maxLength={USERNAME_MAX}
              pattern="[A-Za-z0-9._\-]+"
              aria-describedby="user-username-help"
              defaultValue={user?.username}
            />
            <p id="user-username-help" className="text-xs text-muted-foreground">
              {USERNAME_MIN}–{USERNAME_MAX} characters: letters, numbers, dots,
              dashes and underscores.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              maxLength={EMAIL_MAX}
              defaultValue={user?.email}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-role">Role</Label>
            <Select name="role" defaultValue={user?.role ?? roleOptions[0]}>
              <SelectTrigger id="user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-password">
              {isEdit ? "New password" : "Password"}
            </Label>
            <Input
              id="user-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required={!isEdit}
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              aria-describedby="user-password-help"
            />
            <p id="user-password-help" className="text-xs text-muted-foreground">
              At least {PASSWORD_MIN} characters.
              {isEdit && " Leave blank to keep the current password."}
            </p>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin motion-reduce:animate-none" />}
              {isEdit
                ? pending ? "Saving…" : "Save changes"
                : pending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
