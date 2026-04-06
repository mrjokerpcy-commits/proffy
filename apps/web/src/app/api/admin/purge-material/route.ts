import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { Pool } from "pg";
import { requireAdmin } from "@/lib/admin-auth";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}),
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const COLLECTION = "studyai_chunks";

/**
 * DELETE /api/admin/purge-material
 *
 * Wipes all shared platform material:
 *  - Deletes all Qdrant points where is_shared = true
 *  - Truncates material_queue table
 *  - Leaves user-uploaded private content untouched
 *
 * Requires x-purge-code header matching PURGE_CONFIRM_CODE env var.
 * Pass ?mode=all to also wipe private user uploads (nuclear option).
 */
export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin(req);
  if (deny) return deny;

  // Secondary confirm code — must be set in env and passed as header
  const purgeCode = process.env.PURGE_CONFIRM_CODE;
  if (!purgeCode) {
    return NextResponse.json({ error: "PURGE_CONFIRM_CODE not configured on server." }, { status: 500 });
  }
  if (req.headers.get("x-purge-code") !== purgeCode) {
    return NextResponse.json({ error: "Invalid purge confirmation code." }, { status: 403 });
  }

  const mode = new URL(req.url).searchParams.get("mode");
  const nukeAll = mode === "all";

  const results: Record<string, unknown> = {};

  // ── 1. Delete Qdrant points ─────────────────────────────────────────────────
  try {
    if (nukeAll) {
      // Delete entire collection and recreate it
      await qdrant.deleteCollection(COLLECTION).catch(() => {});
      await qdrant.createCollection(COLLECTION, {
        vectors: { size: 1536, distance: "Cosine" },
      });
      // Recreate payload indexes
      await Promise.allSettled([
        qdrant.createPayloadIndex(COLLECTION, { field_name: "user_id",       field_schema: "keyword" }),
        qdrant.createPayloadIndex(COLLECTION, { field_name: "course_id",     field_schema: "keyword" }),
        qdrant.createPayloadIndex(COLLECTION, { field_name: "university",    field_schema: "keyword" }),
        qdrant.createPayloadIndex(COLLECTION, { field_name: "type",          field_schema: "keyword" }),
        qdrant.createPayloadIndex(COLLECTION, { field_name: "is_shared",     field_schema: "bool" }),
      ]);
      results.qdrant = "collection wiped and recreated";
    } else {
      // Delete only shared points
      const deleteResult = await qdrant.delete(COLLECTION, {
        filter: {
          must: [{ key: "is_shared", match: { value: true } }],
        },
      });
      results.qdrant = deleteResult;
    }
  } catch (err: any) {
    results.qdrant_error = err?.message ?? String(err);
  }

  // ── 2. Clear material_queue ─────────────────────────────────────────────────
  try {
    if (nukeAll) {
      await pool.query("TRUNCATE TABLE material_queue");
      results.material_queue = "truncated";
    } else {
      // Only remove completed or pending shared jobs (keep failed for audit)
      const { rowCount } = await pool.query(
        "DELETE FROM material_queue WHERE status IN ('done', 'pending', 'processing')"
      );
      results.material_queue = `${rowCount} rows deleted`;
    }
  } catch (err: any) {
    results.material_queue_error = err?.message ?? String(err);
  }

  // ── 3. Clear ingested file hashes (if table exists) ────────────────────────
  try {
    await pool.query("TRUNCATE TABLE ingested_files").catch(() => {});
    results.ingested_files = "cleared (if existed)";
  } catch {
    results.ingested_files = "skipped";
  }

  return NextResponse.json({ ok: true, mode: nukeAll ? "all" : "shared", ...results });
}
