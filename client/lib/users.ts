// Role values as the API sends them.
export const roles = ["User", "SuperUser", "Admin"] as const;

export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  User: "User",
  SuperUser: "Superuser",
  Admin: "Admin",
};

// The same limits the API enforces. Shown in forms so people see them before submitting.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export type User = {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
};

export function toRole(value: string | undefined): Role {
  return roles.find((role) => role === value) ?? "User";
}

// These checks only decide which buttons to show. The API checks the same
// rules on every request.
export function canCreateUsers(actor: Role) {
  return actor === "Admin" || actor === "SuperUser";
}

export function canManageUser(actor: Role, target: Role) {
  if (actor === "Admin") return true;
  if (actor === "SuperUser") return target === "User";
  return false;
}

// Which accounts each role can see. The API applies the same rule to every request.
export function visibleRoles(actor: Role): Role[] {
  return actor === "Admin" ? [...roles] : ["User"];
}

export function assignableRoles(actor: Role): Role[] {
  if (actor === "Admin") return [...roles];
  if (actor === "SuperUser") return ["User"];
  return [];
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10-26T09:14:00Z" -> "26 Oct 2026"
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${day} ${months[month - 1]} ${year}`;
}
