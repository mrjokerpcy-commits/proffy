"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
    descEn: "Read an academic Hebrew passage and answer comprehension questions on meaning, structure, and vocabulary in context.",
    descHe: "קרא קטע אקדמי בעברית וענה על שאלות הבנה על משמעות, מבנה ואוצר מילים בהקשר.",
    questionsEn: "5 questions per session",
    questionsHe: "5 שאלות לכל תרגול",
    color: "#4f8ef7",
    colorRgb: "79,142,247",
  },
  completion: {
    icon: "✏️",
    labelEn: "Sentence Completion",
    labelHe: "השלמת משפטים",
    descEn: "Choose the word or phrase that best completes an incomplete sentence. Tests prepositions, conjunctions, and vocabulary.",
    descHe: "בחר את המילה או הביטוי המשלים בצורה הטובה ביותר משפט חסר. בוחן מילות יחס, קישור ואוצר מילים.",
    questionsEn: "8 questions per session",
    questionsHe: "8 שאלות לכל תרגול",
    color: ACCENT,
    colorRgb: ACCENT_RGB,
  },
  reformulation: {
    icon: "🔄",
    labelEn: "Reformulation",
    labelHe: "ניסוח מחדש",
    descEn: "Given a Hebrew sentence, choose which option expresses exactly the same meaning using different wording.",
    descHe: "לאחר קריאת משפט בעברית, בחר איזו אפשרות מביעה בצורה הטובה ביותר את אותו הרעיון.",
    questionsEn: "6 questions per session",
    questionsHe: "6 שאלות לכל תרגול",
    color: "#a78bfa",
    colorRgb: "167,139,250",
  },
};

