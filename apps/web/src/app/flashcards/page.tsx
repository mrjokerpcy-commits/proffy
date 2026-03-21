import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import FlashcardsClient from "./FlashcardsClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export default async function FlashcardsPage({ searchParams }: { searchParams: { courseId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { rows: courses } = await pool.query(
    "SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC",
    [session.user.id]
  );

  const courseId = searchParams.courseId ?? courses[0]?.id ?? null;

  let dueCards: { id: string; front: string; back: string; review_count: number }[] = [];
  let activeCourse = courses.find((c: any) => c.id === courseId) ?? null;

  if (courseId) {
    try {
      const { rows } = await pool.query(
        `SELECT id, front, back, review_count FROM flashcards
         WHERE user_id = $1 AND course_id = $2 AND next_review_at <= NOW()
         ORDER BY next_review_at ASC LIMIT 30`,
        [session.user.id, courseId]
      );
      dueCards = rows;
    } catch {
      // table may not exist yet
    }
  }

  // Total cards counts per course for summary
  let totalCounts: Record<string, number> = {};
  try {
    const { rows: countRows } = await pool.query(
      `SELECT course_id, COUNT(*) as total FROM flashcards WHERE user_id = $1 GROUP BY course_id`,
      [session.user.id]
    );
    for (const r of countRows) totalCounts[r.course_id] = parseInt(r.total, 10);
  } catch { /* ok */ }

  return (
    <AppShell courses={courses} activeCourse={activeCourse ?? undefined}>
      <FlashcardsClient
        courses={courses}
        initialCards={dueCards}
        courseId={courseId}
        totalCounts={totalCounts}
      />
    </AppShell>
  );
}
