"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const ACCENT = "#f59e0b";
const ACCENT_RGB = "245,158,11";

interface Option { A: string; B: string; C: string; D: string; }
interface Question { id: string; text: string; options: Option; correct: string; explanation: string; }
interface ExerciseData { passage: string | null; title: string; questions: Question[]; }
type AnswerState = { chosen: string; correct: string; explanation: string; isCorrect: boolean; } | null;
interface ChatMsg { role: "user" | "assistant" | "trigger"; content: string; }

const SECTION_META = {
  reading:       { labelEn: "Reading Comprehension", labelHe: "הבנת הנקרא",   icon: "📄", color: "#4f8ef7", colorRgb: "79,142,247" },
  completion:    { labelEn: "Sentence Completion",   labelHe: "השלמת משפטים",  icon: "✏️", color: ACCENT,    colorRgb: ACCENT_RGB },
  reformulation: { labelEn: "Reformulation",         labelHe: "ניסוח מחדש",    icon: "🔄", color: "#a78bfa", colorRgb: "167,139,250" },
} as const;
type SectionId = keyof typeof SECTION_META;

const OPT_LETTERS: (keyof Option)[] = ["A", "B", "C", "D"];

export default function PracticeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawSection = searchParams.get("section") ?? "reading";
  const section: SectionId = rawSection in SECTION_META ? (rawSection as SectionId) : "reading";
  const meta = SECTION_META[section];

  // lang
  const [lang, setLang] = useState("en");
  useEffect(() => {
    const stored = localStorage.getItem("proffy_lang") ?? "en";
    setLang(stored);
    const onLang = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener("proffy-lang", onLang);
    return () => window.removeEventListener("proffy-lang", onLang);
  }, []);
  const isRTL = lang === "he" || lang === "ar";

  // exercise
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [results, setResults] = useState<{ q: Question; chosen: string; isCorrect: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startTime = useRef(Date.now());
  const passageRef = useRef<HTMLDivElement>(null);

  // chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const chatMsgsRef = useRef<ChatMsg[]>([]);
  useEffect(() => { chatMsgsRef.current = chatMsgs; }, [chatMsgs]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [showTutor, setShowTutor] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // screen size
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => { if (isMobile) setShowTutor(false); }, [isMobile]);

  // load exercise
  useEffect(() => {
    setLoading(true); setError(""); setChatMsgs([]); setQuestionIndex(0); setResults([]); setAnswerState(null); setDone(false);
    Promise.all([
      fetch("/api/yael/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) }).then(r => r.json()),
      fetch("/api/yael/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) }).then(r => r.json()),
    ]).then(([ex, sess]) => {
      if (ex.error) { setError(ex.error); setLoading(false); return; }
      setExercise(ex);
      setSessionId(sess.sessionId ?? null);
      setLoading(false);
      startTime.current = Date.now();
    }).catch(() => { setError("Failed to load exercise. Please try again."); setLoading(false); });
  }, [section]);

  const currentQuestion = exercise?.questions[questionIndex] ?? null;
  const total = exercise?.questions.length ?? 0;
  const score = results.filter(r => r.isCorrect).length;

  function buildContext(): string {
    const lines = [`חלק: ${meta.labelHe}`];
    if (exercise?.passage) lines.push(`קטע הנקרא:\n${exercise.passage}`);
    if (currentQuestion) {
      lines.push(`שאלה נוכחית: ${currentQuestion.text}`);
      lines.push(OPT_LETTERS.map(k => `${k}. ${currentQuestion.options[k]}`).join("\n"));
    }
    return lines.join("\n\n");
  }

  async function callTutor(apiMessages: { role: "user" | "assistant"; content: string }[]) {
    setChatStreaming(true);
    setChatMsgs(prev => [...prev, { role: "assistant", content: "" }]);
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    let text = "";
    try {
      const res = await fetch("/api/yael/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, context: buildContext(), lang }),
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            text += JSON.parse(data).text;
            setChatMsgs(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: text }; return u; });
            chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
          } catch {}
        }
      }
    } finally {
      setChatStreaming(false);
    }
  }

  function choose(letter: string) {
    if (answerState || !currentQuestion) return;
    const isCorrect = letter === currentQuestion.correct;
    setAnswerState({ chosen: letter, correct: currentQuestion.correct, explanation: currentQuestion.explanation, isCorrect });

    if (!isCorrect) {
      const opts = OPT_LETTERS.map(k => `${k}. ${currentQuestion.options[k]}`).join("\n");
      const triggerLabel = `❌ שאלה ${questionIndex + 1} — בחרת ${letter}, התשובה הנכונה: ${currentQuestion.correct}`;
      const prompt = `התלמיד ענה על השאלה הבאה ובחר תשובה שגויה.

שאלה: ${currentQuestion.text}

אפשרויות:
${opts}

בחר: ${letter}. ${currentQuestion.options[letter as keyof Option]}
תשובה נכונה: ${currentQuestion.correct}. ${currentQuestion.options[currentQuestion.correct as keyof Option]}
הסבר: ${currentQuestion.explanation}

אנא:
1. הסבר מדוע ${letter} שגויה
2. הסבר מדוע ${currentQuestion.correct} נכונה
3. למד את הכלל הרלוונטי (דקדוק / אוצר מילים / סגנון) עם דוגמה נוספת`;

      const history = chatMsgsRef.current
        .filter(m => m.role !== "trigger")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      setChatMsgs(prev => [...prev, { role: "trigger", content: triggerLabel }]);
      if (!showTutor) setShowTutor(true);
      callTutor([...history, { role: "user", content: prompt }]);
    }
  }

  async function sendUserMessage() {
    if (!chatInput.trim() || chatStreaming) return;
    const msg = chatInput.trim();
    setChatInput("");
    const history = chatMsgsRef.current
      .filter(m => m.role !== "trigger")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    setChatMsgs(prev => [...prev, { role: "user", content: msg }]);
    callTutor([...history, { role: "user", content: msg }]);
  }

  function next() {
    if (!answerState || !currentQuestion || !exercise) return;
    const updated = [...results, { q: currentQuestion, chosen: answerState.chosen, isCorrect: answerState.isCorrect }];
    setResults(updated);
    setAnswerState(null);
    if (questionIndex + 1 >= exercise.questions.length) {
      finishSession(updated);
    } else {
      setQuestionIndex(i => i + 1);
      passageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function finishSession(finalResults: typeof results) {
    setDone(true);
    if (!sessionId) return;
    const sc = finalResults.filter(r => r.isCorrect).length;
    const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
    await fetch("/api/yael/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId, score: sc, total, durationSeconds,
        questions: finalResults.map(r => ({
          text: r.q.text, options: r.q.options, correct: r.q.correct,
          studentAnswer: r.chosen, isCorrect: r.isCorrect, explanation: r.q.explanation,
        })),
      }),
    }).catch(() => {});
  }

  function startNew() {
    setDone(false); setLoading(true); setQuestionIndex(0); setResults([]); setAnswerState(null); setChatMsgs([]);
    Promise.all([
      fetch("/api/yael/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) }).then(r => r.json()),
      fetch("/api/yael/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) }).then(r => r.json()),
    ]).then(([ex, sess]) => {
      setExercise(ex); setSessionId(sess.sessionId ?? null); setLoading(false); startTime.current = Date.now();
    }).catch(() => setLoading(false));
  }

  // ── Done
  if (done) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📖";
    return (
      <div style={{ maxWidth: "540px", margin: "0 auto", padding: "40px 24px", direction: isRTL ? "rtl" : "ltr", textAlign: "center" }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>{emoji}</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "8px" }}>
            {pct >= 80 ? (lang === "he" ? "כל הכבוד!" : "Excellent work!") : pct >= 50 ? (lang === "he" ? "מאמץ טוב!" : "Good effort!") : (lang === "he" ? "תמשיך להתאמן!" : "Keep practicing!")}
          </h1>
          <div style={{ fontSize: "48px", fontWeight: 900, color: meta.color, marginBottom: "4px", letterSpacing: "-0.04em" }}>{score}/{total}</div>
          <div style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "32px" }}>{pct}% {lang === "he" ? "נכון" : "correct"}</div>

          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", marginBottom: "24px", textAlign: isRTL ? "right" : "left" }}>
            {results.map((r, i) => (
              <div key={i} style={{ padding: "12px 16px", display: "flex", gap: "12px", alignItems: "flex-start", borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, background: r.isCorrect ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>
                  {r.isCorrect ? "✓" : "✗"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {r.q.text.length > 80 ? r.q.text.slice(0, 80) + "…" : r.q.text}
                  </div>
                  {!r.isCorrect && (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {lang === "he" ? "נכון: " : "Correct: "}<strong>{r.q.correct}. {r.q.options[r.q.correct as keyof Option]}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={startNew} style={{ padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, background: `rgba(${meta.colorRgb},0.12)`, border: `1px solid rgba(${meta.colorRgb},0.3)`, color: meta.color, cursor: "pointer" }}>
              {lang === "he" ? "תרגול חדש" : "New session"}
            </button>
            <button onClick={() => router.push("/dashboard")} style={{ padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>
              {lang === "he" ? "חזרה לדשבורד" : "Back to dashboard"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Loading
  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ width: "36px", height: "36px", borderRadius: "50%", border: `3px solid rgba(${meta.colorRgb},0.15)`, borderTopColor: meta.color }} />
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>{lang === "he" ? "מכין תרגול…" : "Preparing your exercise…"}</p>
      </div>
    );
  }

  // ── Error
  if (error || !exercise || !currentQuestion) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <div style={{ fontSize: "36px" }}>⚠️</div>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>{error || "Something went wrong"}</p>
        <button onClick={() => router.refresh()} style={{ padding: "10px 20px", borderRadius: "9px", background: meta.color, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
          {lang === "he" ? "נסה שנית" : "Try again"}
        </button>
      </div>
    );
  }

  // ── Main practice + tutor
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", direction: isRTL ? "rtl" : "ltr" }}>

      {/* ── Practice panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Progress bar */}
        <div style={{ height: "3px", background: "var(--bg-elevated)", flexShrink: 0 }}>
          <motion.div style={{ height: "100%", background: `linear-gradient(90deg, ${meta.color}, ${meta.color}99)` }}
            animate={{ width: `${(questionIndex / total) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>

        {/* Header bar */}
        <div style={{ height: "44px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px" }}>{meta.icon}</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>{lang === "he" ? meta.labelHe : meta.labelEn}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{questionIndex + 1} / {total}</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--green)" }}>{score} ✓</span>
            <button
              onClick={() => setShowTutor(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: showTutor ? `rgba(${ACCENT_RGB},0.12)` : "var(--bg-elevated)", border: `1px solid ${showTutor ? `rgba(${ACCENT_RGB},0.35)` : "var(--border)"}`, color: showTutor ? ACCENT : "var(--text-muted)", cursor: "pointer", transition: "all 0.15s" }}
            >
              <span style={{ fontSize: "13px" }}>👨‍🏫</span>
              {lang === "he" ? "מורה" : "Tutor"}
            </button>
          </div>
        </div>

        {/* Content split */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Passage — reading only */}
          {section === "reading" && exercise.passage && (
            <div ref={passageRef} style={{ width: "48%", flexShrink: 0, overflowY: "auto", padding: "24px 28px", borderRight: "1px solid var(--border)", background: "var(--bg-base)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color, marginBottom: "10px" }}>
                {lang === "he" ? "קטע לקריאה" : "Reading passage"}
              </div>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "16px", lineHeight: 1.4 }}>{exercise.title}</h2>
              <div style={{ fontSize: "15px", lineHeight: 2, color: "var(--text-secondary)", fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right", whiteSpace: "pre-wrap" }}>
                {exercise.passage}
              </div>
            </div>
          )}

          {/* Questions */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", maxWidth: section === "reading" ? undefined : "600px", margin: section === "reading" ? undefined : "0 auto", width: "100%" }}>
            <AnimatePresence mode="wait">
              <motion.div key={questionIndex} initial={{ opacity: 0, x: isRTL ? -16 : 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? 16 : -16 }} transition={{ duration: 0.22 }}>

                {/* Question text */}
                <div style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.75, color: "var(--text-primary)", marginBottom: "22px", fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right", whiteSpace: "pre-wrap" }}>
                  {currentQuestion.text}
                </div>

                {/* Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "20px" }}>
                  {OPT_LETTERS.map(letter => {
                    const text = currentQuestion.options[letter];
                    let bg = "var(--bg-elevated)", border = "var(--border)", color = "var(--text-primary)";
                    if (answerState) {
                      if (letter === answerState.correct) { bg = "rgba(52,211,153,0.12)"; border = "rgba(52,211,153,0.4)"; color = "var(--green)"; }
                      else if (letter === answerState.chosen && !answerState.isCorrect) { bg = "rgba(239,68,68,0.1)"; border = "rgba(239,68,68,0.3)"; color = "#f87171"; }
                    }
                    return (
                      <button key={letter} onClick={() => choose(letter)} disabled={!!answerState}
                        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 15px", borderRadius: "10px", background: bg, border: `1px solid ${border}`, color, cursor: answerState ? "default" : "pointer", textAlign: "right", transition: "all 0.12s", fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", fontSize: "14px", lineHeight: 1.55, direction: "rtl" }}>
                        <span style={{ flex: 1 }}>{text}</span>
                        <span style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "12px", fontWeight: 700,
                          background: answerState ? (letter === answerState.correct ? "rgba(52,211,153,0.2)" : letter === answerState.chosen ? "rgba(239,68,68,0.15)" : "var(--bg-surface)") : `rgba(${meta.colorRgb},0.1)`,
                          color: answerState ? (letter === answerState.correct ? "var(--green)" : letter === answerState.chosen ? "#f87171" : "var(--text-muted)") : meta.color }}>
                          {answerState && letter === answerState.correct ? "✓" : answerState && letter === answerState.chosen && !answerState.isCorrect ? "✗" : letter}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                  {answerState && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                      <div style={{ padding: "14px 16px", borderRadius: "11px", marginBottom: "18px", background: answerState.isCorrect ? "rgba(52,211,153,0.07)" : "rgba(239,68,68,0.06)", border: `1px solid ${answerState.isCorrect ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.2)"}` }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: answerState.isCorrect ? "var(--green)" : "#f87171", marginBottom: "7px" }}>
                          {answerState.isCorrect ? (lang === "he" ? "✓ נכון!" : "✓ Correct!") : (lang === "he" ? "✗ לא נכון" : "✗ Incorrect")}
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0, fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right" }}>
                          {answerState.explanation}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Next */}
                {answerState && (
                  <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={next}
                    style={{ width: "100%", padding: "12px", borderRadius: "10px", background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`, border: "none", color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer", boxShadow: `0 4px 16px rgba(${meta.colorRgb},0.3)` }}>
                    {questionIndex + 1 >= total ? (lang === "he" ? "סיים תרגול" : "Finish session") : (lang === "he" ? "← שאלה הבאה" : "Next question →")}
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Tutor chat panel ── */}
      <AnimatePresence>
        {showTutor && (
          <motion.div
            key="tutor"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? "100%" : 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              flexShrink: 0,
              borderLeft: "1px solid var(--border)",
              display: "flex", flexDirection: "column",
              background: "var(--bg-surface)",
              overflow: "hidden",
              ...(isMobile ? { position: "absolute", inset: 0, zIndex: 50, borderLeft: "none" } : {}),
            }}
          >
            {/* Chat header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: `rgba(${ACCENT_RGB},0.12)`, border: `1.5px solid rgba(${ACCENT_RGB},0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0 }}>
                👨‍🏫
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{lang === "he" ? 'מורה יע"ל' : "Yael Tutor"}</div>
                <div style={{ fontSize: "11px", color: chatStreaming ? ACCENT : "var(--text-muted)" }}>
                  {chatStreaming ? (lang === "he" ? "מקליד…" : "Typing…") : (lang === "he" ? "מוכן לעזור" : "Ready to help")}
                </div>
              </div>
              {isMobile && (
                <button onClick={() => setShowTutor(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {chatMsgs.length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "24px 16px", textAlign: "center" }}>
                  <span style={{ fontSize: "32px" }}>💬</span>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.7, margin: 0, fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl" }}>
                    {lang === "he"
                      ? 'שאל אותי כל שאלה על החומר.\nאם תטעה — אסביר ואלמד אותך את הכלל הרלוונטי.'
                      : "Ask me anything about the material.\nIf you get a question wrong, I'll explain and teach you the relevant concept."}
                  </p>
                </div>
              )}

              {chatMsgs.map((msg, i) => {
                if (msg.role === "trigger") {
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "99px", padding: "3px 12px", direction: "rtl" }}>
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                if (msg.role === "user") {
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: "12px 12px 12px 4px", background: `linear-gradient(135deg, ${ACCENT}, #d97706)`, color: "#fff", fontSize: "13px", lineHeight: 1.6, fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right" }}>
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                // assistant
                return (
                  <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: `rgba(${ACCENT_RGB},0.1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0, marginTop: "2px" }}>👨‍🏫</div>
                    <div style={{ flex: 1, padding: "10px 13px", borderRadius: "4px 12px 12px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: "13px", lineHeight: 1.7, color: "var(--text-primary)", fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl", textAlign: "right", whiteSpace: "pre-wrap" }}>
                      {msg.content || (chatStreaming && i === chatMsgs.length - 1
                        ? <span style={{ opacity: 0.35 }}>▌</span>
                        : null)}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: "8px" }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUserMessage(); } }}
                disabled={chatStreaming}
                placeholder={lang === "he" ? "שאל שאלה…" : "Ask something…"}
                style={{ flex: 1, padding: "8px 11px", borderRadius: "9px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "13px", outline: "none", fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", direction: "rtl" }}
              />
              <button
                onClick={sendUserMessage}
                disabled={!chatInput.trim() || chatStreaming}
                style={{ width: "36px", height: "36px", borderRadius: "9px", background: chatInput.trim() && !chatStreaming ? ACCENT : "var(--bg-elevated)", border: "none", color: "#fff", cursor: chatInput.trim() && !chatStreaming ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
