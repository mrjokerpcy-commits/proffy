import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import NotesClient from "./NotesClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export default async function NotesPage({ searchParams }: { searchParams: { courseId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { rows: courses } = await pool.query(
    "SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC",
    [session.user.id]
  );

  const courseId = searchParams.courseId ?? courses[0]?.id ?? null;
  const activeCourse = courses.find((c: any) => c.id === courseId) ?? null;

  let notes: any[] = [];
  if (courseId) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM course_notes WHERE course_id = $1 AND user_id = $2 ORDER BY created_at DESC",
        [courseId, session.user.id]
      );
      notes = rows;
    } catch { /* table may not exist yet */ }
  }

  let totalFlashcardsDue = 0;
  try {
    const { rows: fcRows } = await pool.query(
      "SELECT COUNT(*) as count FROM flashcards WHERE user_id = $1 AND next_review_at <= NOW()",
      [session.user.id]
    );
    totalFlashcardsDue = parseInt(fcRows[0]?.count ?? "0", 10);
  } catch { /* ok */ }

  return (
    <AppShell courses={courses} activeCourse={activeCourse ?? undefined} flashcardsDue={totalFlashcardsDue}>
      <NotesClient courses={courses} initialNotes={notes} courseId={courseId} />
    </AppShell>
  );
}
