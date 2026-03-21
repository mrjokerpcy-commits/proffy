import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import SettingsClient from "./SettingsClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;

  const [coursesRes, userRes, planRes] = await Promise.all([
    pool.query("SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [uid]),
    pool.query("SELECT name, email, university, learning_style FROM users WHERE id = $1", [uid]),
    pool.query(
      "SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
      [uid]
    ).catch(() => ({ rows: [] })),
  ]);

  const courses = coursesRes.rows;
  const dbUser = userRes.rows[0] ?? {};
  const plan = (planRes.rows[0]?.plan ?? "free") as "free" | "pro" | "max";

  const user = {
    name: dbUser.name ?? session.user.name ?? null,
    email: dbUser.email ?? session.user.email ?? null,
    university: dbUser.university ?? null,
    learning_style: dbUser.learning_style ?? null,
    plan,
  };

  return (
    <AppShell courses={courses}>
      <SettingsClient user={user} />
    </AppShell>
  );
}
