import { NextResponse } from "next/server";
import { Pool } from "pg";
import { sendPostLectureEmail } from "@/lib/email";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

// Vercel cron calls this route every minute.
// We find schedule_slots that ended 25-35 min ago in Israel time,
// haven't been notified today, and have notifications enabled.
// Then send a post-lecture check-in email.
export async function GET(req: Request) {
  // Verify this request came from Vercel Cron (or has the secret)
  const auth = req.headers ? (req as any).headers.get("authorization") : null;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure table exists (no-op if already created)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_slots (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day_of_week           SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time            TIME NOT NULL,
        end_time              TIME NOT NULL,
        course_id             UUID REFERENCES courses(id) ON DELETE SET NULL,
        course_name           TEXT,
        course_number         TEXT,
        slot_type             TEXT NOT NULL DEFAULT 'lecture',
        room                  TEXT,
        professor             TEXT,
        notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        last_notified_date    DATE,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(() => {});

    // Current Israel time
    // DOW mapping: Israel uses Sun=0 Mon=1 ... Sat=6
    // PostgreSQL DOW: 0=Sunday
    const { rows: timeRows } = await pool.query(`
      SELECT
        EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Jerusalem')::int AS dow,
        TO_CHAR(NOW() AT TIME ZONE 'Asia/Jerusalem', 'HH24:MI') AS now_time,
        (NOW() AT TIME ZONE 'Asia/Jerusalem' - INTERVAL '30 minutes')::time AS target_end_time_low,
        (NOW() AT TIME ZONE 'Asia/Jerusalem' - INTERVAL '25 minutes')::time AS target_end_time_high,
        CURRENT_DATE AT TIME ZONE 'Asia/Jerusalem' AS today
    `);
    if (!timeRows[0]) return NextResponse.json({ ok: true, notified: 0 });

    const { dow, target_end_time_low, target_end_time_high, today } = timeRows[0];

    // Find slots ending ~30 min ago, notifications enabled, not yet notified today
    const { rows: slots } = await pool.query(`
      SELECT ss.id, ss.user_id, ss.course_name, ss.slot_type, ss.end_time,
             u.email, u.name
      FROM schedule_slots ss
      JOIN users u ON u.id = ss.user_id
      WHERE ss.day_of_week = $1
        AND ss.end_time BETWEEN $2 AND $3
        AND ss.notifications_enabled = TRUE
        AND (ss.last_notified_date IS NULL OR ss.last_notified_date < $4)
        AND u.email IS NOT NULL
        AND u.email_verified = TRUE
      LIMIT 50
    `, [dow, target_end_time_low, target_end_time_high, today]);

    let notified = 0;
    for (const slot of slots) {
      await sendPostLectureEmail(
        slot.email,
        slot.name,
        slot.course_name ?? "your course",
        slot.slot_type ?? "lecture"
      );
      await pool.query(
        `UPDATE schedule_slots SET last_notified_date = $1 WHERE id = $2`,
        [today, slot.id]
      );
      notified++;
    }

    return NextResponse.json({ ok: true, notified });
  } catch (err) {
    console.error("[cron/post-lecture] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
