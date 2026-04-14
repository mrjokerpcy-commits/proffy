/**
 * Course context loader — CLAUDE.md pattern from the leak.
 * Each course has a persistent knowledge doc in the DB that Proffy reads at
 * session start, instead of relying on RAG alone.
 *
 * course_knowledge_docs contains: exam_focus, common_struggles, prof_patterns,
 * key_concepts, important_notes, frequently_asked — all AI-maintained.
 *
 * Treat this as background knowledge (a strong prior), NOT as ground truth.
 * Always cite specific retrieved chunks for claims. Skeptical memory.
 */
import { Pool } from "pg";

export async function loadCourseContext(
  pool : Pool,
  courseId  ?: string,
  university?: string,
  courseName?: string,
): Promise<string | null> {
  try {
    let row: Record<string, string> | undefined;

    if (courseId) {
      const res = await pool.query<Record<string, string>>(`
        SELECT ckd.*
        FROM   course_knowledge_docs ckd
        JOIN   courses c
               ON c.university  = ckd.university
               AND c.name       = ckd.course_name
        WHERE  c.id = $1
        LIMIT  1
      `, [courseId]);
      row = res.rows[0];
    } else if (university && courseName) {
      const res = await pool.query<Record<string, string>>(`
        SELECT * FROM course_knowledge_docs
        WHERE  university = $1 AND course_name = $2
        LIMIT  1
      `, [university, courseName]);
      row = res.rows[0];
    }

    if (!row) return null;

    const sections: string[] = [];
    if (row.exam_focus)        sections.push(`EXAM FOCUS:\n${row.exam_focus}`);
    if (row.prof_patterns)     sections.push(`PROFESSOR PATTERNS:\n${row.prof_patterns}`);
    if (row.key_concepts)      sections.push(`KEY CONCEPTS:\n${row.key_concepts}`);
    if (row.common_struggles)  sections.push(`COMMON STRUGGLES (past students):\n${row.common_struggles}`);
    if (row.frequently_asked)  sections.push(`FREQUENTLY ASKED:\n${row.frequently_asked}`);
    if (row.important_notes)   sections.push(`IMPORTANT NOTES:\n${row.important_notes}`);

    return sections.length > 0 ? sections.join("\n\n") : null;
  } catch {
    return null; // never block a chat over a context load failure
  }
}
