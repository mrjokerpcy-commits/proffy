import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import ChatWindow from "@/components/chat/ChatWindow";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

export default async function CoursePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [{ rows: courses }, { rows: courseRows }, { rows: planRows }] = await Promise.all([
    pool.query("SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [session.user.id]),
    pool.query("SELECT * FROM courses WHERE id = $1 AND user_id = $2", [params.id, session.user.id]),
    pool.query("SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1", [session.user.id]).catch(() => ({ rows: [] })),
  ]);
  const userPlan = (planRows[0]?.plan ?? "free") as "free" | "pro" | "max";

  if (!courseRows[0]) notFound();
  const course = courseRows[0];

  // Get or create chat session
  const { rows: sessionRows } = await pool.query(
    "SELECT id FROM chat_sessions WHERE user_id = $1 AND course_id = $2 ORDER BY created_at DESC LIMIT 1",
    [session.user.id, course.id]
  );

  let chatSessionId: string;
  if (sessionRows.length > 0) {
    chatSessionId = sessionRows[0].id;
  } else {
    const { rows: newSession } = await pool.query(
      "INSERT INTO chat_sessions (user_id, course_id, title) VALUES ($1, $2, $3) RETURNING id",
      [session.user.id, course.id, `${course.name} session`]
    );
    chatSessionId = newSession[0].id;
  }

  // Load message history
  const { rows: messages } = await pool.query(
    "SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
    [chatSessionId]
  );

  // Flashcards due today for this course
  let flashcardsDue = 0;
  try {
    const { rows: fcRows } = await pool.query(
      `SELECT COUNT(*) as count FROM flashcards
       WHERE course_id = $1 AND user_id = $2
       AND next_review_at <= NOW()`,
      [course.id, session.user.id]
    );
    flashcardsDue = parseInt(fcRows[0]?.count ?? "0", 10);
  } catch {
    // flashcards table may not exist yet — safe to ignore
  }

  // Professor patterns for this course
  let professorPatterns: { topic: string; pct: number }[] = [];
  try {
    const { rows: ppRows } = await pool.query(
      `SELECT topic, pct FROM professor_patterns
       WHERE course_id = $1 AND user_id = $2
       ORDER BY pct DESC LIMIT 6`,
      [course.id, session.user.id]
    );
    professorPatterns = ppRows;
  } catch {
    // professor_patterns table may not exist yet — safe to ignore
  }

  // AI-tracked student insights for this course
  let studentInsights: { topic: string; status: string; note: string }[] = [];
  try {
    const { rows: siRows } = await pool.query(
      `SELECT topic, status, note FROM student_insights
       WHERE course_id = $1 AND user_id = $2
       ORDER BY updated_at DESC LIMIT 10`,
      [course.id, session.user.id]
    );
    studentInsights = siRows;
  } catch {
    // student_insights table may not exist yet — safe to ignore
  }

  const initialMessages = messages.map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    sources: m.sources,
  }));

  return (
    <AppShell courses={courses} activeCourse={course} flashcardsDue={flashcardsDue} professorPatterns={professorPatterns} studentInsights={studentInsights} userPlan={userPlan}>
      <ChatWindow
        course={course}
        sessionId={chatSessionId}
        initialMessages={initialMessages}
        userPlan={userPlan}
      />
    </AppShell>
  );
}
