import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import UploadClient from "./UploadClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export default async function UploadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { rows: courses } = await pool.query(
    "SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC",
    [session.user.id]
  );

  let totalFlashcardsDue = 0;
  try {
    const { rows: fcRows } = await pool.query(
      "SELECT COUNT(*) as count FROM flashcards WHERE user_id = $1 AND next_review_at <= NOW()",
      [session.user.id]
    );
    totalFlashcardsDue = parseInt(fcRows[0]?.count ?? "0", 10);
  } catch { /* ok */ }

  return (
    <AppShell courses={courses} flashcardsDue={totalFlashcardsDue}>
      <UploadClient courses={courses} />
    </AppShell>
  );
}
