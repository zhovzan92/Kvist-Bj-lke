export const roles = ["User", "Superuser", "Admin"] as const;

export type Role = (typeof roles)[number];

export type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type SessionUser = {
  name: string;
  username: string;
  role: Role;
};

// Sample data until the API and login exist. Change `currentUser.role`
// to preview the page as a User or Superuser.
export const currentUser: SessionUser = {
  name: "Mette Kristensen",
  username: "mette.kristensen",
  role: "Admin",
};

export const sampleUsers: User[] = [
  { id: 1, username: "mette.kristensen", email: "mette.kristensen@example.com", role: "Admin", createdAt: "2025-03-03" },
  { id: 2, username: "jonas.holm", email: "jonas.holm@example.com", role: "Admin", createdAt: "2025-03-12" },
  { id: 3, username: "sofie.lund", email: "sofie.lund@example.com", role: "Superuser", createdAt: "2025-04-02" },
  { id: 4, username: "anders.nielsen", email: "anders.nielsen@example.com", role: "Superuser", createdAt: "2025-05-19" },
  { id: 5, username: "freja.madsen", email: "freja.madsen@example.com", role: "User", createdAt: "2025-06-07" },
  { id: 6, username: "ida.pedersen", email: "ida.pedersen@example.com", role: "User", createdAt: "2025-08-11" },
  { id: 7, username: "lars.thomsen", email: "lars.thomsen@example.com", role: "User", createdAt: "2025-09-23" },
  { id: 8, username: "mikkel.jensen", email: "mikkel.jensen@example.com", role: "User", createdAt: "2025-11-04" },
  { id: 9, username: "emma.larsen", email: "emma.larsen@example.com", role: "User", createdAt: "2026-01-15" },
  { id: 10, username: "noah.sorensen", email: "noah.sorensen@example.com", role: "User", createdAt: "2026-02-02" },
  { id: 11, username: "clara.rasmussen", email: "clara.rasmussen@example.com", role: "User", createdAt: "2026-03-28" },
  { id: 12, username: "oscar.andersen", email: "oscar.andersen@example.com", role: "User", createdAt: "2026-05-09" },
  { id: 13, username: "alma.christensen", email: "alma.christensen@example.com", role: "User", createdAt: "2026-07-21" },
  { id: 14, username: "viktor.poulsen", email: "viktor.poulsen@example.com", role: "User", createdAt: "2026-10-24" },
];

// These checks only decide which buttons to show. The server must check
// the same rules on every request.
export function canCreateUsers(actor: Role) {
  return actor === "Admin" || actor === "Superuser";
}

export function canManageUser(actor: Role, target: Role) {
  if (actor === "Admin") return true;
  if (actor === "Superuser") return target === "User";
  return false;
}

export function assignableRoles(actor: Role): Role[] {
  if (actor === "Admin") return [...roles];
  if (actor === "Superuser") return ["User"];
  return [];
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10-26" -> "26 Oct 2026"
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}
