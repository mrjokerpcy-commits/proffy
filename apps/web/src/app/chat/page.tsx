import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import ChatWindow from "@/components/chat/ChatWindow";
import CoursesStrip from "../dashboard/CoursesStrip";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export default async function ChatPage({ searchParams }: { searchParams: { semester?: string; new?: string; courseId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;
  const semester = (searchParams.semester ?? "a").toLowerCase();
  const validSemesters = new Set(["a", "b", "s"]);
  const safeSemester = validSemesters.has(semester) ? semester : "a";

  const [coursesRes, usageRes, planRes, fcRes, userRes, courseRes] = await Promise.all([
    pool.query("SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [uid]),
    pool.query("SELECT SUM(tokens_input) AS tokens_input, SUM(tokens_output) AS tokens_output FROM usage WHERE user_id = $1 AND date >= DATE_TRUNC('month', CURRENT_DATE)", [uid]),
    pool.query("SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active'", [uid]),
    pool.query("SELECT COUNT(*) as c FROM flashcards WHERE user_id = $1 AND next_review_at <= NOW()", [uid]).catch(() => ({ rows: [{ c: "0" }] })),
    pool.query("SELECT onboarding_done, email_verified FROM users WHERE id = $1", [uid]).catch(() => ({ rows: [{ onboarding_done: true, email_verified: true }] })),
    searchParams.courseId
      ? pool.query("SELECT * FROM courses WHERE id = $1 AND user_id = $2", [searchParams.courseId, uid]).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
  ]);

  if (!userRes.rows[0]?.email_verified) redirect("/verify-email");
  if (!userRes.rows[0]?.onboarding_done) redirect("/onboarding");

  const isNewChat = !!searchParams.new;
  const activeCourse = courseRes.rows[0] ?? null;

  let sessionId: string | undefined;
  let initialMessages: { id: string; role: string; content: string }[] = [];

  try {
    const sessionTitle = activeCourse ? null : `general_${safeSemester}`;
    const courseId = activeCourse?.id ?? null;

    if (isNewChat) {
      const { rows } = await pool.query(
        `INSERT INTO chat_sessions (user_id, course_id, title) VALUES ($1, $2, $3) RETURNING id`,
        [uid, courseId, sessionTitle]
      );
      sessionId = rows[0].id;
    } else {
      const { rows } = courseId
        ? await pool.query(
            `SELECT id FROM chat_sessions WHERE user_id = $1 AND course_id = $2 ORDER BY created_at DESC LIMIT 1`,
            [uid, courseId]
          )
        : await pool.query(
            `SELECT id FROM chat_sessions WHERE user_id = $1 AND course_id IS NULL AND title = $2 ORDER BY created_at DESC LIMIT 1`,
            [uid, sessionTitle]
          );

      if (rows.length > 0) {
        sessionId = rows[0].id;
      } else {
        const { rows: newRows } = await pool.query(
          `INSERT INTO chat_sessions (user_id, course_id, title) VALUES ($1, $2, $3) RETURNING id`,
          [uid, courseId, sessionTitle]
        );
        sessionId = newRows[0].id;
      }

      if (sessionId) {
        const { rows: msgs } = await pool.query(
          `SELECT id, role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
          [sessionId]
        );
        initialMessages = msgs;
      }
    }
  } catch { /* non-fatal */ }

  const courses = coursesRes.rows;
  const monthTokens = (Number(usageRes.rows[0]?.tokens_input) || 0) + (Number(usageRes.rows[0]?.tokens_output) || 0);
  const userPlan = planRes.rows[0]?.plan ?? "free";
  const MONTHLY_LIMITS: Record<string, number> = { free: 600_000, pro: 4_000_000, max: 10_000_000 };
  const tokenLimit = MONTHLY_LIMITS[userPlan] ?? MONTHLY_LIMITS.free;
  const fcDue = parseInt(fcRes.rows[0]?.c ?? "0", 10);

  return (
    <AppShell courses={courses} flashcardsDue={fcDue} userPlan={userPlan as "free" | "pro" | "max"}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {courses.length > 0 && <CoursesStrip courses={courses} />}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ChatWindow
            key={sessionId}
            course={activeCourse ?? undefined}
            hasCourses={courses.length > 0}
            userPlan={userPlan}
            initialUsedTokens={monthTokens}
            tokenLimit={tokenLimit}
            sessionId={sessionId}
            initialMessages={initialMessages as any}
          />
        </div>
      </div>
    </AppShell>
  );
}
