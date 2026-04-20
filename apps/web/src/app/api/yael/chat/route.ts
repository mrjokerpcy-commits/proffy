import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystem(lang: string): string {
  const langInstructions: Record<string, string> = {
    he: `ענה תמיד בעברית. היה סבלני, ברור ומעודד.`,
    ar: `أجب دائماً بالعربية. كن صبوراً وواضحاً ومشجعاً.`,
    en: `Always answer in English. Be patient, clear, and encouraging.`,
    ru: `Всегда отвечай на русском языке. Будь терпеливым, ясным и ободряющим.`,
    am: `Always answer in Amharic. Be patient, clear, and encouraging.`,
  };

  const responseInstruction = langInstructions[lang] ?? langInstructions.en;

  return `You are an expert Yael exam tutor (ידע בעברית לאקדמיה — Hebrew Academic Knowledge).

The exam has three sections:
• Reading Comprehension (הבנת הנקרא) — read a Hebrew passage and answer questions
• Sentence Completion (השלמת משפטים) — choose the word or phrase that best fills a gap
• Reformulation (ניסוח מחדש) — choose the option that expresses exactly the same meaning

When a student answers incorrectly, do the following:
1. Explain clearly why their choice was wrong
2. Explain why the correct answer is right
3. Teach the relevant rule (grammar / vocabulary / style / logic)
4. Give one additional example to reinforce
5. Offer brief encouragement

When a student asks a question, answer clearly, concisely, and precisely.

IMPORTANT: ${responseInstruction}
Even though the exam questions are in Hebrew, you must explain and teach in the student's language above.`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  let body: { messages: { role: "user" | "assistant"; content: string }[]; context?: string; lang?: string };
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }

  const { messages, context, lang = "en" } = body;
  if (!messages?.length) return new Response("messages required", { status: 400 });

  const system = buildSystem(lang);
  const systemPrompt = context ? `${system}\n\n---\nCurrent lesson context:\n${context}` : system;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
          }
        }
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
