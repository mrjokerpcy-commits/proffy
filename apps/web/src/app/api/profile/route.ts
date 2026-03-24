import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const ALLOWED_GOALS          = new Set(["pass", "good", "excellent"]);
const ALLOWED_UNIVERSITIES   = new Set(["TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Ariel", "Other"]);
const ALLOWED_LEARNING_STYLE = new Set(["visual", "practice", "reading", "mixed"]);

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const SEMESTER_RE = /^20\d{2}[abs]$/i;
  const display_name       = typeof body.name       === "string" ? body.name.replace(/[<>]/g, "").slice(0, 80) : null;
  const university         = typeof body.university  === "string" && ALLOWED_UNIVERSITIES.has(body.university) ? body.university : null;
  const field_of_study     = typeof body.field       === "string" ? body.field.slice(0, 100)    : null;
  const study_challenge    = typeof body.challenge   === "string" ? body.challenge.slice(0, 200) : null;
  const hours_per_week     = typeof body.hours       === "string" ? parseInt(body.hours, 10) || null : null;
  const study_goal         = typeof body.goal        === "string" && ALLOWED_GOALS.has(body.goal) ? body.goal : null;
  const learning_style     = typeof body.learningStyle === "string" && ALLOWED_LEARNING_STYLE.has(body.learningStyle) ? body.learningStyle : null;
  const current_semester   = typeof body.semester    === "string" && SEMESTER_RE.test(body.semester) ? body.semester : null;

  await pool.query(
    `UPDATE users SET
       name             = COALESCE($1, name),
       university       = COALESCE($2, university),
       field_of_study   = COALESCE($3, field_of_study),
       study_challenge  = COALESCE($4, study_challenge),
       hours_per_week   = COALESCE($5, hours_per_week),
       study_goal       = COALESCE($6, study_goal),
       learning_style   = COALESCE($7, learning_style),
       current_semester = COALESCE($8, current_semester),
       onboarding_done  = true,
       updated_at       = now()
     WHERE id = $9`,
    [display_name, university, field_of_study, study_challenge, hours_per_week, study_goal, learning_style, current_semester, session.user.id]
  );

  return NextResponse.json({ ok: true });
}
