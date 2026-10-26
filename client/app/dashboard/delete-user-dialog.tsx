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
import type { User } from "@/lib/users";

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete {user.username}?</DialogTitle>
          <DialogDescription>
            {user.username} ({user.email}) loses access straight away. You
            can&apos;t undo this.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          {/* Not removed anywhere until the users API exists. */}
          <Button
            type="button"
            variant="destructive"
            onClick={() => onOpenChange(false)}
          >
            Delete user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
