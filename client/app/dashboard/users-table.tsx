"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignableRoles,
  canCreateUsers,
  canManageUser,
  formatDate,
  roles,
  type Role,
  type SessionUser,
  type User,
} from "@/lib/users";

import { DeleteUserDialog } from "./delete-user-dialog";
import { UserFormDialog } from "./user-form-dialog";

const PAGE_SIZE = 10;
// Every row is the same height so the table doesn't jump between pages and filters.
const ROW_HEIGHT = 56;

type RoleFilter = "all" | Role;

type SortKey = "id" | "username" | "email" | "role" | "createdAt";
type Sort = { key: SortKey; direction: "asc" | "desc" };

type DialogState =
  | { type: "create" }
  | { type: "edit"; user: User }
  | { type: "delete"; user: User };

const columns: { key: SortKey; label: string; className: string }[] = [
  { key: "id", label: "ID", className: "w-20" },
  { key: "username", label: "Username", className: "w-[26%]" },
  { key: "email", label: "Email", className: "" },
  { key: "role", label: "Role", className: "w-32" },
  { key: "createdAt", label: "Created", className: "w-36" },
];

function compareUsers(a: User, b: User, key: SortKey) {
  switch (key) {
    case "id":
      return a.id - b.id;
    case "role":
      // By rank, not alphabetically: User < Superuser < Admin.
      return roles.indexOf(a.role) - roles.indexOf(b.role) || a.id - b.id;
    case "createdAt":
      return a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
    default:
      return a[key].localeCompare(b[key]);
  }
}

function matchesSearch(user: User, search: string) {
  if (!search) return true;
  const id = search.replace(/^#/, "");
  if (/^\d+$/.test(id) && user.id === Number(id)) return true;
  return (
    user.username.toLowerCase().includes(search) ||
    user.email.toLowerCase().includes(search)
  );
}

export function UsersTable({
  users,
  currentUser,
}: {
  users: User[];
  currentUser: SessionUser;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sort, setSort] = useState<Sort>({ key: "id", direction: "asc" });
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const actorRole = currentUser.role;
  const search = query.trim().toLowerCase();
  const hasFilters = search !== "" || roleFilter !== "all";

  const filtered = users
    .filter(
      (user) =>
        (roleFilter === "all" || user.role === roleFilter) &&
        matchesSearch(user, search)
    )
    .sort((a, b) => {
      const result = compareUsers(a, b, sort.key);
      return sort.direction === "asc" ? result : -result;
    });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // Reserve room for a full page, but don't pad out a short list of users.
  const rowSlots = Math.min(PAGE_SIZE, Math.max(users.length, 1));
  const fillerRows = visible.length === 0 ? 0 : rowSlots - visible.length;

  const showActions = roles.some((role) => canManageUser(actorRole, role));
  const columnCount = columns.length + (showActions ? 1 : 0);

  function openDialog(next: DialogState) {
    setDialog(next);
    setDialogOpen(true);
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setPage(0);
  }

  function clearFilters() {
    setQuery("");
    setRoleFilter("all");
    setPage(0);
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Everyone who can sign in to the platform.
          </p>
        </div>
        {canCreateUsers(actorRole) && (
          <Button
            type="button"
            className="self-start sm:self-auto"
            onClick={() => openDialog({ type: "create" })}
          >
            <UserPlusIcon />
            New user
          </Button>
        )}
      </div>

      <section
        aria-label="Users"
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Search users"
              placeholder="Search by ID, username or email"
              className="pl-9 [&::-webkit-search-cancel-button]:hidden"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as RoleFilter);
                setPage(0);
              }}
            >
              <SelectTrigger
                aria-label="Filter by role"
                className="w-full sm:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Always rendered so the toolbar doesn't shift when filters change. */}
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              className={cn(!hasFilters && "invisible")}
              aria-hidden={!hasFilters}
              tabIndex={hasFilters ? undefined : -1}
            >
              <XIcon />
              Clear
            </Button>
          </div>
        </div>

        <Table className="min-w-[760px] table-fixed">
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const active = sort.key === column.key;
                const SortIcon = !active
                  ? ArrowUpDownIcon
                  : sort.direction === "asc"
                    ? ArrowUpIcon
                    : ArrowDownIcon;
                return (
                  <TableHead
                    key={column.key}
                    className={column.className}
                    aria-sort={
                      active
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "-ml-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted focus-visible:outline-none",
                        active && "text-foreground"
                      )}
                    >
                      {column.label}
                      <SortIcon
                        aria-hidden="true"
                        className={cn("size-3.5", !active && "opacity-40")}
                      />
                    </button>
                  </TableHead>
                );
              })}
              {showActions && (
                <TableHead className="w-44 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columnCount}
                  className="text-center whitespace-normal"
                  style={{ height: rowSlots * ROW_HEIGHT }}
                >
                  <p className="font-medium">No users match your search</p>
                  <p className="mt-1 text-muted-foreground">
                    Try a different ID, username, email or role.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((user) => {
                const isYou = user.username === currentUser.username;
                return (
                  <TableRow key={user.id} style={{ height: ROW_HEIGHT }}>
                    <TableCell className="font-mono text-[13px] text-muted-foreground tabular-nums">
                      {user.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium" title={user.username}>
                          {user.username}
                        </span>
                        {isYou && <Badge variant="secondary">You</Badge>}
                      </div>
                    </TableCell>
                    <TableCell
                      className="truncate text-muted-foreground"
                      title={user.email}
                    >
                      {user.email}
                    </TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        {canManageUser(actorRole, user.role) && (
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Edit ${user.username}`}
                              onClick={() => openDialog({ type: "edit", user })}
                            >
                              <PencilIcon />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete ${user.username}`}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                openDialog({ type: "delete", user })
                              }
                            >
                              <Trash2Icon />
                              Delete
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
            {Array.from({ length: fillerRows }, (_, index) => (
              <TableRow
                key={`filler-${index}`}
                aria-hidden="true"
                className="border-0 hover:bg-transparent"
                style={{ height: ROW_HEIGHT }}
              >
                <TableCell colSpan={columnCount} />
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-sm text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {filtered.length === 0
              ? "No matching users"
              : `Showing ${pageStart + 1}–${pageStart + visible.length} of ${filtered.length} ${filtered.length === 1 ? "user" : "users"}`}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {currentPage + 1} of {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </section>

      {dialog?.type === "delete" ? (
        <DeleteUserDialog
          user={dialog.user}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      ) : dialog ? (
        <UserFormDialog
          key={dialog.type === "edit" ? dialog.user.id : "new"}
          user={dialog.type === "edit" ? dialog.user : undefined}
          roleOptions={assignableRoles(actorRole)}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      ) : null}
    </>
  );
}
