import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Pool } from "pg";
import NewCourseClient from "./NewCourseClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export default async function NewCoursePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { rows: courses } = await pool.query(
    "SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC",
    [session.user.id]
  );

  return (
    <AppShell courses={courses}>
      <NewCourseClient />
    </AppShell>
  );
}
