import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { requireAdmin } from "@/lib/admin-auth";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}),
});

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req);
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const offset = searchParams.get("offset") ?? undefined;
  const university = searchParams.get("university") ?? undefined;
  const course = searchParams.get("course") ?? undefined;

  try {
    // Build filter
    const must: object[] = [];
    if (university) must.push({ key: "university", match: { value: university } });
    if (course) must.push({ key: "course", match: { text: course } });

    const result = await qdrant.scroll("studyai_chunks", {
      limit: 20,
      offset: offset ? Number(offset) : undefined,
      filter: must.length > 0 ? { must } : undefined,
      with_payload: true,
      with_vector: false,
    });

    // Get collection info for total count
    const info = await qdrant.getCollection("studyai_chunks").catch(() => null);
    const total = info?.points_count ?? 0;

    return NextResponse.json({
      points: result.points,
      next_offset: result.next_page_offset ?? null,
      total,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Qdrant error", points: [], total: 0 }, { status: 500 });
  }
}
