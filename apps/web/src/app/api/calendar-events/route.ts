import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const VALID_TYPES = new Set(["goal", "task", "note", "reminder"]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });
  const { rows } = await pool.query(
    `SELECT id, date::text, title, type, done FROM calendar_events WHERE user_id=$1 AND date>=$2::date AND date<=$3::date ORDER BY date ASC, created_at ASC`,
    [session.user.id, from, to]
  ).catch(() => ({ rows: [] as any[] }));
  return NextResponse.json({ events: rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { date?: string; title?: string; type?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const { date, title, type = "task" } = body;
  if (!date || !title?.trim()) return NextResponse.json({ error: "date and title required" }, { status: 400 });
  if (!VALID_TYPES.has(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  const { rows } = await pool.query(
    `INSERT INTO calendar_events (user_id, date, title, type) VALUES ($1, $2::date, $3, $4) RETURNING id, date::text, title, type, done`,
    [session.user.id, date, title.trim(), type]
  );
  return NextResponse.json({ event: rows[0] }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  let body: { done?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const { rows } = await pool.query(
    `UPDATE calendar_events SET done=$1 WHERE id=$2 AND user_id=$3 RETURNING id, date::text, title, type, done`,
    [body.done ?? false, id, session.user.id]
  );
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event: rows[0] });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await pool.query(`DELETE FROM calendar_events WHERE id=$1 AND user_id=$2`, [id, session.user.id]);
  return NextResponse.json({ ok: true });
}
