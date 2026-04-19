import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SECTION_PROMPTS: Record<string, string> = {
  reading: `Generate a Yael exam (ידע בעברית לאקדמיה) reading comprehension exercise in Hebrew.

Return a JSON object (no markdown, no code block) with this exact structure:
{
  "passage": "A Hebrew passage of 200-300 words on an academic or general-interest topic. Use clear, formal Hebrew at academic level.",
  "title": "A short Hebrew title for the passage (3-6 words)",
  "questions": [
    {
      "id": "q1",
      "text": "Question in Hebrew",
      "options": { "A": "Option A in Hebrew", "B": "Option B in Hebrew", "C": "Option C in Hebrew", "D": "Option D in Hebrew" },
      "correct": "B",
      "explanation": "Explanation in Hebrew (2-3 sentences) — why this is correct and the others are wrong"
    }
  ]
}

Generate exactly 5 questions covering:
- Main idea / central theme (רעיון מרכזי)
- Specific detail from the text (פרט ספציפי)
- Inference / implication (השלכה / מסקנה)
- Author's tone or purpose (גישת הכותב)
- Vocabulary in context (אוצר מילים בהקשר)

At actual Yael exam difficulty.`,

  completion: `Generate a Yael exam (ידע בעברית לאקדמיה) sentence completion (השלמת משפטים) exercise in Hebrew.

Each question gives an incomplete Hebrew sentence and the student must choose the word or phrase that best completes it.

Return a JSON object (no markdown, no code block) with this exact structure:
{
  "passage": null,
  "title": "השלמת משפטים",
  "questions": [
    {
      "id": "q1",
      "text": "משפט עם פער: 'הממשלה הכריזה _____ מצב חירום לאחר האסון הטבעי.' — בחר את המילה המתאימה:",
      "options": { "A": "על", "B": "בדבר", "C": "אל", "D": "כלפי" },
      "correct": "A",
      "explanation": "הסבר בעברית: 'הכריז על' הוא הצירוף הנכון בעברית תקנית. האפשרויות האחרות שגויות דקדוקית."
    }
  ]
}

Generate exactly 8 questions. Use _____ to mark the gap. Mix of:
- Preposition in context — מילת יחס (3 questions)
- Connective / conjunction — מילת קישור (2 questions)
- Right word from context — מילה מתאימה (2 questions)
- Idiomatic expression — ביטוי (1 question)

Use formal, academic Hebrew at actual Yael exam level.`,

  reformulation: `Generate a Yael exam (ידע בעברית לאקדמיה) reformulation (ניסוח מחדש) exercise in Hebrew.

Each question presents a Hebrew sentence, then asks which option expresses EXACTLY the same meaning using different wording.

Return a JSON object (no markdown, no code block) with this exact structure:
{
  "passage": null,
  "title": "ניסוח מחדש",
  "questions": [
    {
      "id": "q1",
      "text": "המשפט הנתון:\n'על אף הביקורת הרבה שהושמעה, הממשלה לא שינתה את מדיניותה.'\n\nאיזו מן האפשרויות מביעה באופן הטוב ביותר את אותו הרעיון?",
      "options": {
        "A": "הממשלה שינתה את מדיניותה בעקבות הביקורת.",
        "B": "הממשלה לא הגיבה לביקורת שהושמעה כנגדה.",
        "C": "חרף הביקורת הרבה, הממשלה עמדה על מדיניותה.",
        "D": "הממשלה הגיבה לביקורת אך לא שינתה דבר."
      },
      "correct": "C",
      "explanation": "הסבר: 'חרף' = 'על אף', ו'עמדה על מדיניותה' = 'לא שינתה את מדיניותה'. משמעות זהה. האחרות משנות את המשמעות."
    }
  ]
}

Generate exactly 6 questions.
Rules:
- The original sentence and the correct option must convey EXACTLY the same meaning
- Wrong options must have subtle but real differences in meaning (not just wording)
- Test: synonyms, syntactic inversion, active/passive, different connectives
- Difficulty: actual Yael exam level, formal academic Hebrew
- The original sentence must appear clearly before the question`,
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: SECTION_PROMPTS[section],
      }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";

    // Strip any accidental markdown code fences
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
