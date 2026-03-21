import { pool } from "../client";

export interface Course {
  id: string;
  user_id: string;
  name: string;
  name_hebrew: string | null;
  university: string;
  department: string | null;
  professor: string | null;
  course_number: string | null;
  semester: string | null;
  exam_date: Date | null;
  credits: number | null;
  user_level: string | null;
  goal: string | null;
  hours_per_week: number | null;
  created_at: Date;
}

export async function getCoursesByUser(userId: string): Promise<Course[]> {
  const { rows } = await pool.query(
    "SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}

export async function getCourseById(id: string): Promise<Course | null> {
  const { rows } = await pool.query("SELECT * FROM courses WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createCourse(data: {
  user_id: string;
  name: string;
  name_hebrew?: string;
  university: string;
  department?: string;
  professor?: string;
  course_number?: string;
  semester?: string;
  exam_date?: string;
  credits?: number;
  user_level?: string;
  goal?: string;
  hours_per_week?: number;
}): Promise<Course> {
  const { rows } = await pool.query(
    `INSERT INTO courses
       (user_id, name, name_hebrew, university, department, professor,
        course_number, semester, exam_date, credits, user_level, goal, hours_per_week)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.user_id, data.name, data.name_hebrew ?? null,
      data.university, data.department ?? null, data.professor ?? null,
      data.course_number ?? null, data.semester ?? null,
      data.exam_date ?? null, data.credits ?? null,
      data.user_level ?? null, data.goal ?? null, data.hours_per_week ?? null,
    ]
  );
  return rows[0];
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course> {
  const fields = Object.entries(data)
    .filter(([k]) => !["id", "user_id", "created_at"].includes(k))
    .map(([k], i) => `${k} = $${i + 2}`)
    .join(", ");
  const values = Object.entries(data)
    .filter(([k]) => !["id", "user_id", "created_at"].includes(k))
    .map(([, v]) => v);

  const { rows } = await pool.query(
    `UPDATE courses SET ${fields}, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0];
}

export async function getDaysUntilExam(courseId: string): Promise<number | null> {
  const { rows } = await pool.query(
    "SELECT exam_date FROM courses WHERE id = $1",
    [courseId]
  );
  if (!rows[0]?.exam_date) return null;
  const diff = new Date(rows[0].exam_date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
