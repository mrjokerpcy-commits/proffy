"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const ACCENT = "#f59e0b";
const ACCENT_RGB = "245,158,11";

interface Option { A: string; B: string; C: string; D: string; }
interface Question {
  id: string;
  text: string;
  options: Option;
  correct: string;
  explanation: string;
}
interface ExerciseData {
  passage: string | null;
  title: string;
  questions: Question[];
}

type AnswerState = {
  chosen: string;
  correct: string;
  explanation: string;
  isCorrect: boolean;
} | null;

const SECTION_META = {
  reading:    { labelEn: "Reading Comprehension", labelHe: "הבנת הנקרא",  icon: "📄", color: "#4f8ef7", colorRgb: "79,142,247" },
  vocabulary: { labelEn: "Vocabulary",            labelHe: "אוצר מילים",  icon: "📚", color: ACCENT,    colorRgb: ACCENT_RGB },
  grammar:    { labelEn: "Language Errors",       labelHe: "שגיאות בשפה", icon: "✍️", color: "#a78bfa", colorRgb: "167,139,250" },
};

export default function PracticeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const section = (searchParams.get("section") ?? "reading") as "reading" | "vocabulary" | "grammar";
  const meta = SECTION_META[section] ?? SECTION_META.reading;

  const [lang, setLang] = useState("en");
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [results, setResults] = useState<{ q: Question; chosen: string; isCorrect: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const startTime = useRef(Date.now());
  const passageRef = useRef<HTMLDivElement>(null);

  // highlight passage text when question is shown (reading mode)
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("proffy_lang") ?? "en";
    setLang(stored);
    const onLang = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener("proffy-lang", onLang);
    return () => window.removeEventListener("proffy-lang", onLang);
  }, []);

  const isRTL = lang === "he" || lang === "ar";

  // Load exercise
  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/yael/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) })
        .then(r => r.json()),
      fetch("/api/yael/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) })
        .then(r => r.json()),
    ]).then(([ex, sess]) => {
      if (ex.error) { setError(ex.error); setLoading(false); return; }
      setExercise(ex);
      setSessionId(sess.sessionId ?? null);
      setLoading(false);
      startTime.current = Date.now();
    }).catch(() => {
      setError("Failed to load exercise. Please try again.");
      setLoading(false);
    });
  }, [section]);

  const currentQuestion = exercise?.questions[questionIndex] ?? null;

  function choose(letter: string) {
    if (answerState || !currentQuestion) return;
    const isCorrect = letter === currentQuestion.correct;
    setAnswerState({
      chosen: letter,
      correct: currentQuestion.correct,
      explanation: currentQuestion.explanation,
      isCorrect,
    });
  }

  function next() {
    if (!answerState || !currentQuestion || !exercise) return;
    const updated = [...results, { q: currentQuestion, chosen: answerState.chosen, isCorrect: answerState.isCorrect }];
    setResults(updated);
    setAnswerState(null);
    setHighlightedWord(null);

    if (questionIndex + 1 >= exercise.questions.length) {
      // Session complete
      finishSession(updated);
    } else {
      setQuestionIndex(i => i + 1);
      passageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function finishSession(finalResults: typeof results) {
    setDone(true);
    if (!sessionId) return;
    setSaving(true);
    const score = finalResults.filter(r => r.isCorrect).length;
    const total = finalResults.length;
    const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
    await fetch("/api/yael/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        score, total, durationSeconds,
        questions: finalResults.map(r => ({
          text: r.q.text,
          options: r.q.options,
          correct: r.q.correct,
          studentAnswer: r.chosen,
          isCorrect: r.isCorrect,
          explanation: r.q.explanation,
        })),
      }),
    }).catch(() => {});
    setSaving(false);
  }

  const score = results.filter(r => r.isCorrect).length;
  const total = exercise?.questions.length ?? 0;

  // ── Done screen
  if (done) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📖";
    const msgEn = pct >= 80 ? "Excellent work!" : pct >= 50 ? "Good effort, keep going!" : "Keep practicing — you'll improve!";
    const msgHe = pct >= 80 ? "כל הכבוד!" : pct >= 50 ? "מאמץ טוב, המשך!" : "תמשיך להתאמן — אתה תשתפר!";

    return (
      <div style={{ maxWidth: "540px", margin: "0 auto", padding: "40px 24px", direction: isRTL ? "rtl" : "ltr", textAlign: "center" }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>{emoji}</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "8px" }}>
            {lang === "he" ? msgHe : msgEn}
          </h1>
          <div style={{ fontSize: "48px", fontWeight: 900, color: meta.color, marginBottom: "4px", letterSpacing: "-0.04em" }}>
            {score}/{total}
          </div>
          <div style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "32px" }}>
            {pct}% {lang === "he" ? "נכון" : "correct"}
          </div>

          {/* Per-question review */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", marginBottom: "24px", textAlign: isRTL ? "right" : "left" }}>
            {results.map((r, i) => (
              <div key={i} style={{
                padding: "12px 16px", display: "flex", gap: "12px", alignItems: "flex-start",
                borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div style={{
                  width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                  background: r.isCorrect ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px",
                }}>
                  {r.isCorrect ? "✓" : "✗"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {r.q.text.length > 80 ? r.q.text.slice(0, 80) + "…" : r.q.text}
                  </div>
                  {!r.isCorrect && (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {lang === "he" ? "תשובה נכונה: " : "Correct: "}<strong>{r.q.correct}. {r.q.options[r.q.correct as keyof Option]}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => { setDone(false); setLoading(true); setQuestionIndex(0); setResults([]); setAnswerState(null);
                fetch("/api/yael/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) })
                  .then(r => r.json()).then(ex => { setExercise(ex); setLoading(false); startTime.current = Date.now(); });
                fetch("/api/yael/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) })
                  .then(r => r.json()).then(s => setSessionId(s.sessionId ?? null));
              }}
              style={{
                padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 700,
                background: `rgba(${meta.colorRgb},0.12)`, border: `1px solid rgba(${meta.colorRgb},0.3)`,
                color: meta.color, cursor: "pointer",
              }}
            >
              {lang === "he" ? "תרגול חדש" : "New session"}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 700,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", cursor: "pointer",
              }}
            >
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: "36px", height: "36px", borderRadius: "50%",
            border: `3px solid rgba(${meta.colorRgb},0.15)`,
            borderTopColor: meta.color,
          }}
        />
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          {lang === "he" ? "מכין תרגול…" : "Preparing your exercise…"}
        </p>
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

  const optionLetters: (keyof Option)[] = ["A", "B", "C", "D"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", direction: isRTL ? "rtl" : "ltr" }}>
      {/* Progress bar */}
      <div style={{ height: "3px", background: "var(--bg-elevated)", flexShrink: 0 }}>
        <motion.div
          style={{ height: "100%", background: `linear-gradient(90deg, ${meta.color}, ${meta.color}99)` }}
          animate={{ width: `${((questionIndex) / total) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Header bar */}
      <div style={{
        height: "44px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
        background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px" }}>{meta.icon}</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
            {lang === "he" ? meta.labelHe : meta.labelEn}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {questionIndex + 1} / {total}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--green)" }}>
            {score} ✓
          </span>
        </div>
      </div>

      {/* Split-screen body */}
      <div style={{
        flex: 1, display: "flex", overflow: "hidden",
        flexDirection: section === "reading" ? "row" : "column",
      }}>

        {/* LEFT — Passage (reading only) OR single-panel (vocab/grammar) */}
        {section === "reading" && exercise.passage && (
          <div
            ref={passageRef}
            style={{
              width: "55%", flexShrink: 0, overflowY: "auto",
              padding: "28px 32px",
              borderRight: "1px solid var(--border)",
              background: "var(--bg-base)",
            }}
          >
            <div style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              color: meta.color, marginBottom: "10px",
            }}>
              {lang === "he" ? "קטע לקריאה" : "Reading passage"}
            </div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "18px", lineHeight: 1.4 }}>
              {exercise.title}
            </h2>
            <div style={{
              fontSize: "15px", lineHeight: 2, color: "var(--text-secondary)",
              fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif",
              direction: "rtl", textAlign: "right",
              whiteSpace: "pre-wrap",
            }}>
              {exercise.passage}
            </div>
          </div>
        )}

        {/* RIGHT — Questions panel */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: section === "reading" ? "28px 28px" : "28px 32px",
          maxWidth: section === "reading" ? undefined : "640px",
          margin: section === "reading" ? undefined : "0 auto",
          width: "100%",
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={questionIndex}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Question text */}
              <div style={{
                fontSize: "16px", fontWeight: 600, lineHeight: 1.65,
                color: "var(--text-primary)", marginBottom: "24px",
                fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif",
                direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left",
              }}>
                {currentQuestion.text}
              </div>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                {optionLetters.map(letter => {
                  const text = currentQuestion.options[letter];
                  let bg = "var(--bg-elevated)";
                  let border = "var(--border)";
                  let color = "var(--text-primary)";

                  if (answerState) {
                    if (letter === answerState.correct) {
                      bg = "rgba(52,211,153,0.12)"; border = "rgba(52,211,153,0.4)"; color = "var(--green)";
                    } else if (letter === answerState.chosen && !answerState.isCorrect) {
                      bg = "rgba(239,68,68,0.1)"; border = "rgba(239,68,68,0.3)"; color = "var(--red, #f87171)";
                    }
                  }

                  return (
                    <button
                      key={letter}
                      onClick={() => choose(letter)}
                      disabled={!!answerState}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "13px 16px", borderRadius: "11px",
                        background: bg, border: `1px solid ${border}`,
                        color, cursor: answerState ? "default" : "pointer",
                        textAlign: isRTL ? "right" : "left",
                        transition: "background 0.12s, border-color 0.12s",
                        fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif",
                        fontSize: "14px", lineHeight: 1.5,
                        direction: isRTL ? "rtl" : "ltr",
                      }}
                    >
                      <span style={{
                        width: "26px", height: "26px", borderRadius: "7px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontSize: "12px", fontWeight: 700,
                        background: answerState
                          ? letter === answerState.correct
                            ? "rgba(52,211,153,0.2)"
                            : letter === answerState.chosen
                            ? "rgba(239,68,68,0.15)"
                            : "var(--bg-surface)"
                          : `rgba(${meta.colorRgb},0.1)`,
                        color: answerState
                          ? letter === answerState.correct
                            ? "var(--green)"
                            : letter === answerState.chosen
                            ? "var(--red, #f87171)"
                            : "var(--text-muted)"
                          : meta.color,
                      }}>
                        {letter}
                      </span>
                      <span style={{ flex: 1 }}>{text}</span>
                      {answerState && letter === answerState.correct && <span style={{ fontSize: "16px" }}>✓</span>}
                      {answerState && letter === answerState.chosen && !answerState.isCorrect && <span style={{ fontSize: "16px" }}>✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {answerState && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{
                      padding: "16px 18px", borderRadius: "12px", marginBottom: "20px",
                      background: answerState.isCorrect ? "rgba(52,211,153,0.07)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${answerState.isCorrect ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.2)"}`,
                    }}>
                      <div style={{
                        fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                        color: answerState.isCorrect ? "var(--green)" : "var(--red, #f87171)", marginBottom: "8px",
                      }}>
                        {answerState.isCorrect
                          ? (lang === "he" ? "✓ נכון!" : "✓ Correct!")
                          : (lang === "he" ? "✗ לא נכון" : "✗ Incorrect")}
                      </div>
                      <p style={{
                        fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0,
                        fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif",
                        direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left",
                      }}>
                        {answerState.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Next button */}
              {answerState && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={next}
                  style={{
                    width: "100%", padding: "13px", borderRadius: "11px",
                    background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
                    border: "none", color: "#fff", fontWeight: 700, fontSize: "15px",
                    cursor: "pointer",
                    boxShadow: `0 4px 16px rgba(${meta.colorRgb},0.3)`,
                  }}
                >
                  {questionIndex + 1 >= total
                    ? (lang === "he" ? "סיים תרגול" : "Finish session")
                    : (lang === "he" ? "שאלה הבאה ←" : "Next question →")}
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
