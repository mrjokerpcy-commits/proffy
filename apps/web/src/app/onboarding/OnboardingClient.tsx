"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const UNIVERSITIES = ["TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Other"];

const FIELDS = [
  "Computer Science", "Electrical Engineering", "Mechanical Engineering",
  "Civil Engineering", "Mathematics", "Physics", "Biology", "Chemistry",
  "Medicine", "Economics", "Business", "Law", "Psychology", "Other",
];

const CHALLENGES = [
  { icon: "😶", text: "Hard to focus and stick to a plan" },
  { icon: "😵", text: "Too much material, don't know where to start" },
  { icon: "😅", text: "I understand but forget by exam time" },
  { icon: "😰", text: "Professor exams are unpredictable" },
  { icon: "🤯", text: "Math / formulas are hard to grasp" },
  { icon: "⏰", text: "I leave everything to the last day" },
];

function LogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="ob-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f8ef7"/><stop offset="1" stopColor="#a78bfa"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ob-g)"/>
      <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white"/>
      <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8"/>
      <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
      <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
      <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6"/>
    </svg>
  );
}

const SEMESTERS = [
  { val: "2025b", label: "2025b — Spring/Summer 2026" },
  { val: "2025s", label: "2025s — Summer 2026" },
  { val: "2026a", label: "2026a — Fall 2026" },
];

interface Answers {
  name: string;
  university: string;
  semester: string;
  field: string;
  challenge: string;
  hours: string;
  goal: string;
  learningStyle: string;
}

const TOTAL_STEPS = 9; // name, uni, semester, field, challenge, learningStyle, hours, goal, done

