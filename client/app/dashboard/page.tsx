import type { Metadata } from "next";

import { RequireSession } from "./require-session";
import { UsersTable } from "./users-table";

export const metadata: Metadata = {
  title: "Users · Kvist & Bjælke",
};

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <RequireSession>
        <UsersTable />
      </RequireSession>
    </main>
  );
}
