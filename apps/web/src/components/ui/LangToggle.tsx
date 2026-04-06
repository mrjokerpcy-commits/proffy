"use client";
import { useEffect, useState } from "react";

export type Lang = "en" | "he" | "ar";
export const LANG_KEY = "proffy_lang";

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (localStorage.getItem(LANG_KEY) as Lang) || "en";
    applyLang(stored);
    setLangState(stored);

    const handler = (e: Event) => {
      const l = (e as CustomEvent<Lang>).detail;
      applyLang(l);
      setLangState(l);
    };
    window.addEventListener("proffy-lang", handler);
    return () => window.removeEventListener("proffy-lang", handler);
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    applyLang(l);
    setLangState(l);
    window.dispatchEvent(new CustomEvent<Lang>("proffy-lang", { detail: l }));
  };

  return [lang, setLang];
}

function applyLang(lang: Lang) {
  const html = document.documentElement;
  if (lang === "he") {
    html.setAttribute("lang", "he");
    html.setAttribute("dir", "rtl");
    html.style.fontFamily = "var(--font-noto-hebrew), system-ui, sans-serif";
  } else if (lang === "ar") {
    html.setAttribute("lang", "ar");
    html.setAttribute("dir", "rtl");
    html.style.fontFamily = "'Segoe UI', 'Arial Unicode MS', system-ui, sans-serif";
  } else {
    html.setAttribute("lang", "en");
    html.setAttribute("dir", "ltr");
    html.style.fontFamily = "var(--font-inter), system-ui, sans-serif";
  }
}

const CYCLE: Record<Lang, Lang> = { en: "he", he: "ar", ar: "en" };
const LABEL: Record<Lang, string> = { en: "עב", he: "عر", ar: "EN" };
const TITLE: Record<Lang, string> = { en: "Switch to Hebrew", he: "Switch to Arabic", ar: "Switch to English" };

export default function LangToggle({ className }: { className?: string }) {
  const [lang, setLang] = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setLang(CYCLE[lang])}
      className={className}
      title={TITLE[lang]}
      style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: "6px 12px", borderRadius: "8px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        fontSize: "12px", fontWeight: 600, cursor: "pointer",
        transition: "border-color 0.15s, color 0.15s",
        letterSpacing: "0.03em",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
    >
      {LABEL[lang]}
    </button>
  );
}
