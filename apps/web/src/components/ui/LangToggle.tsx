"use client";
import { useEffect, useState } from "react";

export type Lang = "en" | "he";
export const LANG_KEY = "proffy_lang";

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (localStorage.getItem(LANG_KEY) as Lang) || "en";
    applyLang(stored);
    setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    applyLang(l);
    setLangState(l);
  };

  return [lang, setLang];
}

function applyLang(lang: Lang) {
  const html = document.documentElement;
  if (lang === "he") {
    html.setAttribute("lang", "he");
    html.setAttribute("dir", "rtl");
    html.style.fontFamily = "var(--font-noto-hebrew), system-ui, sans-serif";
  } else {
    html.setAttribute("lang", "en");
    html.setAttribute("dir", "ltr");
    html.style.fontFamily = "var(--font-inter), system-ui, sans-serif";
  }
}

export default function LangToggle({ className }: { className?: string }) {
  const [lang, setLang] = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setLang(lang === "en" ? "he" : "en")}
      className={className}
      title={lang === "en" ? "Switch to Hebrew" : "Switch to English"}
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
      {lang === "en" ? "עב" : "EN"}
    </button>
  );
}
