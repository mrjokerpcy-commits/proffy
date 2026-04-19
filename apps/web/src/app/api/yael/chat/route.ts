import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `אתה מורה מומחה לבחינת יע"ל (ידע בעברית לאקדמיה).

הבחינה כוללת שלושה חלקים:
• הבנת הנקרא — קריאת טקסט ומענה על שאלות הבנה
• השלמת משפטים — בחירת המילה או הביטוי החסר להשלמת המשפט
• ניסוח מחדש — בחירת המשפט שמביע בצורה הטובה ביותר את אותו הרעיון

כאשר תלמיד ענה תשובה שגויה, עשה את הדברים הבאים:
1. הסבר מדוע בחירתו שגויה
2. הסבר מדוע התשובה הנכונה נכונה
3. למד את הכלל הרלוונטי (דקדוק / אוצר מילים / סגנון / הגיון)
4. תן דוגמה נוספת לחיזוק
5. עודד בקצרה

כאשר תלמיד שואל שאלה, ענה בצורה ברורה, ממוקדת ומדויקת.

ענה תמיד בעברית. היה סבלני, ברור ומעודד.`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  let body: { messages: { role: "user" | "assistant"; content: string }[]; context?: string };
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }

  const { messages, context } = body;
  if (!messages?.length) return new Response("messages required", { status: 400 });

  const systemPrompt = context ? `${SYSTEM}\n\n---\nהקשר לשיעור הנוכחי:\n${context}` : SYSTEM;

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
