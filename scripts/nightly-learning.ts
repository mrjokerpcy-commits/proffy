/**
 * Proffy — Nightly learning job
 *
 * Runs at 2 AM. Learns from everything that happened today and feeds
 * that knowledge back into the platform so every future student benefits.
 *
 * Learning mechanisms:
 *  1. Conversation insights  — extract durable facts from today's Q&A
 *  2. Mistake patterns       — 5+ students same wrong answer → warning
 *  3. Cross-student struggles — 3+ students weak on same topic → surface it
 *  4. Topic heat map         — what topics spike before exams → exam_focus
 *  5. Good answer harvest    — from thumbs-up: extract what worked well
 *  6. Content gap detection  — topics asked but no RAG material found
 *  7. Bad answer analysis    — from thumbs-down: find systemic problems
 *
 * Usage:
 *   npx tsx scripts/nightly-learning.ts
 *
 * In production: cron "0 2 * * *"
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

const haiku   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const pool    = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  try { return m ? JSON.parse(m[0]) : null; } catch { return null; }
}

async function askHaiku(prompt: string, maxTokens = 200): Promise<string> {
  const res = await haiku.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return res.content[0].type === "text" ? res.content[0].text.trim() : "";
}

async function savePlatformMemory(
  university: string,
  courseName: string,
  topic: string,
  insight: string,
  type: string,
  confidenceBoost = 1,
) {
  const ALLOWED = new Set(["common_struggle", "exam_focus", "prof_pattern", "key_concept", "common_mistake", "good_explanation", "content_gap"]);
  const safeType = ALLOWED.has(type) ? type : "key_concept";
  await pool.query(`
    INSERT INTO platform_course_memory (university, course_name, topic, insight, insight_type, confidence, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW())
    ON CONFLICT (university, course_name, topic, insight_type)
    DO UPDATE SET
      insight    = EXCLUDED.insight,
      confidence = platform_course_memory.confidence + $6,
      updated_at = NOW()
  `, [university, courseName, topic.slice(0, 60), insight.slice(0, 500), safeType, confidenceBoost]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXTRACT INSIGHTS FROM TODAY'S CONVERSATIONS
// "Did this Q&A reveal anything broadly useful for future students?"
// ─────────────────────────────────────────────────────────────────────────────
async function extractConversationInsights() {
  console.log("\n[1/7] Extracting insights from today's conversations…");

  const { rows: sessions } = await pool.query(`
    SELECT DISTINCT
      m.session_id,
      cs.course_id,
      c.name        AS course_name,
      c.university,
      c.professor,
      ARRAY_AGG(m.content ORDER BY m.created_at) FILTER (WHERE m.role = 'user')      AS questions,
      ARRAY_AGG(m.content ORDER BY m.created_at) FILTER (WHERE m.role = 'assistant') AS answers
    FROM chat_messages m
    JOIN chat_sessions cs ON cs.id = m.session_id
    JOIN courses c ON c.id = cs.course_id
    WHERE m.created_at > NOW() - INTERVAL '24 hours'
      AND cs.course_id IS NOT NULL
    GROUP BY m.session_id, cs.course_id, c.name, c.university, c.professor
    LIMIT 200
  `);

  console.log(`   Processing ${sessions.length} session(s)…`);
  let saved = 0;

  for (const s of sessions) {
    if (!s.questions?.length) continue;
    const sample = s.questions.slice(0, 4).map((q: string, i: number) =>
      `Q: ${q.slice(0, 200)}\nA: ${(s.answers[i] || "").slice(0, 300)}`
    ).join("\n---\n");

    try {
      const text = await askHaiku(`
Did this student conversation about "${s.course_name}" reveal a broadly useful insight for future students?

${sample}

If yes: { "found": true, "insight": "...", "topic": "...", "type": "trick|exam_focus|prof_pattern|key_concept|common_mistake|common_struggle" }
If no:  { "found": false }
JSON only. Insight must be specific and durable, not personal to this student.`);

      const result = extractJson(text);
      if (result?.found && result.insight && result.topic) {
        await savePlatformMemory(s.university, s.course_name, result.topic, result.insight, result.type ?? "key_concept");
        saved++;
      }
    } catch {}
  }
  console.log(`   Saved ${saved} insight(s).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MISTAKE PATTERNS
// 5+ students gave the same wrong answer → generate a targeted warning
// ─────────────────────────────────────────────────────────────────────────────
async function findMistakePatterns() {
  console.log("\n[2/7] Scanning quiz mistakes for patterns…");

  const { rows } = await pool.query(`
    SELECT course_id, topic, student_answer, correct_answer, COUNT(*) AS count
    FROM quiz_attempts
    WHERE is_correct = false AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY course_id, topic, student_answer, correct_answer
    HAVING COUNT(*) >= 5
    LIMIT 50
  `);

  console.log(`   Found ${rows.length} recurring mistake(s)…`);

  for (const p of rows) {
    const { rows: cr } = await pool.query("SELECT name, university FROM courses WHERE id = $1 LIMIT 1", [p.course_id]);
    if (!cr[0]) continue;
    try {
      const warning = await askHaiku(`
${p.count} students made this mistake on "${p.topic}":
Wrong: "${p.student_answer}" | Correct: "${p.correct_answer}"
Write ONE clear warning sentence for future students. Be specific. Hebrew or English based on content.`, 100);
      if (warning) {
        await savePlatformMemory(cr[0].university, cr[0].name, p.topic, warning, "common_mistake", parseInt(p.count));
        console.log(`   [${cr[0].name}] ${p.topic}: ${warning.slice(0, 70)}`);
      }
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CROSS-STUDENT STRUGGLE AGGREGATION
// 3+ different students marked the same topic as weak → definitely hard
// This is stronger signal than any single student's weakness
// ─────────────────────────────────────────────────────────────────────────────
async function aggregateSharedStruggles() {
  console.log("\n[3/7] Aggregating shared struggles across students…");

  const { rows } = await pool.query(`
    SELECT
      c.name        AS course_name,
      c.university,
      si.topic,
      COUNT(DISTINCT si.user_id) AS student_count,
      ARRAY_AGG(si.note)         AS notes
    FROM student_insights si
    JOIN courses c ON c.id = si.course_id
    WHERE si.status IN ('weak', 'needs_review')
      AND si.updated_at > NOW() - INTERVAL '30 days'
    GROUP BY c.name, c.university, si.topic
    HAVING COUNT(DISTINCT si.user_id) >= 3
    ORDER BY student_count DESC
    LIMIT 40
  `);

  console.log(`   Found ${rows.length} shared struggle topic(s)…`);

  for (const r of rows) {
    const notes = (r.notes as string[]).filter(Boolean).slice(0, 3).join("; ");
    try {
      const insight = await askHaiku(`
${r.student_count} students in "${r.course_name}" all struggled with: "${r.topic}"
Student notes: ${notes || "no notes"}

Write ONE sentence explaining WHY this topic is typically hard and ONE quick study tip. Combine into one sentence. Be concrete.`, 120);
      if (insight) {
        await savePlatformMemory(r.university, r.course_name, r.topic, insight, "common_struggle", r.student_count);
        console.log(`   [${r.course_name}] ${r.topic} (${r.student_count} students): ${insight.slice(0, 70)}`);
      }
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TOPIC HEAT MAP — PRE-EXAM SURGE DETECTION
// Topics that spike in the 7 days before an exam are almost certainly on it
// "Students always ask about X right before Cohen's final" → exam_focus
// ─────────────────────────────────────────────────────────────────────────────
async function detectPreExamTopicSurge() {
  console.log("\n[4/7] Detecting pre-exam topic surges…");

  // Find courses whose exam is within the next 14 days
  const { rows: upcomingExams } = await pool.query(`
    SELECT DISTINCT
      c.id, c.name, c.university, c.professor, c.exam_date,
      EXTRACT(DAY FROM c.exam_date - CURRENT_DATE) AS days_until_exam
    FROM courses c
    WHERE c.exam_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
  `);

  if (upcomingExams.length === 0) { console.log("   No upcoming exams in next 14 days."); return; }

  console.log(`   ${upcomingExams.length} upcoming exam(s) found.`);

  for (const exam of upcomingExams) {
    // Get topics students are asking about for this course in the last 7 days
    const { rows: hotTopics } = await pool.query(`
      SELECT si.topic, COUNT(*) AS asks
      FROM student_insights si
      WHERE si.course_id = $1
        AND si.updated_at > NOW() - INTERVAL '7 days'
      GROUP BY si.topic
      ORDER BY asks DESC
      LIMIT 8
    `, [exam.id]);

    if (hotTopics.length === 0) continue;

    const topicList = hotTopics.map((t: any) => `${t.topic} (${t.asks}x)`).join(", ");
    try {
      const insight = await askHaiku(`
Students studying "${exam.name}" are asking most about these topics in the ${exam.days_until_exam} days before the exam:
${topicList}

Based on these being pre-exam hot topics, write ONE sentence for future students about what to prioritize for this exam.
Be specific about the topics. Do NOT say "as noted" or "based on data".`, 120);
      if (insight) {
        const topic = `Pre-exam hot topics (${exam.days_until_exam}d out)`;
        await savePlatformMemory(exam.university, exam.name, topic, insight, "exam_focus", hotTopics.length);
        console.log(`   [${exam.name}] exam in ${exam.days_until_exam}d — hot: ${topicList.slice(0, 60)}`);
      }
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GOOD ANSWER HARVEST
// When students give thumbs up, extract WHAT made the answer effective
// "Claude explained BST insertion with a Hebrew table and it clicked" →
//   save that explanation style as a teaching insight for that topic
// ─────────────────────────────────────────────────────────────────────────────
async function harvestGoodAnswers() {
  console.log("\n[5/7] Harvesting teaching patterns from thumbs-up answers…");

  const { rows } = await pool.query(`
    SELECT
      cm.content     AS answer,
      c.name         AS course_name,
      c.university
    FROM message_feedback mf
    JOIN chat_messages  cm ON cm.id = mf.message_id
    JOIN chat_sessions  cs ON cs.id = cm.session_id
    JOIN courses        c  ON c.id  = cs.course_id
    WHERE mf.rating = 'up'
      AND mf.created_at > NOW() - INTERVAL '7 days'
      AND LENGTH(cm.content) > 300
    ORDER BY RANDOM()
    LIMIT 30
  `).catch(() => ({ rows: [] }));

  if (rows.length === 0) { console.log("   No thumbs-up answers this week."); return; }
  console.log(`   Analyzing ${rows.length} well-rated answer(s)…`);

  // Group by course and batch analyze
  const byCourse = new Map<string, { courseName: string; university: string; answers: string[] }>();
  for (const r of rows) {
    const key = `${r.university}::${r.course_name}`;
    if (!byCourse.has(key)) byCourse.set(key, { courseName: r.course_name, university: r.university, answers: [] });
    byCourse.get(key)!.answers.push(r.answer.slice(0, 400));
  }

  let saved = 0;
  for (const [, g] of byCourse) {
    if (g.answers.length < 2) continue; // need at least 2 to find a pattern
    try {
      const text = await askHaiku(`
These answers about "${g.courseName}" all received thumbs-up from students:

${g.answers.slice(0, 4).map((a, i) => `[${i+1}] ${a}`).join("\n---\n")}

What teaching pattern made these answers effective? Extract ONE specific, reusable technique.
Return JSON: { "topic": "...", "insight": "The explanation technique that worked: ..." }
JSON only. Focus on HOW it explained, not what it explained.`, 150);

      const result = extractJson(text);
      if (result?.insight && result?.topic) {
        await savePlatformMemory(g.university, g.courseName, result.topic, result.insight, "good_explanation");
        saved++;
      }
    } catch {}
  }
  console.log(`   Saved ${saved} teaching pattern(s).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONTENT GAP DETECTION
// Questions where the answer had empty sources → material is missing for this topic
// Flag it so admins know what to upload next
// ─────────────────────────────────────────────────────────────────────────────
async function detectContentGaps() {
  console.log("\n[6/7] Detecting content gaps (questions with no RAG sources)…");

  const { rows } = await pool.query(`
    SELECT
      user_msg.content  AS question,
      c.name            AS course_name,
      c.university,
      cs.course_id
    FROM chat_messages user_msg
    JOIN chat_messages asst_msg  ON asst_msg.session_id = user_msg.session_id
      AND asst_msg.role = 'assistant'
      AND asst_msg.created_at > user_msg.created_at
    JOIN chat_sessions cs ON cs.id = user_msg.session_id
    JOIN courses       c  ON c.id  = cs.course_id
    WHERE user_msg.role = 'user'
      AND user_msg.created_at > NOW() - INTERVAL '24 hours'
      AND (asst_msg.sources IS NULL OR asst_msg.sources = '[]'::jsonb OR asst_msg.sources = 'null'::jsonb)
      AND cs.course_id IS NOT NULL
      AND LENGTH(user_msg.content) > 20
    LIMIT 60
  `);

  if (rows.length === 0) { console.log("   No content gaps found today."); return; }
  console.log(`   ${rows.length} no-source question(s) found.`);

  // Group by course
  const byCourse = new Map<string, { courseName: string; university: string; questions: string[] }>();
  for (const r of rows) {
    const key = `${r.university}::${r.course_name}`;
    if (!byCourse.has(key)) byCourse.set(key, { courseName: r.course_name, university: r.university, questions: [] });
    byCourse.get(key)!.questions.push(r.question.slice(0, 200));
  }

  let flagged = 0;
  for (const [, g] of byCourse) {
    try {
      const text = await askHaiku(`
Students of "${g.courseName}" asked these questions but there was NO course material to answer from:

${g.questions.slice(0, 6).map((q, i) => `${i+1}. ${q}`).join("\n")}

What topic(s) are missing from the course material? Return JSON:
{ "topic": "...", "gap": "Students ask about [X] but no material covers it — need to upload [specific doc type]" }
JSON only. Be specific about what type of material is missing (slides/exams/notes).`, 150);

      const result = extractJson(text);
      if (result?.gap && result?.topic) {
        await savePlatformMemory(g.university, g.courseName, result.topic, result.gap, "content_gap");
        console.log(`   [${g.courseName}] gap: ${result.gap.slice(0, 80)}`);
        flagged++;
      }
    } catch {}
  }
  console.log(`   Flagged ${flagged} content gap(s).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. BAD ANSWER ANALYSIS
// From thumbs-down: find systemic problem + log suggestion for manual review
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeBadAnswers() {
  console.log("\n[7/7] Analyzing thumbs-down patterns…");

  const { rows } = await pool.query(`
    SELECT
      cm.content   AS answer,
      c.name       AS course_name
    FROM message_feedback mf
    JOIN chat_messages  cm ON cm.id = mf.message_id
    JOIN chat_sessions  cs ON cs.id = cm.session_id
    JOIN courses        c  ON c.id  = cs.course_id
    WHERE mf.rating = 'down'
      AND mf.created_at > NOW() - INTERVAL '7 days'
    LIMIT 20
  `).catch(() => ({ rows: [] }));

  if (rows.length === 0) { console.log("   No thumbs-down this week. Good sign!"); return; }
  console.log(`   ${rows.length} thumbs-down found.`);

  try {
    const text = await askHaiku(`
These answers received thumbs-down. Find the most common problem.

${rows.map((b: any, i: number) => `[${i+1}] ${b.answer.slice(0, 200)}`).join("\n---\n")}

Return JSON: { "problem": "...", "fix": "Add this to the system prompt: ..." }
JSON only.`, 300);

    const result = extractJson(text);
    if (result) {
      console.log(`\n   Problem: ${result.problem}`);
      console.log(`   Fix:     ${result.fix}`);
      // Log to DB for admin review (use content_gap type as a flag)
      await pool.query(`
        INSERT INTO platform_course_memory (university, course_name, topic, insight, insight_type, confidence, updated_at)
        VALUES ('_system', '_feedback', 'thumbs_down_pattern', $1, 'content_gap', 1, NOW())
        ON CONFLICT (university, course_name, topic, insight_type)
        DO UPDATE SET insight = EXCLUDED.insight, updated_at = NOW()
      `, [`Problem: ${result.problem} | Fix: ${result.fix}`]).catch(() => {});
    }
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌙 Proffy Nightly Learning — ${new Date().toISOString()}`);
  const start = Date.now();

  try {
    await extractConversationInsights();  // Q&A → durable insights
    await findMistakePatterns();          // wrong quiz answers → warnings
    await aggregateSharedStruggles();     // 3+ students weak on same topic
    await detectPreExamTopicSurge();      // pre-exam hot topics → exam_focus
    await harvestGoodAnswers();           // thumbs-up → teaching patterns
    await detectContentGaps();            // no-source questions → what to upload
    await analyzeBadAnswers();            // thumbs-down → system prompt fixes

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Nightly learning complete in ${elapsed}s.\n`);
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await pool.end();
  }
}

main();
