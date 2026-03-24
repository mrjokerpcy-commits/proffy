import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, action } = await req.json();
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  if (action === "cancel") {
    // Reset back to pending so it gets re-processed
    await pool.query(
      `UPDATE material_queue SET status = 'pending', log = '', error_msg = NULL, processed_at = NULL WHERE id = $1`,
      [id]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    await pool.query(`DELETE FROM material_queue WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
