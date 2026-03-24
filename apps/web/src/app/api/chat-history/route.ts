import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  // Fetch full messages for a specific session
  if (sessionId) {
    const { rows: msgs } = await pool.query(
      `SELECT id, role, content, created_at FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return NextResponse.json({ messages: msgs });
  }

  // List recent sessions (last 60 days, most recent first)
  const { rows: sessions } = await pool.query(
    `SELECT cs.id, cs.title, cs.created_at, cs.course_id,
            c.name AS course_name, c.university, c.course_number, c.semester,
            COUNT(cm.id)::int AS message_count,
            MAX(cm.created_at) AS last_message_at
     FROM chat_sessions cs
     LEFT JOIN courses c ON c.id = cs.course_id
     LEFT JOIN chat_messages cm ON cm.session_id = cs.id
     WHERE cs.user_id = $1
       AND cs.created_at >= NOW() - INTERVAL '60 days'
     GROUP BY cs.id, cs.title, cs.created_at, cs.course_id, c.name, c.university, c.course_number, c.semester
     HAVING COUNT(cm.id) > 0
     ORDER BY last_message_at DESC NULLS LAST
     LIMIT 50`,
    [userId]
  );

  return NextResponse.json({ sessions });
}
