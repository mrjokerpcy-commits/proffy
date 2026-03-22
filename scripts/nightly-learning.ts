/**
 * Proffy — Nightly learning job
 *
 * Runs after midnight. For each conversation from the last 24 hours:
 * 1. Asks Haiku if the conversation revealed a useful insight
 * 2. Stores confirmed insights in platform_course_memory
 * 3. Finds wrong-answer patterns (5+ students same mistake) and stores collective warnings
 *
 * Usage:
 *   npx tsx scripts/nightly-learning.ts
 *
 * In production: add to cron as "0 2 * * * npx tsx scripts/nightly-learning.ts"
 */

import Anthropic from "@anthropic-ai/sdk";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "../apps/web/.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

// ── Step 1: Extract insights from today's conversations ────────────────────────
async function extractConversationInsights() {
  console.log("\n[1/3] Extracting insights from today's conversations…");

  const { rows: sessions } = await pool.query(`
    SELECT DISTINCT
      m.session_id,
      cs.course_id,
      c.name        AS course_name,
      c.university,
      c.course_number,
      c.professor,
      ARRAY_AGG(m.content ORDER BY m.created_at) FILTER (WHERE m.role = 'user')      AS questions,
      ARRAY_AGG(m.content ORDER BY m.created_at) FILTER (WHERE m.role = 'assistant') AS answers
    FROM chat_messages m
    JOIN chat_sessions cs ON cs.id = m.session_id
    JOIN courses c ON c.id = cs.course_id
    WHERE m.created_at > NOW() - INTERVAL '24 hours'
      AND cs.course_id IS NOT NULL
    GROUP BY m.session_id, cs.course_id, c.name, c.university, c.course_number, c.professor
    LIMIT 200
  `);

  console.log(`   Processing ${sessions.length} session(s)…`);
  let saved = 0;

  for (const s of sessions) {
    if (!s.questions?.length) continue;

    const sample = s.questions.slice(0, 3).map((q: string, i: number) =>
      `Q: ${q.slice(0, 200)}\nA: ${(s.answers[i] || "").slice(0, 300)}`
    ).join("\n---\n");

    try {
      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Did this student conversation about "${s.course_name}" reveal a broadly useful insight for future students?

${sample}

If yes, return JSON: { "found": true, "insight": "...", "topic": "...", "type": "trick|exam_focus|prof_pattern|key_concept|common_mistake|common_struggle" }
If no, return: { "found": false }
JSON only. Insight must be specific and durable, not personal to this student.`,
        }],
      });

      const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const result = JSON.parse(jsonMatch[0]);

      if (result.found && result.insight && result.topic) {
        await pool.query(`
          INSERT INTO platform_course_memory (university, course_name, topic, insight, insight_type, confidence, updated_at)
          VALUES ($1, $2, $3, $4, $5, 1, NOW())
          ON CONFLICT (university, course_name, topic, insight_type)
          DO UPDATE SET
            insight    = EXCLUDED.insight,
            confidence = platform_course_memory.confidence + 1,
            updated_at = NOW()
        `, [s.university, s.course_name, result.topic.slice(0, 60), result.insight.slice(0, 500), result.type ?? "key_concept"]);
        saved++;
      }
    } catch {}
  }

  console.log(`   Saved ${saved} new insight(s).`);
}

// ── Step 2: Find mistake patterns (5+ students same wrong answer) ──────────────
async function findMistakePatterns() {
  console.log("\n[2/3] Scanning quiz mistakes for patterns…");

  const { rows: patterns } = await pool.query(`
    SELECT
      course_id,
      topic,
      student_answer,
      correct_answer,
      COUNT(*) AS count
    FROM quiz_attempts
    WHERE is_correct = false
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY course_id, topic, student_answer, correct_answer
    HAVING COUNT(*) >= 5
    LIMIT 50
  `);

  console.log(`   Found ${patterns.length} recurring mistake pattern(s)…`);

  for (const p of patterns) {
    const { rows: courseRows } = await pool.query(
      "SELECT name, university FROM courses WHERE id = $1 LIMIT 1",
      [p.course_id]
    );
    if (!courseRows[0]) continue;
    const { name: courseName, university } = courseRows[0];

    try {
      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 120,
        messages: [{
          role: "user",
          content: `${p.count} students made this mistake on topic "${p.topic}":
Wrong: "${p.student_answer}"
Correct: "${p.correct_answer}"

Write one sentence warning for future students. Hebrew or English based on content. Be specific.`,
        }],
      });

      const warning = res.content[0].type === "text" ? res.content[0].text.trim() : "";
      if (!warning) continue;

      await pool.query(`
        INSERT INTO platform_course_memory (university, course_name, topic, insight, insight_type, confidence, updated_at)
        VALUES ($1, $2, $3, $4, 'common_mistake', $5, NOW())
        ON CONFLICT (university, course_name, topic, insight_type)
        DO UPDATE SET
          insight    = EXCLUDED.insight,
          confidence = platform_course_memory.confidence + $5,
          updated_at = NOW()
      `, [university, courseName, p.topic.slice(0, 60), warning.slice(0, 500), parseInt(p.count)]);

      console.log(`   [${courseName}] ${p.topic}: ${warning.slice(0, 80)}`);
    } catch {}
  }
}

// ── Step 3: Log negative feedback patterns for manual review ──────────────────
async function reviewBadFeedback() {
  console.log("\n[3/3] Reviewing thumbs-down patterns from the past week…");

  const { rows: bad } = await pool.query(`
    SELECT
      cm.content   AS answer,
      cm.session_id,
      cs.course_id,
      c.name       AS course_name
    FROM message_feedback mf
    JOIN chat_messages  cm ON cm.id = mf.message_id
    JOIN chat_sessions  cs ON cs.id = cm.session_id
    JOIN courses        c  ON c.id  = cs.course_id
    WHERE mf.rating = 'down'
      AND mf.created_at > NOW() - INTERVAL '7 days'
    LIMIT 20
  `).catch(() => ({ rows: [] }));

  if (bad.length === 0) { console.log("   No thumbs-down in the last 7 days."); return; }

  console.log(`   ${bad.length} thumbs-down found. Analyzing pattern…`);

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `These assistant answers received thumbs down from students.
Identify the most common problem pattern and suggest one specific fix.

${bad.map((b: any, i: number) => `[${i+1}] ${b.answer.slice(0, 200)}`).join("\n---\n")}

Return JSON: { "problem": "...", "suggestion": "..." }
JSON only.`,
      }],
    });

    const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const r = JSON.parse(m[0]);
      console.log(`\n   Problem pattern: ${r.problem}`);
      console.log(`   Suggested fix:    ${r.suggestion}`);
    }
  } catch {}
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌙 Proffy Nightly Learning — ${new Date().toISOString()}`);
  try {
    await extractConversationInsights();
    await findMistakePatterns();
    await reviewBadFeedback();
    console.log("\n✅ Nightly learning complete.\n");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