export default function OnboardingClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    name: userName || "",
    university: "",
    semester: "",
    field: "",
    challenge: "",
    hours: "",
    goal: "",
    learningStyle: "",
  });
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1);
  const nameRef = useRef<HTMLInputElement>(null);

  const isLast = step === TOTAL_STEPS - 1;

  function next(value?: string, key?: keyof Answers) {
    if (value !== undefined && key) {
      setAnswers(a => ({ ...a, [key]: value }));
    }
    if (isLast) return;
    setDirection(1);
    setStep(s => s + 1);
  }

  function back() {
    if (step === 0) return;
    setDirection(-1);
    setStep(s => s - 1);
  }

  async function finish() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answers, semester: answers.semester || undefined }),
    }).catch(() => {});
    router.push("/dashboard");
  }

  const variants = {
    enter:  (d: number) => ({ opacity: 0, y: d > 0 ? 24 : -24 }),
    center: { opacity: 1, y: 0 },
    exit:   (d: number) => ({ opacity: 0, y: d > 0 ? -24 : 24 }),
  };

  const firstName = (answers.name || userName || "").split(" ")[0];

  const optionStyle = (selected: boolean): React.CSSProperties => ({
    padding: "12px 16px", borderRadius: "10px",
    border: `1px solid ${selected ? "rgba(79,142,247,0.55)" : "rgba(255,255,255,0.09)"}`,
    background: selected ? "rgba(79,142,247,0.1)" : "rgba(255,255,255,0.03)",
    color: selected ? "var(--blue)" : "var(--text-secondary)",
    cursor: "pointer", transition: "all 0.12s", textAlign: "left" as const,
    fontSize: "14px", fontWeight: selected ? 600 : 400,
  });

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "5rem 1.5rem 2rem", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(79,142,247,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "10%", left: "30%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(167,139,250,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ position: "absolute", top: "1.75rem", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "10px" }}>
        <LogoMark />
        <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-primary)", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "0.4rem" }}>Proffy <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--accent)", background: "rgba(99,102,241,0.13)", border: "1px solid rgba(99,102,241,0.28)", borderRadius: "4px", padding: "1px 5px", lineHeight: 1.5 }}>BETA</span></span>
      </div>

      {/* Progress bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "rgba(255,255,255,0.06)" }}>
        <div style={{
          height: "100%",
          width: `${((step) / (TOTAL_STEPS - 1)) * 100}%`,
          background: "linear-gradient(90deg, var(--blue), var(--purple))",
          transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>

      {/* Step counter */}
      {!isLast && (
        <div style={{ position: "absolute", top: "1.9rem", right: "2rem" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
            {step + 1} / {TOTAL_STEPS - 1}
          </span>
        </div>
      )}

      {/* Step content */}
      <div style={{ width: "100%", maxWidth: "520px", position: "relative" }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* ── Step 0: Name ── */}
            {step === 0 && (
              <>
                <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.5rem", lineHeight: 1.2 }}>
                  What should we call you?
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "2rem" }}>
                  Proffy uses your name to personalise everything.
                </p>
                <input
                  ref={nameRef}
                  autoFocus
                  type="text"
                  placeholder="Your first name"
                  defaultValue={answers.name}
                  maxLength={80}
                  onKeyDown={e => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) next(v, "name"); } }}
                  style={{
                    width: "100%", padding: "14px 18px", borderRadius: "12px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text-primary)", fontSize: "16px", outline: "none",
                    marginBottom: "12px", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={() => { const v = nameRef.current?.value.trim() ?? ""; if (v) next(v, "name"); }}
                  style={{
                    width: "100%", padding: "13px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg,#4f8ef7,#a78bfa)",
                    color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(79,142,247,0.3)",
                  }}>
                  Continue →
                </button>
              </>
            )}

            {/* ── Step 1: University ── */}
            {step === 1 && (
              <>
                <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  {firstName ? `${firstName}, which university?` : "Which university?"}
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "2rem" }}>
                  Proffy knows each university's exam style, professors, and grading curves.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {UNIVERSITIES.map(u => (
                    <button key={u} onClick={() => next(u, "university")} style={{ ...optionStyle(answers.university === u), padding: "18px 8px", textAlign: "center", fontWeight: 600, fontSize: "13px" }}>
                      {u}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 2: Semester ── */}
            {step === 2 && (
              <>
                <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  Which semester are you in?
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "2rem" }}>
                  Proffy will know which courses and exam cycles apply to you.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {SEMESTERS.map(s => (
                    <button key={s.val} onClick={() => next(s.val, "semester")}
                      style={{ ...optionStyle(answers.semester === s.val), padding: "16px 18px", fontSize: "15px", fontWeight: 600 }}>
                      {s.label}
                    </button>
                  ))}
                  <button onClick={() => next("", "semester")}
                    style={{ ...optionStyle(false), padding: "12px 18px", fontSize: "13px", color: "var(--text-muted)" }}>
                    Skip for now
                  </button>
                </div>
              </>
            )}

            {/* ── Step 3: Field ── */}
            {step === 3 && (
              <>
                <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  What are you studying?
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "2rem" }}>
                  Proffy tailors explanations, examples, and flashcards to your field.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {FIELDS.map(f => (
                    <button key={f} onClick={() => next(f, "field")} style={{ ...optionStyle(answers.field === f), padding: "11px 14px" }}>
                      {f}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 5: Challenge ── */}
            {step === 5 && (
              <>
                <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  What's your biggest study challenge?
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "2rem" }}>
                  This helps Proffy focus on what matters most for you.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {CHALLENGES.map(c => (
                    <button key={c.text} onClick={() => next(c.text, "challenge")}
                      style={{ ...optionStyle(answers.challenge === c.text), display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "20px", flexShrink: 0 }}>{c.icon}</span>
                      <span>{c.text}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 4: Learning style ── */}
            {step === 6 && (
              <>
                <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  How do you learn best?
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "2rem" }}>
                  Proffy will match its explanation style to how your brain works.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { val: "visual",   icon: "🎨", title: "Visual & diagrams",        desc: "Graphs, tables, step-by-step breakdowns" },
                    { val: "practice", icon: "⚡", title: "Practice problems first",  desc: "Throw examples at me, explain on the way" },
                    { val: "reading",  icon: "📖", title: "Thorough reading",          desc: "Full explanations before I try anything" },
                    { val: "mixed",    icon: "🔀", title: "Mix it up",                 desc: "Varies by topic — let Proffy decide" },
                  ].map(o => (
                    <button key={o.val} onClick={() => next(o.val, "learningStyle")}
                      style={{ ...optionStyle(answers.learningStyle === o.val), display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "22px", flexShrink: 0 }}>{o.icon}</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "2px" }}>{o.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{o.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 5: Hours ── */}
            {step === 7 && (
              <>
                <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  How many hours a week can you study?
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "2rem" }}>
                  We'll build a realistic plan around your schedule, not an ideal one.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                  {["1–3h", "4–6h", "7–10h", "11–15h", "16–20h", "20h+"].map(h => (
                    <button key={h} onClick={() => next(h, "hours")}
                      style={{ ...optionStyle(answers.hours === h), padding: "18px 8px", textAlign: "center", fontWeight: 600 }}>
                      {h}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 6: Goal ── */}
            {step === 8 && (
              <>
                <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  What's your main goal?
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "2rem" }}>
                  Be honest — Proffy won't judge.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { val: "pass",      icon: "✅", title: "Just pass",       desc: "Focus on the essentials, skip the extras" },
                    { val: "good",      icon: "⭐", title: "Good grade",       desc: "Solid understanding, aim for 80+" },
                    { val: "excellent", icon: "🏆", title: "Top of the class", desc: "Deep mastery, full exam prep" },
                  ].map(o => (
                    <button key={o.val} onClick={() => next(o.val, "goal")}
                      style={{ ...optionStyle(answers.goal === o.val), display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "22px", flexShrink: 0 }}>{o.icon}</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "2px" }}>{o.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{o.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 7 (last): Done ── */}
            {isLast && (
              <div style={{ textAlign: "center" }}>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  style={{ fontSize: "4rem", marginBottom: "1.25rem" }}>
                  🎓
                </motion.div>
                <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.625rem" }}>
                  {firstName ? `You're all set, ${firstName}!` : "You're all set!"}
                </h1>
                <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.65, maxWidth: "360px", margin: "0 auto 2rem" }}>
                  Proffy is personalised to your university, field, and learning style. Add your first course to get started.
                </p>

                {/* Summary */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", padding: "16px 18px", marginBottom: "16px", textAlign: "left" }}>
                  {[
                    { label: "University",      val: answers.university },
                    { label: "Semester",        val: answers.semester },
                    { label: "Field",           val: answers.field },
                    { label: "Learning style",  val: { visual: "Visual & diagrams", practice: "Practice first", reading: "Thorough reading", mixed: "Mixed" }[answers.learningStyle] ?? answers.learningStyle },
                    { label: "Goal",            val: { pass: "Just pass", good: "Good grade", excellent: "Top of class" }[answers.goal] ?? answers.goal },
                    { label: "Study hours",     val: answers.hours ? answers.hours + " / week" : "" },
                  ].filter(r => r.val).map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{r.label}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <button onClick={finish} disabled={saving} style={{
                  width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                  background: "linear-gradient(135deg,#4f8ef7,#a78bfa)",
                  color: "#fff", fontSize: "15px", fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1, transition: "opacity 0.15s",
                  boxShadow: "0 4px 24px rgba(79,142,247,0.3)",
                }}>
                  {saving ? "Saving…" : "Go to dashboard →"}
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Back */}
        {step > 0 && !isLast && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={back}
            style={{
              marginTop: "1.5rem", padding: "0", background: "none", border: "none",
              fontSize: "13px", color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </motion.button>
        )}
      </div>
    </div>
  );
}
