/**
 * Auto-compaction — based on autoCompact.ts from the Claude Code leak.
 * When a chat session grows long, compress the oldest messages into a summary
 * using Haiku (cheap + fast), keeping only the recent tail intact.
 *
 * This prevents context entropy: long sessions where the model loses track of
 * earlier material.
 */
import Anthropic from "@anthropic-ai/sdk";

const MAX_BEFORE_COMPACT = 20; // trigger compaction above this many messages
const KEEP_RECENT        = 6;  // always keep last N messages verbatim
const MAX_FAILURES       = 3;  // stop retrying after this many consecutive failures

let consecutiveFailures = 0;

export type Message = { role: "user" | "assistant"; content: string };

export async function compactHistory(
  anthropic: Anthropic,
  history: Message[]
): Promise<Message[]> {
  if (history.length <= MAX_BEFORE_COMPACT) return history;
  if (consecutiveFailures >= MAX_FAILURES)  return history; // fail open

  const toCompress = history.slice(0, history.length - KEEP_RECENT);
  const recent     = history.slice(history.length - KEEP_RECENT);

  const transcript = toCompress
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  try {
    const summary = await anthropic.messages.create({
      model     : "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages  : [{
        role   : "user",
        content: `You are summarizing an earlier part of a student study session.
Produce 4-6 bullet points covering:
- Topics and concepts discussed
- Key formulas or facts established
- Questions the student asked
- Any confusion or misunderstandings noted

Keep it factual and concise. This summary will be prepended to the ongoing session.

TRANSCRIPT:
${transcript}`,
      }],
    });

    const summaryText =
      summary.content[0]?.type === "text" ? summary.content[0].text : "";

    consecutiveFailures = 0;

    return [
      {
        role   : "assistant",
        content: `[Earlier in this session — auto-summary:\n${summaryText}\n]`,
      },
      ...recent,
    ];
  } catch (err) {
    consecutiveFailures++;
    console.error("[compaction] Failed to compact history:", err);
    return history; // fail open — never break a chat over compaction
  }
}
