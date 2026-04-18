import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SECTION_PROMPTS: Record<string, string> = {
  reading: `Generate a psychometric exam reading comprehension exercise in Hebrew.

Return a JSON object (no markdown, no code block) with this exact structure:
{
  "passage": "A Hebrew passage of 200-300 words on an academic or general-interest topic. Use clear, formal Hebrew appropriate for the psychometric exam level.",
  "title": "A short Hebrew title for the passage (3-6 words)",
  "questions": [
    {
      "id": "q1",
      "text": "Question in Hebrew",
      "options": {
        "A": "Option A in Hebrew",
        "B": "Option B in Hebrew",
        "C": "Option C in Hebrew",
        "D": "Option D in Hebrew"
      },
      "correct": "B",
      "explanation": "Explanation in Hebrew (1-2 sentences) — why this is correct and the others are wrong"
    }
  ]
}

Generate exactly 5 questions. Question types should include:
- Main idea / central theme (רעיון מרכזי)
- Specific detail from the text (פרט ספציפי)
- Inference / implication (השלכה / מסקנה)
- Author's tone or purpose (גישת הכותב)
- Vocabulary in context (אוצר מילים בהקשר)

Make the passage and questions realistic and at actual psychometric exam difficulty.`,

  vocabulary: `Generate a psychometric exam vocabulary exercise in Hebrew.

Return a JSON object (no markdown, no code block) with this exact structure:
{
  "passage": null,
  "title": "אוצר מילים",
  "questions": [
    {
      "id": "q1",
      "text": "Question in Hebrew. Format: either 'מה המשמעות של המילה X?' or a sentence completion 'בחר את המילה המתאימה: _____' or a synonym question",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct": "A",
      "explanation": "Explanation in Hebrew (1-2 sentences)"
    }
  ]
}

Generate exactly 8 questions. Mix of:
- Find the correct meaning of a word (3 questions)
- Find the synonym (נרדף) (2 questions)
- Find the antonym (נגדי) (1 question)
- Complete the sentence with the right word (2 questions)

Use words that appear on the actual psychometric exam. Difficulty: intermediate to advanced Hebrew.`,

  grammar: `Generate a psychometric exam language errors exercise in Hebrew.

Return a JSON object (no markdown, no code block) with this exact structure:
{
  "passage": null,
  "title": "שגיאות בשפה",
  "questions": [
    {
      "id": "q1",
      "text": "A Hebrew sentence or short paragraph with one grammatical/usage error. Format: present the text, then ask 'איזו מילה/צורה שגויה?' or 'מה השגיאה במשפט?'",
      "options": {
        "A": "Option A — possible error or corrected version",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D — no error / the sentence is correct"
      },
      "correct": "B",
      "explanation": "Explanation in Hebrew of the grammatical rule and why this is the error"
    }
  ]
}

Generate exactly 6 questions. Types:
- Wrong verb conjugation (נטיית פועל) (2 questions)
- Wrong word choice (בחירת מילה) (2 questions)
- Wrong plural/possessive form (2 questions)

Make errors subtle and realistic — the kind that appear on the actual psychometric exam.`,
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