const EXAM_SECTIONS = [
  { icon: "📄", titleHe: "הבנת הנקרא",   titleEn: "Reading Comprehension", descHe: "קריאת טקסט ומענה על שאלות הבנה",              descEn: "Read a passage and answer comprehension questions",     color: "#4f8ef7" },
  { icon: "✏️", titleHe: "השלמת משפטים", titleEn: "Sentence Completion",   descHe: "בחירת המילה החסרה להשלמת המשפט",               descEn: "Choose the missing word to complete the sentence",      color: ACCENT },
  { icon: "🔄", titleHe: "ניסוח מחדש",   titleEn: "Reformulation",         descHe: "בחירת המשפט המביע את אותו הרעיון בניסוח אחר", descEn: "Find the sentence that expresses the same idea differently", color: "#a78bfa" },
  { icon: "📝", titleHe: "כתיבת חיבור",  titleEn: "Essay Writing",         descHe: "חיבור עיוני 12–15 שורות על נושא נתון",         descEn: "Write a 12–15 line analytical essay on a given topic",  color: "#34d399" },
];

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
  const [examInfoOpen, setExamInfoOpen] = useState(false);

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
    <div style={{ maxWidth: "920px", margin: "0 auto", padding: "clamp(20px, 4vw, 48px) clamp(16px, 3vw, 32px)", direction: isRTL ? "rtl" : "ltr" }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "6px" }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-muted)" }}>
          {lang === "he" ? 'הכנה חכמה לבחינת יע"ל — ידע בעברית לאקדמיה' : 'Smart preparation for the Yael Hebrew proficiency exam'}
        </p>
      </motion.div>

      {/* ── Exam info card ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.04 }} style={{ marginBottom: "28px" }}>
        <div style={{ background: "var(--bg-surface)", border: `1px solid rgba(${ACCENT_RGB},0.25)`, borderRadius: "16px", overflow: "hidden" }}>
          {/* Top accent */}
          <div style={{ height: "3px", background: `linear-gradient(90deg, ${ACCENT}, #d97706)` }} />

          <div style={{ padding: "20px 24px" }}>
            {/* Clickable header */}
            <button
              onClick={() => setExamInfoOpen(v => !v)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: isRTL ? "right" : "left" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: `rgba(${ACCENT_RGB},0.12)`, border: `1px solid rgba(${ACCENT_RGB},0.25)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                  📋
                </div>
                <div style={{ textAlign: isRTL ? "right" : "left" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {lang === "he" ? 'מה זה בחינת יע"ל?' : 'What is the Yael Exam?'}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {lang === "he" ? 'ציון 50–150 · ~90 דקות · 4 מרכיבים' : 'Score 50–150 · ~90 minutes · 4 components'}
                  </div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink: 0, transform: examInfoOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Expandable content */}
            <AnimatePresence>
              {examInfoOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ marginTop: "20px" }}>
                    {/* Description */}
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "20px", fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right" }}>
                      {lang === "he"
                        ? 'בחינת יע"ל (ידע בעברית לאקדמיה) היא בחינת אקדמי הנועדה לבדוק רמת שליטה בעברית לצורך לימודים אקדמיים. הציון נע בין 50 ל-150, ומשמש אוניברסיטאות לקביעת רמת הסטודנט. הבחינה אורכת כשעה וחצי ומחולקת לחלק סגור (שאלות אמריקאיות) וחלק פתוח (חיבור).'
                        : 'The Yael exam (Hebrew Academic Knowledge) tests Hebrew language proficiency for academic studies. Scores range from 50 to 150 and are used by universities to assess student level. The exam lasts about 90 minutes and is divided into a closed section (multiple-choice) and an open section (essay writing).'}
                    </p>

                    {/* Sections grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                      {EXAM_SECTIONS.map((s, i) => (
                        <div key={i} style={{ padding: "14px", borderRadius: "12px", background: "var(--bg-elevated)", border: `1px solid var(--border)` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "18px" }}>{s.icon}</span>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                            <span style={{ fontSize: "12px", fontWeight: 700, color: s.color }}>{lang === "he" ? s.titleHe : s.titleEn}</span>
                          </div>
                          <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.55, margin: 0, fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right" }}>
                            {lang === "he" ? s.descHe : s.descEn}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Tips */}
                    <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "12px", background: `rgba(${ACCENT_RGB},0.06)`, border: `1px solid rgba(${ACCENT_RGB},0.15)` }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: ACCENT, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                        {lang === "he" ? "טיפים לבחינה" : "Exam tips"}
                      </div>
                      <ul style={{ margin: 0, padding: isRTL ? "0 16px 0 0" : "0 0 0 16px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.8, fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right" }}>
                        {(lang === "he" ? [
                          "קרא כל שאלה בעיון — לעיתים ההבדל בין האפשרויות עדין מאוד",
                          "בהבנת הנקרא: מצא תחילה את הרעיון המרכזי של הקטע",
                          "בניסוח מחדש: חפש אפשרות שמשמעותה זהה, לא רק מילים דומות",
                          "בחיבור: צור מבנה ברור — פתיחה, גוף, סיכום",
                        ] : [
                          "Read each question carefully — differences between options can be subtle",
                          "In reading comprehension: identify the central idea first",
                          "In reformulation: look for identical meaning, not just similar words",
                          "In the essay: build a clear structure — intro, body, conclusion",
                        ]).map((tip, j) => <li key={j}>{tip}</li>)}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Overall stats ── */}
      {totalDone > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
          {[
            { label: lang === "he" ? "תרגולים" : "Sessions", value: totalDone },
            { label: lang === "he" ? "שאלות" : "Questions", value: totalAttempted },
            { label: lang === "he" ? "דיוק" : "Accuracy", value: overallPct !== null ? `${overallPct}%` : "—" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{stat.value}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Section cards ── */}
      <div style={{ marginBottom: "12px" }}>
        <h2 style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "14px" }}>
          {lang === "he" ? "תרגול לפי חלק" : "Practice by section"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {(["reading", "completion", "reformulation"] as const).map((sectionId, i) => {
            const meta = SECTION_META[sectionId];
            const p = progressMap[sectionId];
            const accuracy = p ? pct(p.correct_answers, p.total_questions) : null;
            return (
              <motion.div
                key={sectionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 + i * 0.06 }}
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow 0.15s, border-color 0.15s", cursor: "default" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px rgba(${meta.colorRgb},0.16)`; (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${meta.colorRgb},0.35)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
              >
                <div style={{ height: "3px", background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)` }} />
                <div style={{ padding: "22px 22px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0, background: `rgba(${meta.colorRgb},0.1)`, border: `1px solid rgba(${meta.colorRgb},0.2)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", marginBottom: "2px" }}>
                        {lang === "he" ? meta.labelHe : meta.labelEn}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {p && p.sessions_done > 0
                          ? (lang === "he" ? `${p.sessions_done} תרגולים · דיוק ${accuracy}%` : `${p.sessions_done} sessions · ${accuracy}% accuracy`)
                          : (lang === "he" ? "לא תורגל עדיין" : "Not practiced yet")}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, flex: 1, marginBottom: "14px", fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right" }}>
                    {lang === "he" ? meta.descHe : meta.descEn}
                  </p>

                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                    {lang === "he" ? meta.questionsHe : meta.questionsEn}
                  </div>

                  {p && p.total_questions > 0 && (
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ height: "4px", background: "var(--bg-elevated)", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "99px", width: `${accuracy}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => router.push(`/yael/practice?section=${sectionId}`)}
                    style={{ padding: "10px 0", borderRadius: "10px", fontSize: "14px", fontWeight: 700, background: `rgba(${meta.colorRgb},0.12)`, border: `1px solid rgba(${meta.colorRgb},0.25)`, color: meta.color, cursor: "pointer", transition: "background 0.12s, border-color 0.12s", width: "100%" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(${meta.colorRgb},0.2)`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(${meta.colorRgb},0.12)`; }}
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
      </div>

      {/* ── Recent sessions ── */}
      {recentSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }} style={{ marginTop: "36px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>
            {lang === "he" ? "תרגולים אחרונים" : "Recent sessions"}
          </h2>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            {recentSessions.map((s, i) => {
              const meta = SECTION_META[s.section as keyof typeof SECTION_META];
              const score_pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 18px", borderBottom: i < recentSessions.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "9px", flexShrink: 0, background: `rgba(${meta?.colorRgb ?? ACCENT_RGB},0.1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
                    {meta?.icon ?? "📝"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {lang === "he" ? (meta?.labelHe ?? s.section) : (meta?.labelEn ?? s.section)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {timeAgo(s.created_at)}{s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)}min` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: score_pct >= 70 ? "var(--green)" : score_pct >= 40 ? ACCENT : "#f87171" }}>
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
