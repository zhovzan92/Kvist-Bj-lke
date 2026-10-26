"use client";

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
import type { Role, User } from "@/lib/users";

export function UserFormDialog({
  user,
  roleOptions,
  open,
  onOpenChange,
}: {
  /** The user being edited. Leave out to create a new user. */
  user?: User;
  roleOptions: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = user !== undefined;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Not saved anywhere until the users API exists.
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-username">Username</Label>
            <Input
              id="user-username"
              name="username"
              required
              autoComplete="off"
              defaultValue={user?.username}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              required
              autoComplete="off"
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
                    {role}
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
              aria-describedby={isEdit ? "user-password-help" : undefined}
            />
            {isEdit && (
              <p id="user-password-help" className="text-xs text-muted-foreground">
                Leave blank to keep the current password.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">{isEdit ? "Save changes" : "Create user"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
