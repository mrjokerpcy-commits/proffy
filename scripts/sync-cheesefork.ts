/**
 * Proffy — Sync Technion course catalog from Cheesefork API
 *
 * Populates the technion_courses table with real course data
 * including course numbers, names, lecturers, exam dates.
 *
 * Usage:
 *   tsx scripts/sync-cheesefork.ts --semester 2025b
 *
 * Run every semester start to keep catalog fresh.
 */

import { Pool } from "pg";
import * as path from "path";
import * as fs from "fs";

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "../apps/web/.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k?.trim() && v.length) process.env[k.trim()] = v.join("=").trim();
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

function arg(flag: string): string {
  const idx = process.argv.indexOf(flag);
  return (idx !== -1 && process.argv[idx + 1]) ? process.argv[idx + 1] : "";
}

const SEMESTER = arg("--semester") || "2025b";

// Cheesefork-compatible Technion API
// Public UG API: https://ug3.technion.ac.il/rishum/rachat
const TECHNION_API = "https://ug3.technion.ac.il/rishum/rachat";

interface RawCourse {
  KOD:       string;  // course number
  SHHEM:     string;  // Hebrew name
  SHEM:      string;  // English name (may be missing)
  MMOCHED:   string;  // lecturer
  SEMNAME:   string;  // semester label
  POINTS:    string;  // credits
  EXAM_L?:   string;  // final exam date
}

async function fetchCourses(semester: string): Promise<RawCourse[]> {
  // Cheesefork uses a specific semester format: 201 = winter, 202 = spring, 203 = summer
  // Map our format: 2025a→201, 2025b→202, 2025s→203
  const year = parseInt(semester.slice(0, 4));
  const term = semester.slice(4);
  const termCode = term === "a" ? "201" : term === "b" ? "202" : "203";
  const semCode  = `${year}${termCode}`;

  console.log(`  Fetching semester ${semester} (code: ${semCode}) from Technion UG API…`);

  // Try Cheesefork's data endpoint
  const cheeseforkUrl = `https://cheesefork.cf/course-loader/data/${semCode}.json`;
  try {
    const res  = await fetch(cheeseforkUrl, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const data = await res.json() as any;
      const courses: RawCourse[] = Array.isArray(data) ? data : Object.values(data);
      console.log(`  Got ${courses.length} courses from Cheesefork`);
      return courses;
    }
  } catch {
    console.log(`  Cheesefork unavailable, trying Technion UG API…`);
  }

  // Fallback: direct Technion UG API
  try {
    const res  = await fetch(`${TECHNION_API}?SEM=${semCode}&PEILUT=QRY&MK_MOED=A`, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      const courses = Array.isArray(data) ? data : (data?.courses ?? []);
      console.log(`  Got ${courses.length} courses from Technion UG`);
      return courses;
    }
  } catch {
    console.log(`  Technion UG API also unavailable`);
  }

  return [];
}

function parseDate(d: string | undefined): string | null {
  if (!d) return null;
  // Try DD/MM/YYYY
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return null;
}

async function main() {
  console.log(`\n📚 Proffy — Technion Course Catalog Sync`);
  console.log(`   Semester: ${SEMESTER}\n`);

  const courses = await fetchCourses(SEMESTER);

  if (courses.length === 0) {
    console.log("⚠ No courses fetched. Check network / API availability.");
    console.log("  You can also manually insert courses into the technion_courses table.");
    await pool.end();
    return;
  }

  let inserted = 0, updated = 0, errors = 0;

  for (const c of courses) {
    const number   = (c.KOD ?? "").trim();
    const nameHeb  = (c.SHHEM ?? "").trim();
    const nameEng  = (c.SHEM  ?? "").trim() || nameHeb;
    const lecturer = (c.MMOCHED ?? "").trim() || null;
    const credits  = parseInt(c.POINTS ?? "0") || null;
    const examDate = parseDate(c.EXAM_L);

    if (!number || !nameHeb) continue;

    try {
      const res = await pool.query(
        `INSERT INTO technion_courses (course_number, name, name_hebrew, lecturer, semester, exam_date, credits, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (course_number, semester)
         DO UPDATE SET
           name        = EXCLUDED.name,
           name_hebrew = EXCLUDED.name_hebrew,
           lecturer    = EXCLUDED.lecturer,
           exam_date   = EXCLUDED.exam_date,
           credits     = EXCLUDED.credits,
           updated_at  = NOW()
         RETURNING (xmax = 0) as inserted`,
        [number, nameEng, nameHeb, lecturer, SEMESTER, examDate, credits]
      );
      if (res.rows[0]?.inserted) inserted++; else updated++;
    } catch {
      errors++;
    }
  }

  const total = await pool.query("SELECT COUNT(*) FROM technion_courses WHERE semester = $1", [SEMESTER]);
  console.log(`\n✅ Sync complete for ${SEMESTER}:`);
  console.log(`   Inserted: ${inserted} | Updated: ${updated} | Errors: ${errors}`);
  console.log(`   Total in DB for ${SEMESTER}: ${total.rows[0].count}\n`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
