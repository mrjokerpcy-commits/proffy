// ─── Beta access codes ──────────────────────────────────────────────────────
// Codes live in BETA_ACCESS_CODES env var (comma-separated), never in source.
// Example: BETA_ACCESS_CODES="PROFFY2026,EARLYBIRD2026,INVITE2026"
// Verification happens server-side via /api/beta-verify — codes never reach the browser.

export const BETA_UNLOCK_KEY = "proffy_beta_v1";

// ─── Subdomain → site config ─────────────────────────────────────────────────
export type SubdomainKey = "app" | "psycho" | "yael" | "bagrut" | "root";

export interface SiteConfig {
  label: string;
  href: string;
  tagline: string;
  color: string; // for badges / links in the hub
}

export const SUBDOMAIN_SITES: Record<Exclude<SubdomainKey, "root">, SiteConfig> = {
  app: {
    label: "Uni by Proffy",
    href: "https://uni.proffy.study",
    tagline: "Your AI study companion",
    color: "#6366f1",
  },
  psycho: {
    label: "Psycho by Proffy",
    href: "https://psycho.proffy.study",
    tagline: "Psychometric exam prep, built to score",
    color: "#d4a017",
  },
  yael: {
    label: "Yael by Proffy",
    href: "https://yael.proffy.study",
    tagline: "Yael exam prep, warm and human",
    color: "#f59e0b",
  },
  bagrut: {
    label: "Bagrut by Proffy",
    href: "https://bagrut.proffy.study",
    tagline: "Bagrut exam prep, Gen Z edition",
    color: "#8b5cf6",
  },
};
