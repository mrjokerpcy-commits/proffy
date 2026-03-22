import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import GroupsClient from "./GroupsClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;
  const [coursesRes, planRes, fcRes] = await Promise.all([
    pool.query("SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [uid]),
    pool.query("SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active'", [uid]),
    pool.query("SELECT COUNT(*) as c FROM flashcards WHERE user_id = $1 AND next_review_at <= NOW()", [uid]).catch(() => ({ rows: [{ c: "0" }] })),
  ]);

  return (
    <AppShell
      courses={coursesRes.rows}
      flashcardsDue={Number(fcRes.rows[0]?.c ?? 0)}
      userPlan={planRes.rows[0]?.plan ?? "free"}
    >
      <GroupsClient />
    </AppShell>
  );
}
