/**
 * Feature flags — env-based for now, plug into GrowthBook later.
 * Set FF_<NAME>=false to disable any flag in production.
 * All flags default ON so the best experience ships by default.
 */
export const FLAGS = {
  // Core features
  FRUSTRATION_DETECTION : process.env.FF_FRUSTRATION_DETECTION  !== "false",
  AUTO_COMPACTION       : process.env.FF_AUTO_COMPACTION        !== "false",
  COURSE_CONTEXT        : process.env.FF_COURSE_CONTEXT         !== "false",
  PROMPT_CACHING        : process.env.FF_PROMPT_CACHING         !== "false",
  DREAM                 : process.env.FF_DREAM                  !== "false",
  STUDY_LOG             : process.env.FF_STUDY_LOG              !== "false",

  // RAG
  PARALLEL_RAG          : process.env.FF_PARALLEL_RAG           !== "false",
  MAILBOX_RAG           : process.env.FF_MAILBOX_RAG            !== "false", // multi-source parallel search

  // Session intelligence
  MOMENTUM_TRACKING     : process.env.FF_MOMENTUM_TRACKING      !== "false", // passive student detection → quiz mode

  // Upcoming (default OFF — dead code until flipped)
  EXAM_PREP_MODE        : process.env.FF_EXAM_PREP_MODE         === "true",
  MULTI_COURSE          : process.env.FF_MULTI_COURSE           === "true",
  PROFESSOR_STYLE       : process.env.FF_PROFESSOR_STYLE        === "true",
  MILUIM_MODE           : process.env.FF_MILUIM_MODE            === "true",
} as const;

export type FlagKey = keyof typeof FLAGS;

export function flag(key: FlagKey): boolean {
  return FLAGS[key];
}
