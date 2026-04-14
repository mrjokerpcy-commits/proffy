/**
 * Three-layer context compression — based on the Claude Code leak architecture.
 *
 * Layer 1 — MicroCompact:  free, always running, trims inline (zero API calls)
 * Layer 2 — AutoCompact:   ~1 Haiku call, triggered near context limit
 * Layer 3 — FullCompact:   nuclear reset — called manually or when AutoCompact fails
 *
 * Circuit breaker: after MAX_FAILURES consecutive AutoCompact failures,
 * disable for the session (fail open). Prevents the 250K wasted-calls-per-day
 * bug found in Claude Code production.
 */
import Anthropic from "@anthropic-ai/sdk";

export type Message = { role: "user" | "assistant"; content: string };

/* ── Layer 1: MicroCompact — free, inline ────────────────────────────────── */

const MAX_CHARS_PER_MSG = 2000; // cap any single message
const MAX_REPEATED_REFS = 2;    // collapse if same source cited more than N times

export function microCompact(history: Message[]): Message[] {
  const sourceCounts: Record<string, number> = {};

  return history.map((msg) => {
    // Trim excessively long messages
    const trimmed = msg.content.length > MAX_CHARS_PER_MSG
      ? msg.content.slice(0, MAX_CHARS_PER_MSG) + " [trimmed]"
      : msg.content;

    // Collapse repeated source references in assistant messages
    if (msg.role === "assistant") {
      const sources = trimmed.match(/\[Source \d+:[^\]]+\]/g) ?? [];
      for (const src of sources) {
        sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
      }
    }

    return { ...msg, content: trimmed };
  });
}

/* ── Layer 2: AutoCompact — 1 Haiku call, triggered near limit ───────────── */

const AUTOCOMPACT_THRESHOLD = 20;  // messages before triggering
const KEEP_RECENT           = 6;   // always keep last N messages verbatim
const MAX_FAILURES          = 3;   // circuit breaker

let consecutiveFailures = 0;

export async function autoCompact(
  anthropic: Anthropic,
  history  : Message[],
): Promise<Message[]> {
  if (history.length <= AUTOCOMPACT_THRESHOLD) return history;
  if (consecutiveFailures >= MAX_FAILURES)     return history; // fail open

  const toCompress = history.slice(0, history.length - KEEP_RECENT);
  const recent     = history.slice(history.length - KEEP_RECENT);

  const transcript = toCompress
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 600)}`)
    .join("\n");

  try {
    const summary = await anthropic.messages.create({
      model     : "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages  : [{
        role   : "user",
        content: `Summarize this study session (earlier messages) into 4-6 bullet points:
- Topics and concepts covered
- Key formulas or facts established
- Student questions and confusions noted
- Student's apparent understanding level

Be factual and specific. No generic study tips.

TRANSCRIPT:
${transcript}`,
      }],
    });

    const text = summary.content[0]?.type === "text" ? summary.content[0].text : "";
    consecutiveFailures = 0;

    return [
      { role: "assistant", content: `[Session summary (earlier context):\n${text}\n]` },
      ...recent,
    ];
  } catch (err) {
    consecutiveFailures++;
    console.error(`[autoCompact] failure ${consecutiveFailures}/${MAX_FAILURES}:`, err);
    return history;
  }
}

/* ── Layer 3: FullCompact — nuclear reset ────────────────────────────────── */

/**
 * Called when AutoCompact is insufficient or manually triggered.
 * Compresses everything, then re-injects course context + active plan.
 * Resets the effective working budget to a clean state.
 */
export async function fullCompact(
  anthropic    : Anthropic,
  history      : Message[],
  courseContext: string | null,
  activePlan   : string | null,
): Promise<Message[]> {
  if (history.length === 0) return history;

  const transcript = history
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 800)}`)
    .join("\n");

  try {
    const summary = await anthropic.messages.create({
      model     : "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages  : [{
        role   : "user",
        content: `Compress this entire study session into a structured summary:

1. Topics covered (with key facts/formulas)
2. Student questions and how they were resolved
3. Student's current understanding level
4. What was NOT yet covered
5. Any open questions or confusions

Be specific and factual.

TRANSCRIPT:
${transcript}`,
      }],
    });

    const text = summary.content[0]?.type === "text" ? summary.content[0].text : "";

    const reinjected: Message[] = [];

    if (courseContext) {
      reinjected.push({
        role   : "assistant",
        content: `[Course background knowledge:\n${courseContext}\n]`,
      });
    }

    reinjected.push({
      role   : "assistant",
      content: `[Full session compressed:\n${text}\n]`,
    });

    if (activePlan) {
      reinjected.push({
        role   : "assistant",
        content: `[Active study plan:\n${activePlan}\n]`,
      });
    }

    consecutiveFailures = 0;
    return reinjected;

  } catch (err) {
    console.error("[fullCompact] failed:", err);
    return history; // fail open
  }
}

/* ── Convenience wrapper — apply all layers in order ────────────────────── */

export async function compactHistory(
  anthropic: Anthropic,
  history  : Message[],
): Promise<Message[]> {
  const micro = microCompact(history);
  return autoCompact(anthropic, micro);
}
