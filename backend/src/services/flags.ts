/**
 * Feature flags — env-based for now, plug into GrowthBook later.
 * Set FF_<NAME>=false to disable any flag in production.
 * All flags default ON so the best experience ships by default.
 */
export const FLAGS = {
  FRUSTRATION_DETECTION : process.env.FF_FRUSTRATION_DETECTION  !== "false",
  AUTO_COMPACTION       : process.env.FF_AUTO_COMPACTION        !== "false",
  COURSE_CONTEXT        : process.env.FF_COURSE_CONTEXT         !== "false",
  PROMPT_CACHING        : process.env.FF_PROMPT_CACHING         !== "false",
  DREAM                 : process.env.FF_DREAM                  !== "false",
  PARALLEL_RAG          : process.env.FF_PARALLEL_RAG           !== "false",
  STUDY_LOG             : process.env.FF_STUDY_LOG              !== "false",
} as const;

export type FlagKey = keyof typeof FLAGS;

export function flag(key: FlagKey): boolean {
  return FLAGS[key];
}
