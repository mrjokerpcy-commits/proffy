import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       DATE NOT NULL,
      title      TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('goal','task','note','reminder')),
      done       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(
    `CREATE INDEX IF NOT EXISTS cal_events_user_date ON calendar_events(user_id, date)`
  ).catch(() => {});
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to   = searchParams.get("to");   // YYYY-MM-DD

  const { rows } = await pool.query(
    `SELECT * FROM calendar_events
     WHERE user_id = $1
       AND ($2::date IS NULL OR date >= $2::date)
       AND ($3::date IS NULL OR date <= $3::date)
     ORDER BY date, created_at`,
    [session.user.id, from || null, to || null]
  );
  return NextResponse.json({ events: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();

  const body = await req.json();
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!body.date || !DATE_RE.test(body.date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  if (!body.title || typeof body.title !== "string") return NextResponse.json({ error: "title required" }, { status: 400 });

  const VALID_TYPES = new Set(["goal", "task", "note", "reminder"]);
  const type = VALID_TYPES.has(body.type) ? body.type : "task";

  const { rows } = await pool.query(
    `INSERT INTO calendar_events (user_id, date, title, type) VALUES ($1, $2, $3, $4) RETURNING *`,
    [session.user.id, body.date, body.title.slice(0, 300), type]
  );
  return NextResponse.json({ event: rows[0] });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  if (typeof body.done === "boolean") {
    await pool.query(
      `UPDATE calendar_events SET done = $1 WHERE id = $2 AND user_id = $3`,
      [body.done, id, session.user.id]
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await pool.query(
    `DELETE FROM calendar_events WHERE id = $1 AND user_id = $2`,
    [id, session.user.id]
  );
  return NextResponse.json({ ok: true });
}
