import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Pool } from "pg";
import NewCourseClient from "./NewCourseClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export default async function NewCoursePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [{ rows: courses }, { rows: userRows }] = await Promise.all([
    pool.query("SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [session.user.id]),
    pool.query("SELECT university FROM users WHERE id = $1", [session.user.id]),
  ]);

  const userUniversity: string = userRows[0]?.university ?? "";

  return (
    <AppShell courses={courses}>
      <NewCourseClient userUniversity={userUniversity} />
    </AppShell>
  );
}
