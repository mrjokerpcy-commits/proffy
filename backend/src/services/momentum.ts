/**
 * Session momentum tracking — adapted from Claude Code's "continue counter" telemetry.
 *
 * Tracks whether the student is actively engaged or passively reading.
 * If the student is passive (just typing "continue" / "next" repeatedly),
 * switch to interactive quiz mode — ask a question instead of explaining more.
 *
 * All state is per-session (in-memory). Nothing is persisted — momentum resets
 * when the session ends. For cross-session trends, see autoDream.
 */

export interface MomentumState {
  continueCount   : number;   // How often student says "next", "continue", "המשך", etc.
  messageTimes    : number[];  // Unix ms timestamps of student messages
  frustrationEvents: number;  // From frustration detection
  questionDepth   : "surface" | "medium" | "deep"; // Trend of question complexity
}

const PASSIVE_THRESHOLD_CONTINUE = 3;   // 3+ continue-type messages → passive
const PASSIVE_THRESHOLD_GAP_MS   = 45_000; // avg >45s between messages → passive

const CONTINUE_RE = /^\s*(continue|next|go on|ok|okay|sure|yes|yeah|hmm|uh|ok ok|המשך|הבא|כן|אוקיי|אוקי)\s*[.!]*\s*$/i;

const SURFACE_RE = /\b(what is|define|explain|what does|מה זה|הסבר)\b/i;
const DEEP_RE    = /\b(why|how does|derive|prove|intuition|what happens if|למה|כיצד|הוכח|תוכיח)\b/i;

/**
 * Update momentum state with a new student message.
 * Returns the updated state.
 */
export function updateMomentum(
  state  : MomentumState,
  message: string,
): MomentumState {
  const now = Date.now();

  const continueCount = CONTINUE_RE.test(message)
    ? state.continueCount + 1
    : Math.max(0, state.continueCount - 1); // engagement resets the counter

  const messageTimes = [...state.messageTimes, now].slice(-10); // keep last 10

  let questionDepth = state.questionDepth;
  if (DEEP_RE.test(message))    questionDepth = "deep";
  else if (SURFACE_RE.test(message)) questionDepth = "surface";

  return { ...state, continueCount, messageTimes, questionDepth };
}

/**
 * Returns true if the student appears passive and should be prompted
 * with a question instead of more explanation.
 */
export function isPassive(state: MomentumState): boolean {
  if (state.continueCount >= PASSIVE_THRESHOLD_CONTINUE) return true;

  if (state.messageTimes.length >= 3) {
    const gaps = state.messageTimes
      .slice(1)
      .map((t, i) => t - state.messageTimes[i]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avg > PASSIVE_THRESHOLD_GAP_MS) return true;
  }

  return false;
}

/**
 * Returns a system prompt addendum that switches the AI into quiz mode.
 * Called when isPassive() is true.
 */
export function getQuizModeAddendum(): string {
  return `

MOMENTUM ALERT: The student appears to be passively reading rather than actively engaging.
SWITCH TO INTERACTIVE MODE:
- Ask a specific question to check understanding before continuing
- Offer a short worked example and ask them to try the next step
- Phrase like: "Before we move on — can you tell me why X happens?" or "Try this: given Y, what would Z be?"
- Do NOT just keep explaining. Make them think.`;
}

/**
 * Create a fresh momentum state.
 */
export function createMomentumState(): MomentumState {
  return {
    continueCount    : 0,
    messageTimes     : [],
    frustrationEvents: 0,
    questionDepth    : "surface",
  };
}
