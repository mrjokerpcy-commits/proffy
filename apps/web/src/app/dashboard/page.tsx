import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import DashboardClient from "./DashboardClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;

  const [coursesRes, usageRes, planRes, fcRes, notesRes, userRes, courseStatsRes, recentRes] = await Promise.all([
    pool.query("SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [uid]),
    pool.query("SELECT SUM(tokens_input) AS tokens_input, SUM(tokens_output) AS tokens_output FROM usage WHERE user_id = $1 AND date >= DATE_TRUNC('month', CURRENT_DATE)", [uid]),
    pool.query("SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active'", [uid]),
    pool.query("SELECT COUNT(*) as c FROM flashcards WHERE user_id = $1 AND next_review_at <= NOW()", [uid]).catch(() => ({ rows: [{ c: "0" }] })),
    pool.query("SELECT COUNT(*) as c FROM course_notes WHERE user_id = $1", [uid]).catch(() => ({ rows: [{ c: "0" }] })),
    pool.query("SELECT onboarding_done, email_verified FROM users WHERE id = $1", [uid]).catch(() => ({ rows: [{ onboarding_done: true, email_verified: true }] })),
    // Per-course: materials + message counts
    pool.query(`
      SELECT
        c.id, c.name, c.professor, c.exam_date, c.number,
        COALESCE(m.cnt, 0)::int AS material_count,
        COALESCE(msg.cnt, 0)::int AS message_count,
        msg.last_chat
      FROM courses c
      LEFT JOIN (
        SELECT course_id, COUNT(*) AS cnt FROM materials GROUP BY course_id
      ) m ON m.course_id = c.id
      LEFT JOIN (
        SELECT cs.course_id, COUNT(cm.id) AS cnt, MAX(cm.created_at) AS last_chat
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cm.session_id = cs.id
        WHERE cs.user_id = $1
        GROUP BY cs.course_id
      ) msg ON msg.course_id = c.id
      WHERE c.user_id = $1
      ORDER BY msg.last_chat DESC NULLS LAST
    `, [uid]).catch(() => ({ rows: [] })),
    // Recent chat sessions (last 5)
    pool.query(`
      SELECT cs.id, cs.course_id, cs.created_at, c.name AS course_name,
        COUNT(cm.id)::int AS message_count
      FROM chat_sessions cs
      LEFT JOIN courses c ON c.id = cs.course_id
      LEFT JOIN chat_messages cm ON cm.session_id = cs.id
      WHERE cs.user_id = $1
      GROUP BY cs.id, c.name, c.color
      ORDER BY cs.created_at DESC
      LIMIT 5
    `, [uid]).catch(() => ({ rows: [] })),
  ]);

  if (!userRes.rows[0]?.email_verified) redirect("/verify-email");
  if (!userRes.rows[0]?.onboarding_done) redirect("/onboarding");

  const courses = coursesRes.rows;
  const monthTokens = (Number(usageRes.rows[0]?.tokens_input) || 0) + (Number(usageRes.rows[0]?.tokens_output) || 0);
  const userPlan = planRes.rows[0]?.plan ?? "free";
  const MONTHLY_LIMITS: Record<string, number> = { free: 600_000, pro: 4_000_000, max: 10_000_000 };
  const tokenLimit = MONTHLY_LIMITS[userPlan] ?? MONTHLY_LIMITS.free;
  const fcDue = parseInt(fcRes.rows[0]?.c ?? "0", 10);
  const notesCount = parseInt(notesRes.rows[0]?.c ?? "0", 10);
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";
  const courseStats = courseStatsRes.rows;
  const recentSessions = recentRes.rows;

  const nextExam = courses
    .filter((c: any) => c.exam_date)
    .map((c: any) => ({ name: c.name, days: Math.ceil((new Date(c.exam_date).getTime() - Date.now()) / 86400000) }))
    .filter((c: any) => c.days >= 0)
    .sort((a: any, b: any) => a.days - b.days)[0] ?? null;

  return (
    <AppShell courses={courses} flashcardsDue={fcDue} userPlan={userPlan as "free" | "pro" | "max"}>
      <DashboardClient
        firstName={firstName}
        courses={courses}
        courseStats={courseStats}
        recentSessions={recentSessions}
        monthTokens={monthTokens}
        tokenLimit={tokenLimit}
        userPlan={userPlan}
        fcDue={fcDue}
        notesCount={notesCount}
        nextExam={nextExam}
      />
    </AppShell>
  );
}
