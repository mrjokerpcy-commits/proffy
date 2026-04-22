import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SECTION_PROMPTS: Record<string, string> = {
  reading: `Generate a Yael exam (ידע בעברית לאקדמיה) reading comprehension exercise in Hebrew.

Copyright-safe: mirror the exact question TYPES from real Yael exams, but write a completely original passage and use different characters/scenarios. Same question PURPOSE, different content.

Return ONLY a raw JSON object (no markdown, no code fences):
{
  "passage": "An original Hebrew academic passage of 220-300 words. Formal Hebrew. Original characters and scenarios.",
  "title": "Short Hebrew title (3-6 words)",
  "questions": [
    {
      "id": "q1",
      "text": "Question in Hebrew",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct": "B",
      "explanation": "2-3 sentence Hebrew explanation — why correct and why others are wrong"
    }
  ]
}

Generate exactly 5 questions in this order:
1. Main idea (רעיון מרכזי) — "מה הנושא המרכזי של הקטע?"
2. Specific detail (פרט ספציפי) — "לפי הקטע, מה קרה כאשר..."
3. Inference (השלכה) — "מה ניתן להסיק מן הקטע לגבי..."
4. Author's attitude (עמדת הכותב) — "מה עמדת הכותב כלפי..."
5. Vocabulary in context (אוצר מילים) — "המילה '...' בקטע משמעותה"

Real Yael exam difficulty. Distractors must be plausible but clearly wrong for a specific reason.`,

  completion: `Generate a Yael exam (ידע בעברית לאקדמיה) sentence completion (השלמת משפטים) exercise in Hebrew.

Copyright-safe: mirror the grammatical patterns from real Yael exams (same skill tested), but write completely original sentences with different contexts.

Return ONLY a raw JSON object (no markdown, no code fences):
{
  "passage": null,
  "title": "השלמת משפטים",
  "questions": [
    {
      "id": "q1",
      "text": "בחר את המילה או הביטוי המשלים את המשפט:\n\n'הממשלה הכריזה _____ מצב חירום לאחר האסון.'",
      "options": { "A": "על", "B": "בדבר", "C": "אל", "D": "כלפי" },
      "correct": "A",
      "explanation": "'הכריז על' — הצירוף הנכון. 'בדבר' פחות טבעי. 'אל' ו'כלפי' שגויים דקדוקית."
    }
  ]
}

Generate exactly 8 questions. Use _____ for the gap. Mix:
- 3 preposition questions (מילת יחס): e.g. שייך ל, מחויב ל, תלוי ב, ניגש אל/ל, הסכים ל
- 2 connective questions (מילת קישור): e.g. על אף, אלא, לפיכך, מאחר, אף על פי כן
- 2 vocabulary in context (מילה מתאימה): near-synonyms, formal register choices
- 1 fixed phrase (ביטוי קבוע): e.g. להניח את הדעת, לשים לב, להביא בחשבון

Academic formal Hebrew. Every wrong option must be temptingly plausible.`,

  reformulation: `Generate a Yael exam (ידע בעברית לאקדמיה) reformulation (ניסוח מחדש) exercise in Hebrew.

Copyright-safe: mirror the linguistic transformation TYPES from real Yael exams, but write completely original sentences.

Return ONLY a raw JSON object (no markdown, no code fences):
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
      "explanation": "'חרף' = 'על אף'. 'עמדה על עמדתה' = 'לא שינתה'. זהות מלאה. A הפוך. B חסר את עניין המדיניות. D מוסיף מידע שאינו בקטע."
    }
  ]
}

Generate exactly 6 questions. Vary transformation types:
1. Concessive clauses: על אף / למרות ↔ חרף / אף על פי ש
2. Causal: מפני ש / לפי ש ↔ משום / בשל / נוכח
3. Active ↔ Passive voice
4. Synonym substitution in formal register
5. Syntactic inversion (subject/object order)
6. Conditional clause paraphrase

Distractor rules: one option changes meaning subtly, one adds info not in original, one omits a key element.`,
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { section?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const section = body.section;
  if (!section || !SECTION_PROMPTS[section]) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: SECTION_PROMPTS[section] }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = text.replace(/^```(?:json)?\n?/gm, "").replace(/\n?```$/gm, "").trim();

    let data;
    try { data = JSON.parse(cleaned); }
    catch { return NextResponse.json({ error: "Parse error", raw: text.slice(0, 300) }, { status: 500 }); }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Yael generate error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Generation failed" }, { status: 500 });
  }
}
