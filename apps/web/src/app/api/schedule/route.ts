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
    CREATE TABLE IF NOT EXISTS schedule_slots (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week        SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time         TIME NOT NULL,
      end_time           TIME NOT NULL,
      course_id          UUID REFERENCES courses(id) ON DELETE SET NULL,
      course_name        TEXT,
      course_number      TEXT,
      slot_type          TEXT NOT NULL DEFAULT 'lecture' CHECK (slot_type IN ('lecture','tutorial','lab','other')),
      room               TEXT,
      professor          TEXT,
      notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_notified_date DATE,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS schedule_slots_user_id_idx ON schedule_slots(user_id)
  `);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTable();
  const { rows } = await pool.query(
    `SELECT * FROM schedule_slots WHERE user_id = $1 ORDER BY day_of_week, start_time`,
    [session.user.id]
  );
  return NextResponse.json({ slots: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTable();
  const body = await req.json();

  const day = Number(body.day_of_week);
  if (!Number.isInteger(day) || day < 0 || day > 6)
    return NextResponse.json({ error: "Invalid day_of_week" }, { status: 400 });

  const TIME_RE = /^\d{2}:\d{2}$/;
  if (!TIME_RE.test(body.start_time) || !TIME_RE.test(body.end_time))
    return NextResponse.json({ error: "Invalid time format (HH:MM)" }, { status: 400 });

  const VALID_TYPES = new Set(["lecture", "tutorial", "lab", "other"]);
  const slot_type = VALID_TYPES.has(body.slot_type) ? body.slot_type : "lecture";

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const course_id = body.course_id && UUID_RE.test(body.course_id) ? body.course_id : null;

  const { rows } = await pool.query(
    `INSERT INTO schedule_slots
       (user_id, day_of_week, start_time, end_time, course_id, course_name, course_number, slot_type, room, professor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      session.user.id,
      day,
      body.start_time,
      body.end_time,
      course_id,
      typeof body.course_name === "string" ? body.course_name.slice(0, 200) : null,
      typeof body.course_number === "string" ? body.course_number.slice(0, 30) : null,
      slot_type,
      typeof body.room === "string" ? body.room.slice(0, 100) : null,
      typeof body.professor === "string" ? body.professor.slice(0, 150) : null,
    ]
  );
  return NextResponse.json({ slot: rows[0] });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await pool.query(
    `DELETE FROM schedule_slots WHERE id = $1 AND user_id = $2`,
    [id, session.user.id]
  );
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  if (typeof body.notifications_enabled === "boolean") {
    await pool.query(
      `UPDATE schedule_slots SET notifications_enabled = $1 WHERE id = $2 AND user_id = $3`,
      [body.notifications_enabled, id, session.user.id]
    );
  }
  return NextResponse.json({ ok: true });
}
