import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { requireAdmin } from "@/lib/admin-auth";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}),
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "placeholder" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "placeholder" });

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req);
  if (deny) return deny;

  const { question, university, course, withAnswer = true } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "question required" }, { status: 400 });

  // 1. Embed the question
  let vector: number[];
  try {
    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });
    vector = embRes.data[0].embedding;
  } catch (e: any) {
    return NextResponse.json({ error: `Embedding failed: ${e.message}` }, { status: 500 });
  }

  // 2. Build filter — only indexed fields (strict mode)
  const must: object[] = [{ key: "is_shared", match: { value: true } }];
  if (university) must.push({ key: "university", match: { value: university } });

  // 3. Search Qdrant
  let hits: any[] = [];
  try {
    hits = await qdrant.search("studyai_chunks", {
      vector,
      limit: 8,
      filter: { must },
      with_payload: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Qdrant search failed: ${e.message}` }, { status: 500 });
  }

  const chunks = hits.map(h => ({
    id: h.id,
    score: Math.round(h.score * 1000) / 1000,
    filename: h.payload?.filename,
    course: h.payload?.course,
    university: h.payload?.university,
    type: h.payload?.type,
    trust_level: h.payload?.trust_level,
    chunk_index: h.payload?.chunk_index,
    text: h.payload?.text,
  }));

  if (!withAnswer) {
    return NextResponse.json({ chunks });
  }

  // 4. Build context and ask Claude
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.filename} · ${c.course} · ${c.university}]\n${c.text}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are Proffy, an AI study companion for every student.
Answer the following question based on the course material provided below.
If the material is in Hebrew, answer in Hebrew. If in English, answer in English.
Be precise, informative, and student-focused. Use LaTeX for math ($...$).

${chunks.length > 0 ? `Course material (${chunks.length} relevant chunks found):\n\n${context}` : "No course material found for this question."}`;

  let answer = "";
  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    });
    answer = res.content.filter(b => b.type === "text").map(b => (b as any).text).join("").trim();
  } catch (e: any) {
    answer = `Claude error: ${e.message}`;
  }

  return NextResponse.json({ chunks, answer });
}
