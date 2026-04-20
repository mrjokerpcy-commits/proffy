import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "placeholder" });
const qdrant  = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333", ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}) });

// ── Section metadata ─────────────────────────────────────────────────────────
const SECTION_QUERIES: Record<string, string> = {
  reading:       "הבנת הנקרא קטע אקדמי שאלות הבנה רעיון מרכזי אוצר מילים",
  completion:    "השלמת משפטים מילת יחס מילת קישור ביטוי קבוע",
  reformulation: "ניסוח מחדש משפט נרדף שינוי ניסוח משמעות זהה",
};

const SECTION_PROMPTS: Record<string, string> = {
  reading: `Generate a Yael exam (ידע בעברית לאקדמיה) reading comprehension exercise in Hebrew.

IMPORTANT — copyright-safe approach:
Mirror the exact question TYPES found on real Yael exams, but use completely original passages and characters.
For example: if real exams ask "Why did Waleed choose to leave the city?", your question would be "Why did Dina decide to move to another neighborhood?" — same question purpose (inference about motivation), different content.

{{MATERIAL_CONTEXT}}

Return a JSON object (no markdown, no code block):
{
  "passage": "An original Hebrew passage of 220-300 words on an academic or social topic. Formal Hebrew at academic level. Use original characters and scenarios (NOT copied from any exam).",
  "title": "Short Hebrew title (3-6 words)",
  "questions": [
    {
      "id": "q1",
      "text": "Question in Hebrew",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct": "B",
      "explanation": "2-3 sentence explanation in Hebrew — why correct and why others are wrong"
    }
  ]
}

Generate exactly 5 questions in this order (same as real Yael exam):
1. Main idea / central theme (רעיון מרכזי) — "מה הנושא המרכזי של הקטע?"
2. Specific detail retrieval (פרט ספציפי) — "לפי הקטע, מה קרה כאשר..."
3. Inference / implication (השלכה / מסקנה) — "מה ניתן להסיק מן הקטע לגבי..."
4. Author's tone or attitude (גישת הכותב / עמדת המחבר) — "מה עמדת הכותב כלפי..."
5. Vocabulary in context (אוצר מילים בהקשר) — "המילה '...' בקטע משמעותה"

Difficulty: real Yael exam level. Distractors must be plausible — wrong for a clear reason but not obviously wrong.`,

  completion: `Generate a Yael exam (ידע בעברית לאקדמיה) sentence completion (השלמת משפטים) exercise in Hebrew.

IMPORTANT — copyright-safe approach:
Mirror the exact grammatical patterns tested on real Yael exams, but write completely original sentences.
For example: if a real exam tests "הוא ניגש _____ המורה" (preposition after ניגש), your sentence might be
"היא פנתה _____ הרופא" — same grammatical skill (preposition after verb of approach), different sentence.

{{MATERIAL_CONTEXT}}

Return a JSON object (no markdown, no code block):
{
  "passage": null,
  "title": "השלמת משפטים",
  "questions": [
    {
      "id": "q1",
      "text": "בחר את המילה או הביטוי המשלים את המשפט:\n\n'הממשלה הכריזה _____ מצב חירום לאחר האסון.'",
      "options": { "A": "על", "B": "בדבר", "C": "אל", "D": "כלפי" },
      "correct": "A",
      "explanation": "'הכריז על' הוא הצירוף הנכון. 'בדבר' פחות טבעי עם 'הכריז'. 'אל' ו'כלפי' שגויים דקדוקית כאן."
    }
  ]
}

Generate exactly 8 questions. Use _____ to mark the gap. Distribute like real Yael exams:
- מילת יחס (preposition after specific verbs/adjectives): 3 questions
- מילת קישור / מילת פתיחה (connective/conjunction): 2 questions
- מילה מתאימה להקשר (context-appropriate word): 2 questions
- ביטוי קבוע (fixed phrase/idiom): 1 question

Academic formal Hebrew. Each wrong option must be plausibly tempting.`,

  reformulation: `Generate a Yael exam (ידע בעברית לאקדמיה) reformulation (ניסוח מחדש) exercise in Hebrew.

IMPORTANT — copyright-safe approach:
Mirror the exact linguistic transformations tested on real Yael exams, but write completely original sentences.

{{MATERIAL_CONTEXT}}

Return a JSON object (no markdown, no code block):
{
  "passage": null,
  "title": "ניסוח מחדש",
  "questions": [
    {
      "id": "q1",
      "text": "קרא את המשפט הבא:\n\n'על אף הביקורת הרבה, הממשלה לא שינתה את מדיניותה.'\n\nאיזו מן האפשרויות מביעה באופן המדויק ביותר את אותו הרעיון?",
      "options": {
        "A": "הממשלה שינתה את מדיניותה בעקבות הביקורת.",
        "B": "הממשלה לא הגיבה לביקורת שהושמעה.",
        "C": "חרף הביקורת הרבה, הממשלה עמדה על עמדתה.",
        "D": "הממשלה הגיבה לביקורת אך לא שינתה דבר."
      },
      "correct": "C",
      "explanation": "'חרף' = 'על אף'. 'עמדה על עמדתה' = 'לא שינתה את מדיניותה'. זהות מלאה. A — הפוך. B — חסר. D — מוסיף מידע שאינו בקטע."
    }
  ]
}

Generate exactly 6 questions. Each tests one of these transformations:
1. Concessive clauses — על אף / למרות → חרף / אף על פי ש
2. Causal structures — מפני ש / לפי ש → משום / בשל / נוכח
3. Active ↔ Passive voice
4. Synonym substitution in formal register
5. Syntactic inversion
6. Conditional clause paraphrase

Rules for distractors:
- One option changes meaning in only one small way (hardest distractor)
- One option adds information not in the original
- One option omits a key element

Difficulty: real Yael exam level.`,
};

// ── Fetch relevant Yael material chunks from Qdrant ──────────────────────────
async function fetchYaelContext(section: string): Promise<string> {
  try {
    const query = SECTION_QUERIES[section] ?? section;
    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const vector = embRes.data[0].embedding;

    const results = await qdrant.search("studyai_chunks", {
      vector,
      limit: 6,
      filter: {
        must: [{ key: "type", match: { value: "yael" } }],
      },
      with_payload: true,
    });

    if (!results.length) return "";

    const chunks = results
      .filter(r => r.score > 0.3)
      .map(r => (r.payload as any)?.text ?? "")
      .filter(Boolean)
      .join("\n\n---\n\n");

    return chunks
      ? `REFERENCE MATERIAL from past Yael exams (use these patterns as inspiration — do NOT copy verbatim, create copyright-safe variations):\n\n${chunks}\n\n`
      : "";
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { section?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const section = body.section;
  if (!section || !SECTION_PROMPTS[section]) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  // Fetch relevant Yael exam material for RAG context
  const materialContext = await fetchYaelContext(section);
  const prompt = SECTION_PROMPTS[section].replace("{{MATERIAL_CONTEXT}}", materialContext);

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let data;
    try { data = JSON.parse(cleaned); }
    catch { return NextResponse.json({ error: "AI parse error", raw: text }, { status: 500 }); }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Yael generate error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
