import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const ALLOWED_UNIVERSITIES = new Set([
  "TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Ariel", "Other",
]);
const ALLOWED_LEVELS = new Set(["beginner", "some", "strong"]);
const ALLOWED_GOALS  = new Set(["pass", "good", "excellent"]);
const SEMESTER_RE    = /^20\d{2}[abs]$/i; // e.g. 2025a, 2025b, 2025s
const DATE_RE        = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return v.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, max);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await pool.query(
    "SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC",
    [session.user.id]
  );
  return NextResponse.json({ courses: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const name = str(b.name, 200);
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const university = str(b.university, 100);
  if (!university || !ALLOWED_UNIVERSITIES.has(university)) {
    return NextResponse.json({ error: "Invalid university" }, { status: 400 });
  }

  // Optional validated fields
  const name_hebrew   = str(b.name_hebrew, 200);
  const department    = str(b.department, 200);
  const professor     = str(b.professor, 150);
  const course_number = str(b.course_number, 30);
  const semester      = typeof b.semester === "string" && SEMESTER_RE.test(b.semester) ? b.semester : null;
  const exam_date     = typeof b.exam_date === "string" && DATE_RE.test(b.exam_date) ? b.exam_date : null;
  const credits       = typeof b.credits === "number" && b.credits >= 0 && b.credits <= 20 ? Math.floor(b.credits) : null;
  const user_level    = typeof b.user_level === "string" && ALLOWED_LEVELS.has(b.user_level) ? b.user_level : null;
  const goal          = typeof b.goal === "string"  && ALLOWED_GOALS.has(b.goal) ? b.goal : null;
  const hours_per_week = typeof b.hours_per_week === "number" && b.hours_per_week >= 0 && b.hours_per_week <= 168 ? Math.floor(b.hours_per_week) : null;

  const { rows } = await pool.query(
    `INSERT INTO courses (user_id, name, name_hebrew, university, department, professor, course_number, semester, exam_date, credits, user_level, goal, hours_per_week)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [session.user.id, name, name_hebrew, university, department, professor, course_number, semester, exam_date, credits, user_level, goal, hours_per_week]
  );
  return NextResponse.json({ course: rows[0] }, { status: 201 });
}
