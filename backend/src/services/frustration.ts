/**
 * Frustration detection — port of userPromptKeywords.ts from the Claude Code leak.
 * A regex is faster and cheaper than an inference call just to check if someone is
 * struggling. Extended with Hebrew terms for Israeli students.
 */

const FRUSTRATION_RE =
  /\b(wtf|wth|ffs|omfg|shit(ty|tiest)?|dumbass|horrible|awful|piss(ed|ing)?\s+off|piece\s+of\s+(shit|crap|junk)|what\s+the\s+(fuck|hell)|fuck(ing)?\s+(broken|useless|terrible|awful|horrible)|fuck\s+you|screw\s+(this|you)|so\s+frustrating|this\s+sucks|damn\s+it|i\s+give\s+up|makes\s+no\s+sense|i\s+don'?t\s+(understand|get\s+it))\b|לא\s+מבין|לא\s+מבינה|לא\s+עוזר|שטויות|חרא|זבל|לא\s+מצליח|לא\s+מצליחה|לא\s+מבין\s+כלום|בכלל\s+לא\s+עוזר/i;

export function detectFrustration(text: string): boolean {
  return FRUSTRATION_RE.test(text);
}

export function getFrustratedSystemAddendum(): string {
  return `

STUDENT STATE: The student appears frustrated or confused.
- Respond with extra patience and warmth
- Break your answer into smaller, clearer steps
- Start with something reassuring (briefly — don't overdo it)
- Simplify language — no jargon unless necessary
- If they seem stuck on a concept, try a different angle or analogy`;
}
