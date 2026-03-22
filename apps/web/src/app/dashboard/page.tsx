import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import ChatWindow from "@/components/chat/ChatWindow";
import CoursesStrip from "./CoursesStrip";
import OpenUploadButton from "@/components/ui/OpenUploadButton";
import CalendarButton from "@/components/ui/CalendarButton";
import CalcButton from "@/components/ui/CalcButton";
import TimerButton from "@/components/ui/TimerButton";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});


export default async function DashboardPage({ searchParams }: { searchParams: { semester?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;
  const semester = (searchParams.semester ?? "a").toLowerCase();
  const validSemesters = new Set(["a", "b", "s"]);
  const safeSemester = validSemesters.has(semester) ? semester : "a";

  const [coursesRes, usageRes, planRes, fcRes, notesRes, userRes] = await Promise.all([
    pool.query("SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [uid]),
    pool.query("SELECT SUM(tokens_input) AS tokens_input, SUM(tokens_output) AS tokens_output FROM usage WHERE user_id = $1 AND date >= DATE_TRUNC('month', CURRENT_DATE)", [uid]),
    pool.query("SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active'", [uid]),
    pool.query("SELECT COUNT(*) as c FROM flashcards WHERE user_id = $1 AND next_review_at <= NOW()", [uid]).catch(() => ({ rows: [{ c: "0" }] })),
    pool.query("SELECT COUNT(*) as c FROM course_notes WHERE user_id = $1", [uid]).catch(() => ({ rows: [{ c: "0" }] })),
    pool.query("SELECT onboarding_done, email_verified FROM users WHERE id = $1", [uid]).catch(() => ({ rows: [{ onboarding_done: true, email_verified: true }] })),
  ]);

  // Get or create a general chat session per semester (so each semester has its own memory)
  let generalSessionId: string | undefined;
  let generalMessages: { id: string; role: string; content: string }[] = [];
  try {
    const { rows: sessionRows } = await pool.query(
      `SELECT id FROM chat_sessions
       WHERE user_id = $1 AND course_id IS NULL AND title = $2
       ORDER BY created_at DESC LIMIT 1`,
      [uid, `general_${safeSemester}`]
    );
    if (sessionRows.length > 0) {
      generalSessionId = sessionRows[0].id;
    } else {
      const { rows: newSession } = await pool.query(
        `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id`,
        [uid, `general_${safeSemester}`]
      );
      generalSessionId = newSession[0].id;
    }
    if (generalSessionId) {
      const { rows: msgs } = await pool.query(
        `SELECT id, role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
        [generalSessionId]
      );
      generalMessages = msgs;
    }
  } catch { /* non-fatal — chat still works without session */ }

  if (!userRes.rows[0]?.email_verified) redirect("/verify-email");
  if (!userRes.rows[0]?.onboarding_done) redirect("/onboarding");

  const courses       = coursesRes.rows;
  const monthTokens   = (Number(usageRes.rows[0]?.tokens_input) || 0) + (Number(usageRes.rows[0]?.tokens_output) || 0);
  const userPlan      = planRes.rows[0]?.plan ?? "free";
  const MONTHLY_LIMITS: Record<string, number> = { free: 600_000, pro: 4_000_000, max: 10_000_000 };
  const tokenLimit    = MONTHLY_LIMITS[userPlan] ?? MONTHLY_LIMITS.free;
  const fcDue        = parseInt(fcRes.rows[0]?.c ?? "0", 10);
  const notesCount = parseInt(notesRes.rows[0]?.c ?? "0", 10);
  const firstName  = (session.user.name ?? "").split(" ")[0] || "there";

  const nextExam = courses
    .filter((c: any) => c.exam_date)
    .map((c: any) => ({ name: c.name, days: Math.ceil((new Date(c.exam_date).getTime() - Date.now()) / 86400000) }))
    .filter((c: any) => c.days >= 0)
    .sort((a: any, b: any) => a.days - b.days)[0] ?? null;

  return (
    <AppShell courses={courses} flashcardsDue={fcDue} userPlan={userPlan as "free" | "pro" | "max"}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        {/* ── Top bar ── */}
        <div style={{
          flexShrink: 0, padding: "14px 24px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(135deg, rgba(79,142,247,0.05) 0%, rgba(167,139,250,0.03) 60%, transparent 100%)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                Hey, {firstName} 👋
              </div>
              {nextExam ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Next exam:{" "}
                  <span style={{
                    color: nextExam.days <= 7 ? "#f87171" : nextExam.days <= 14 ? "#fbbf24" : "#34d399",
                    fontWeight: 600,
                  }}>
                    {nextExam.name}
                  </span>{" "}
                  in {nextExam.days}d
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {courses.length === 0 ? "Add your first course to get started" : `${courses.length} course${courses.length !== 1 ? "s" : ""} enrolled`}
                </div>
              )}
            </div>

            {/* Inline stats pills */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {fcDue > 0 && (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "99px", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}>
                  {fcDue} cards due
                </span>
              )}
              {notesCount > 0 && (
                <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>
                  {notesCount} notes
                </span>
              )}
              {monthTokens / tokenLimit >= 0.6 && (
                <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <span style={{ width: "60px", height: "4px", borderRadius: "99px", background: "var(--border)", overflow: "hidden", display: "inline-block" }}>
                    <span style={{ display: "block", height: "100%", borderRadius: "99px", width: `${Math.min(100, Math.round(monthTokens / tokenLimit * 100))}%`, background: monthTokens / tokenLimit > 0.85 ? "#f87171" : "#fbbf24", transition: "width 0.4s" }} />
                  </span>
                  {Math.round(monthTokens / tokenLimit * 100)}% this month
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TimerButton />
            <CalcButton />
            <CalendarButton />
            <OpenUploadButton />
          </div>
        </div>

        {/* ── Main body: courses strip + chat ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Courses horizontal strip — only if courses exist */}
          {courses.length > 0 && <CoursesStrip courses={courses} />}

          {/* Chat — takes all remaining space */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <ChatWindow
              hasCourses={courses.length > 0}
              userPlan={userPlan}
              initialUsedTokens={monthTokens}
              tokenLimit={tokenLimit}
              sessionId={generalSessionId}
              initialMessages={generalMessages as any}
            />
          </div>
        </div>

      </div>
    </AppShell>
  );
}

