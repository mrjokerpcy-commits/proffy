// ─── Beta access codes ──────────────────────────────────────────────────────
// Add / remove codes here. Checked client-side (uppercased, trimmed).
export const BETA_ACCESS_CODES: readonly string[] = [
  "PROFFY2024",
  "EARLYBIRD",
  "INVITE2024",
  "PROFFY-BETA",
  "PROFFYVIP",
];

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
    label: "Proffy App",
    href: "https://app.proffy.study",
    tagline: "Your AI study companion",
    color: "#6366f1",
  },
  psycho: {
    label: "Proffy Psycho",
    href: "https://psycho.proffy.study",
    tagline: "Psychology studies, elevated",
    color: "#d4a017",
  },
  yael: {
    label: "Proffy × Yael",
    href: "https://yael.proffy.study",
    tagline: "Hebrew-first, human tutoring",
    color: "#f59e0b",
  },
  bagrut: {
    label: "Proffy Bagrut",
    href: "https://bagrut.proffy.study",
    tagline: "Bagrut exam prep — Gen Z edition",
    color: "#8b5cf6",
  },
};
