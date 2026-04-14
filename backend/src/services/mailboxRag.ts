/**
 * Mailbox parallel RAG — inspired by the Claude Code multi-agent mailbox pattern.
 *
 * Instead of one Qdrant query, we fire three simultaneously:
 *   Worker A → lecture slides / notes
 *   Worker B → past exam solutions
 *   Worker C → textbook / general material
 *
 * All results arrive in a "mailbox". The coordinator (this function) evaluates
 * source quality and returns a ranked, deduplicated context string.
 *
 * Cost: same as one sequential search (parallel I/O, not extra API calls).
 */
import { QdrantClient } from "@qdrant/js-client-rest";

export interface RagChunk {
  text     : string;
  filename : string;
  type     : string;
  professor: string;
  score    : number;
  source   : "slides" | "exam" | "textbook" | "general";
}

interface SearchSpec {
  source: RagChunk["source"];
  typeValues: string[];
}

const SOURCE_SPECS: SearchSpec[] = [
  { source: "slides",   typeValues: ["lecture", "slides", "presentation", "notes"] },
  { source: "exam",     typeValues: ["exam", "quiz", "test", "midterm", "final", "solution"] },
  { source: "textbook", typeValues: ["textbook", "book", "chapter", "reading"] },
];

/**
 * Run three parallel Qdrant searches (slides, exams, textbook),
 * then rank and deduplicate results.
 */
export async function mailboxSearch(
  qdrant      : QdrantClient,
  queryVector : number[],
  baseFilter  : Record<string, string>,  // { university, course, ... }
  collectionName = "studyai_chunks",
): Promise<RagChunk[]> {
  // Build a filter condition array from baseFilter
  const baseMust = Object.entries(baseFilter)
    .filter(([, v]) => v)
    .map(([k, v]) => ({ key: k, match: { value: v } }));

  // Fire all three workers in parallel — mailbox pattern
  const workerResults = await Promise.allSettled(
    SOURCE_SPECS.map(async ({ source, typeValues }) => {
      const filter = {
        must: [
          ...baseMust,
          { key: "type", match: { any: typeValues } },
        ],
      };

      const hits = await qdrant.search(collectionName, {
        vector      : queryVector,
        limit       : 4,
        filter      : filter.must.length > 0 ? filter : undefined,
        with_payload: true,
      });

      return hits.map((hit) => {
        const p = hit.payload as Record<string, string>;
        return {
          text     : p.text     ?? "",
          filename : p.filename ?? "",
          type     : p.type     ?? "",
          professor: p.professor ?? "",
          score    : hit.score,
          source,
        } satisfies RagChunk;
      });
    }),
  );

  // General fallback — catches anything not matched by type filters
  const generalResult = await qdrant.search(collectionName, {
    vector      : queryVector,
    limit       : 4,
    filter      : baseMust.length > 0 ? { must: baseMust } : undefined,
    with_payload: true,
  });

  const general: RagChunk[] = generalResult.map((hit) => {
    const p = hit.payload as Record<string, string>;
    return {
      text     : p.text     ?? "",
      filename : p.filename ?? "",
      type     : p.type     ?? "",
      professor: p.professor ?? "",
      score    : hit.score,
      source   : "general" as const,
    };
  });

  // Collect successful worker results
  const allChunks: RagChunk[] = [];
  for (const result of workerResults) {
    if (result.status === "fulfilled") allChunks.push(...result.value);
  }
  allChunks.push(...general);

  // Coordinator: deduplicate by text fingerprint, keep highest score per chunk
  const seen   = new Set<string>();
  const ranked : RagChunk[] = [];

  // Sort: exam solutions first (high study value), then slides, then textbook, then general
  const ORDER: Record<RagChunk["source"], number> = {
    exam    : 0,
    slides  : 1,
    textbook: 2,
    general : 3,
  };

  allChunks
    .sort((a, b) => b.score - a.score || ORDER[a.source] - ORDER[b.source])
    .forEach((chunk) => {
      // Fingerprint: first 80 chars of text (catches duplicates across workers)
      const fp = chunk.text.slice(0, 80).trim();
      if (!seen.has(fp) && chunk.text.length > 20) {
        seen.add(fp);
        ranked.push(chunk);
      }
    });

  // Return top 8 after deduplication
  return ranked.slice(0, 8);
}

/**
 * Format mailbox results into a context string with source labels.
 */
export function formatMailboxContext(chunks: RagChunk[]): {
  context: string;
  sources: Array<{ filename: string; type: string; professor: string; score: number; source: string }>;
} {
  const context = chunks
    .map((chunk, i) => {
      const label = [chunk.filename, chunk.type, chunk.professor].filter(Boolean).join(" · ");
      const badge = chunk.source !== "general" ? ` [${chunk.source.toUpperCase()}]` : "";
      return `[Source ${i + 1}: ${label}${badge}]\n${chunk.text}`;
    })
    .join("\n\n---\n\n");

  const sources = chunks.map((c) => ({
    filename : c.filename,
    type     : c.type,
    professor: c.professor,
    score    : c.score,
    source   : c.source,
  }));

  return { context, sources };
}
