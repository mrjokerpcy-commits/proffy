"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const ACCENT = "#f59e0b";
const ACCENT_RGB = "245,158,11";

interface Progress {
  section: string;
  total_questions: number;
  correct_answers: number;
  sessions_done: number;
  last_practiced_at: string | null;
}

interface RecentSession {
  id: string;
  section: string;
  score: number;
  total: number;
  duration_seconds: number | null;
  created_at: string;
}

interface Props {
  firstName: string;
  progress: Progress[];
  recentSessions: RecentSession[];
}

const SECTION_META = {
  reading: {
    icon: "📄",
    labelEn: "Reading Comprehension",
    labelHe: "הבנת הנקרא",
    descEn: "Read a Hebrew passage and answer questions about its meaning, structure, and vocabulary in context.",
    descHe: "קרא קטע בעברית וענה על שאלות על משמעותו, מבנהו, ואוצר מילים בהקשר.",
    color: "#4f8ef7",
    colorRgb: "79,142,247",
  },
  vocabulary: {
    icon: "📚",
    labelEn: "Vocabulary",
    labelHe: "אוצר מילים",
    descEn: "Find synonyms, meanings, and complete sentences with the right word.",
    descHe: "מצא מילים נרדפות, משמעויות, והשלם משפטים עם המילה המתאימה.",
    color: ACCENT,
    colorRgb: ACCENT_RGB,
  },
  grammar: {
    icon: "✍️",
    labelEn: "Language Errors",
    labelHe: "שגיאות בשפה",
    descEn: "Identify grammatical errors and incorrect usage in Hebrew sentences.",
    descHe: "זהה שגיאות דקדוקיות ושימוש שגוי במשפטים בעברית.",
    color: "#a78bfa",
    colorRgb: "167,139,250",
  },
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function pct(correct: number, total: number) {
  if (total === 0) return null;
  return Math.round((correct / total) * 100);
}

export default function YaelDashboardClient({ firstName, progress, recentSessions }: Props) {
  const router = useRouter();
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const stored = localStorage.getItem("proffy_lang") ?? "en";
    setLang(stored);
    const onLang = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener("proffy-lang", onLang);
    return () => window.removeEventListener("proffy-lang", onLang);
  }, []);

  const isRTL = lang === "he" || lang === "ar";
  const progressMap: Record<string, Progress> = {};
  for (const p of progress) progressMap[p.section] = p;

  const totalDone = progress.reduce((s, p) => s + p.sessions_done, 0);
  const totalCorrect = progress.reduce((s, p) => s + p.correct_answers, 0);
  const totalAttempted = progress.reduce((s, p) => s + p.total_questions, 0);
  const overallPct = pct(totalCorrect, totalAttempted);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12
    ? (lang === "he" ? "בוקר טוב" : "Good morning")
    : greetingHour < 18
    ? (lang === "he" ? "צהריים טובים" : "Good afternoon")
    : (lang === "he" ? "ערב טוב" : "Good evening");

  return (
    <div style={{
      maxWidth: "900px", margin: "0 auto", padding: "clamp(20px, 4vw, 48px) clamp(16px, 3vw, 32px)",
      direction: isRTL ? "rtl" : "ltr",
    }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: "36px" }}
      >
        <h1 style={{
          fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800,
          letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "6px",
        }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-muted)" }}>
          {lang === "he"
            ? "בחר חלק לתרגול — הכנה חכמה לבחינת יע״ל"
            : "Choose a section to practice — smart prep for the Yael exam"}
        </p>
      </motion.div>

      {/* ── Overall stats bar ── */}
      {totalDone > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px",
            marginBottom: "32px",
          }}
        >
          {[
            { label: lang === "he" ? "תרגולים" : "Sessions", value: totalDone },
            { label: lang === "he" ? "שאלות" : "Questions", value: totalAttempted },
            { label: lang === "he" ? "דיוק" : "Accuracy", value: overallPct !== null ? `${overallPct}%` : "—" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "12px", padding: "16px 20px", textAlign: "center",
            }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Section cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "40px" }}>
        {(["reading", "vocabulary", "grammar"] as const).map((section, i) => {
          const meta = SECTION_META[section];
          const p = progressMap[section];
          const accuracy = p ? pct(p.correct_answers, p.total_questions) : null;
          return (
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 + i * 0.06 }}
              style={{
                background: "var(--bg-surface)",
                border: `1px solid var(--border)`,
                borderRadius: "16px", overflow: "hidden",
                display: "flex", flexDirection: "column",
                transition: "box-shadow 0.15s, border-color 0.15s",
                cursor: "default",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px rgba(${meta.colorRgb},0.18)`;
                (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${meta.colorRgb},0.4)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
              }}
            >
              {/* Accent top bar */}
              <div style={{ height: "3px", background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)` }} />

              <div style={{ padding: "22px 22px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Icon + title */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
                    background: `rgba(${meta.colorRgb},0.1)`,
                    border: `1px solid rgba(${meta.colorRgb},0.2)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "20px",
                  }}>
                    {meta.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", marginBottom: "2px" }}>
                      {lang === "he" ? meta.labelHe : meta.labelEn}
                    </div>
                    {p && p.sessions_done > 0 ? (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {lang === "he"
                          ? `${p.sessions_done} תרגולים · דיוק ${accuracy}%`
                          : `${p.sessions_done} sessions · ${accuracy}% accuracy`}
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {lang === "he" ? "לא תורגל עדיין" : "Not practiced yet"}
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, flex: 1, marginBottom: "16px" }}>
                  {lang === "he" ? meta.descHe : meta.descEn}
                </p>

                {/* Progress bar */}
                {p && p.total_questions > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ height: "4px", background: "var(--bg-elevated)", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: "99px",
                        width: `${accuracy}%`,
                        background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => router.push(`/yael/practice?section=${section}`)}
                  style={{
                    padding: "10px 0", borderRadius: "10px", fontSize: "14px", fontWeight: 700,
                    background: `rgba(${meta.colorRgb},0.12)`,
                    border: `1px solid rgba(${meta.colorRgb},0.25)`,
                    color: meta.color, cursor: "pointer",
                    transition: "background 0.12s, border-color 0.12s",
                    width: "100%",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = `rgba(${meta.colorRgb},0.2)`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = `rgba(${meta.colorRgb},0.12)`;
                  }}
                >
                  {lang === "he"
                    ? (p && p.sessions_done > 0 ? "התחל תרגול חדש" : "התחל תרגול")
                    : (p && p.sessions_done > 0 ? "Start new session" : "Start practicing")}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Recent sessions ── */}
      {recentSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
        >
          <h2 style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>
            {lang === "he" ? "תרגולים אחרונים" : "Recent sessions"}
          </h2>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            {recentSessions.map((s, i) => {
              const meta = SECTION_META[s.section as keyof typeof SECTION_META];
              const score_pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "12px 18px",
                    borderBottom: i < recentSessions.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "9px", flexShrink: 0,
                    background: `rgba(${meta?.colorRgb ?? ACCENT_RGB},0.1)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "15px",
                  }}>
                    {meta?.icon ?? "📝"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {lang === "he" ? (meta?.labelHe ?? s.section) : (meta?.labelEn ?? s.section)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {timeAgo(s.created_at)}
                      {s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)}min` : ""}
                    </div>
                  </div>
                  <div style={{
                    fontSize: "13px", fontWeight: 700,
                    color: score_pct >= 70 ? "var(--green)" : score_pct >= 40 ? ACCENT : "var(--red)",
                  }}>
                    {s.score}/{s.total}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
