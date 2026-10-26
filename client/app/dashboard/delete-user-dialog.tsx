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
import { ApiError, deleteUser } from "@/lib/api";
import type { User } from "@/lib/users";

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onDeleted,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (user: User) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setError(null);
    setPending(true);
    try {
      await deleteUser(user.id);
      onDeleted(user);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete the user. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete {user.username}?</DialogTitle>
          <DialogDescription>
            {user.username} ({user.email}) loses access straight away. You
            can&apos;t undo this.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-destructive p-3 text-sm"
          >
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-destructive">
                Couldn&apos;t delete user
              </span>
              <span className="text-muted-foreground">{error}</span>
            </div>
          </div>
        )}
        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending && <Loader2Icon className="animate-spin motion-reduce:animate-none" />}
            {pending ? "Deleting…" : "Delete user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
