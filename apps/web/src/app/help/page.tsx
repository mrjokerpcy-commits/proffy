import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import HelpClient from "./HelpClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export default async function HelpPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { rows: courses } = await pool.query(
    "SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC",
    [session.user.id]
  );

  return (
    <AppShell courses={courses}>
      <HelpClient />
    </AppShell>
  );
}
