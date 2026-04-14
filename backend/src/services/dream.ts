/**
 * autoDream — memory consolidation, inspired by KAIROS from the Claude Code leak.
 *
 * After a study session ends, this runs in the background to extract structured
 * insights and upsert them into course_knowledge_docs. Over time, Proffy gets
 * smarter for every student who studies the same course.
 *
 * Uses Haiku (cheap, fast) — never blocks a chat response.
 * Dream failures are swallowed silently — never surface to the user.
 */
import Anthropic from "@anthropic-ai/sdk";
import { Pool } from "pg";

type Message = { role: string; content: string };

export async function dreamCourseInsights(
  anthropic  : Anthropic,
  pool       : Pool,
  university : string,
  courseName : string,
  messages   : Message[],
): Promise<void> {
  try {
    // Only dream on sessions with meaningful content
    const meaningful = messages.filter((m) => m.content.length > 30);
    if (meaningful.length < 4) return;

    const transcript = meaningful
      .slice(-12) // last 12 messages — enough context, not too expensive
      .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 600)}`)
      .join("\n");

    const response = await anthropic.messages.create({
      model     : "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages  : [{
        role   : "user",
        content: `Analyze this study session transcript for the course "${courseName}" at ${university}.

Extract only NEW, SPECIFIC insights (not generic study tips). Return a JSON object with these fields.
Only include fields where you found actual, specific information — omit fields with nothing new:

{
  "exam_focus": "specific topics likely to appear on the exam based on this session",
  "common_struggles": "specific concepts this student found difficult",
  "key_concepts": "important concepts or formulas that came up",
  "frequently_asked": "specific questions students tend to ask about this material"
}

Return ONLY valid JSON. No explanation, no markdown fences.

TRANSCRIPT:
${transcript}`,
      }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    let insights: Record<string, string>;
    try { insights = JSON.parse(jsonMatch[0]); } catch { return; }

    const fields  = ["exam_focus", "common_struggles", "key_concepts", "frequently_asked"] as const;
    const present = fields.filter((f) => insights[f]?.trim());
    if (present.length === 0) return;

    // Upsert — merge with existing knowledge, don't overwrite blindly
    await pool.query(`
      INSERT INTO course_knowledge_docs
        (id, university, course_name, ${present.join(", ")}, updated_at)
      VALUES
        (gen_random_uuid(), $1, $2, ${present.map((_, i) => `$${i + 3}`).join(", ")}, NOW())
      ON CONFLICT (university, course_name) DO UPDATE SET
        ${present.map((f) => `${f} = EXCLUDED.${f}`).join(", ")},
        updated_at = NOW()
    `, [university, courseName, ...present.map((f) => insights[f])]);

  } catch {
    // Dream failures are invisible to the user — always
  }
}
