"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const UNIVERSITIES = ["TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Ariel", "Other"];
const FIELDS = [
  // Engineering & Technology
  "Computer Science", "Software Engineering", "Electrical Engineering",
  "Mechanical Engineering", "Civil Engineering", "Industrial Engineering",
  "Aerospace Engineering", "Biomedical Engineering", "Chemical Engineering",
  "Materials Engineering", "Environmental Engineering",
  // Natural Sciences
  "Mathematics", "Statistics", "Physics", "Chemistry", "Biology",
  "Biochemistry", "Biotechnology", "Earth Sciences", "Neuroscience",
  // Medicine & Health
  "Medicine", "Dentistry", "Pharmacy", "Nursing", "Physiotherapy",
  "Nutrition & Dietetics", "Occupational Therapy", "Public Health",
  // Social Sciences & Humanities
  "Economics", "Business Administration", "Accounting", "Finance",
  "Management Information Systems", "Marketing",
  "Law", "Psychology", "Social Work", "Education",
  "Political Science", "Sociology", "Criminology",
  "History", "Philosophy", "Literature", "Linguistics",
  "Communication", "Journalism", "Film & Television",
  // Architecture & Design
  "Architecture", "Urban Planning", "Interior Design", "Industrial Design",
  // Other
  "Other",
];
const CHALLENGES = [
  { icon: "😶", text: "Hard to focus and stick to a plan" },
  { icon: "😵", text: "Too much material, don't know where to start" },
  { icon: "😅", text: "I understand but forget by exam time" },
  { icon: "😰", text: "Professor exams are unpredictable" },
  { icon: "🤯", text: "Math / formulas are hard to grasp" },
  { icon: "⏰", text: "I leave everything to the last day" },
];
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

const STEPS = [
  { key: "name",          question: (a: Answers) => "What should we call you?",                                         skippable: false },
  { key: "university",    question: (a: Answers) => a.name ? `${a.name.split(" ")[0]}, which university are you at?` : "Which university are you at?", skippable: true },
  { key: "semester",      question: () => "Which semester are you in?",                                                 skippable: true },
  { key: "field",         question: () => "What are you studying?",                                                     skippable: true },
  { key: "challenge",     question: () => "What's your biggest study challenge?",                                       skippable: true },
  { key: "learningStyle", question: () => "How do you learn best?",                                                     skippable: true },
  { key: "hours",         question: () => "How many hours a week can you study?",                                       skippable: true },
  { key: "goal",          question: () => "What's your main goal?",                                                     skippable: true },
] as const;

const TOTAL_STEPS = STEPS.length + 1; // +1 for done screen

// ── Logo ───────────────────────────────────────────────────────────────────
function AnimatedLogo({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={active ? { rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.08, 1.08, 1.05, 1, 1] } : { rotate: 0, scale: 1 }}
      transition={active ? { duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 } : { duration: 0.3 }}
      style={{ display: "inline-flex", filter: active ? "drop-shadow(0 0 12px rgba(79,142,247,0.6))" : "none", transition: "filter 0.3s" }}
    >
      <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
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
    </motion.div>
  );
}

// ── Typewriter hook ─────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 22) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    function type() {
      if (i < text.length) {
        i++;
        setDisplayed(text.slice(0, i));
        timer = setTimeout(type, speed);
      } else {
        setDone(true);
      }
    }
    timer = setTimeout(type, 120);
    return () => clearTimeout(timer);
  }, [text, speed]);

  return { displayed, done };
}

// ── Eraser hook — uses ref for onDone to avoid stale closure ────────────────
function useEraser(text: string, active: boolean, speed = 12, onDone?: () => void) {
  const [displayed, setDisplayed] = useState(text);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  useEffect(() => {
    if (!active) {
      setDisplayed(text);
      return;
    }
    let len = text.length;
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    function erase() {
      if (len > 0) {
        len--;
        setDisplayed(text.slice(0, len));
        timer = setTimeout(erase, speed);
      } else if (!done) {
        done = true;
        onDoneRef.current?.();
      }
    }
    timer = setTimeout(erase, 50);
    return () => clearTimeout(timer);
  }, [active, text]);

  return displayed;
}

// ── Animated question ────────────────────────────────────────────────────────
function QuestionText({
  text, erasing, onEraseDone, onTypeDone,
}: { text: string; erasing: boolean; onEraseDone: () => void; onTypeDone: () => void }) {
  const { displayed: typed, done: typeDone } = useTypewriter(text);
  const erased = useEraser(erasing ? (typed || text) : "", erasing, 12, onEraseDone);
  const shown = erasing ? erased : typed;

  useEffect(() => { if (typeDone) onTypeDone(); }, [typeDone]);

  return (
    <span style={{ fontSize: "clamp(1.35rem, 4vw, 1.85rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", lineHeight: 1.2 }}>
      {shown}
      {(!typeDone || erasing) && (
        <span style={{
          display: "inline-block", width: "3px", height: "1.05em",
          background: "linear-gradient(180deg, #4f8ef7, #a78bfa)",
          marginLeft: "3px", verticalAlign: "text-bottom", borderRadius: "2px",
          animation: "blink 0.7s step-end infinite",
        }} />
      )}
    </span>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    name: userName || "", university: "", semester: "", field: "",
    challenge: "", hours: "", goal: "", learningStyle: "",
  });
  const [saving, setSaving] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const pendingAnswer = useRef<{ key: keyof Answers; value: string } | null>(null);
  const pendingStep = useRef<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const isDone = step === STEPS.length;
  const currentStepDef = STEPS[step];
  const currentQuestion = currentStepDef ? currentStepDef.question(answers) : "";

  function handleTypeDone() { setWaiting(true); }

  const handleEraseDone = useCallback(() => {
    if (pendingAnswer.current) {
      const { key, value } = pendingAnswer.current;
      pendingAnswer.current = null;
      setAnswers(a => ({ ...a, [key]: value }));
    }
    const nextStep = pendingStep.current !== null ? pendingStep.current : null;
    pendingStep.current = null;
    setErasing(false);
    setWaiting(false);
    if (nextStep !== null) {
      setStep(nextStep);
    } else {
      setStep(s => s + 1);
    }
  }, []);

  function answer(key: keyof Answers, value: string, jumpTo?: number) {
    if (!waiting) return;
    pendingAnswer.current = { key, value };
    pendingStep.current = jumpTo ?? null;
    setWaiting(false);
    setErasing(true);
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => {});
  }

  function skip() {
    if (!waiting) return;
    const key = currentStepDef?.key as keyof Answers;
    pendingAnswer.current = { key, value: "" };
    pendingStep.current = null;
    setWaiting(false);
    setErasing(true);
  }

  async function skipAll() {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarded: true }),
    }).catch(() => {});
    router.push("/dashboard");
  }

  async function finish() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answers, onboarded: true }),
    }).catch(() => {});
    router.push("/dashboard");
  }

  const optBtn = (selected = false): React.CSSProperties => ({
    padding: "12px 16px", borderRadius: "12px",
    border: `1px solid ${selected ? "rgba(79,142,247,0.55)" : "rgba(255,255,255,0.09)"}`,
    background: selected ? "rgba(79,142,247,0.1)" : "rgba(255,255,255,0.03)",
    color: selected ? "var(--blue)" : "var(--text-secondary)",
    cursor: "pointer", transition: "all 0.12s", textAlign: "left" as const,
    fontSize: "14px", fontWeight: selected ? 600 : 400,
  });

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "5rem 1.5rem 2rem", position: "relative", overflow: "hidden",
    }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(79,142,247,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", background: "rgba(255,255,255,0.06)", zIndex: 10 }}>
        <motion.div
          animate={{ width: `${(step / STEPS.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ height: "100%", background: "linear-gradient(90deg, var(--blue), var(--purple))" }}
        />
      </div>

      {/* Header */}
      <div style={{ position: "fixed", top: "1.4rem", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "10px", zIndex: 10 }}>
        <AnimatedLogo active={!waiting && !isDone} />
        <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Proffy{" "}
          <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(99,102,241,0.13)", border: "1px solid rgba(99,102,241,0.28)", borderRadius: "4px", padding: "1px 5px" }}>BETA</span>
        </span>
      </div>

      {/* Step counter */}
      {!isDone && (
        <div style={{ position: "fixed", top: "1.6rem", right: "2rem", fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, zIndex: 10 }}>
          {step + 1} / {STEPS.length}
        </div>
      )}

      {/* Skip setup (top left) */}
      {!isDone && (
        <button
          onClick={skipAll}
          style={{ position: "fixed", top: "1.5rem", left: "2rem", fontSize: "12px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", zIndex: 10, padding: "4px 8px", borderRadius: "6px", transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          Skip setup
        </button>
      )}

      <div style={{ width: "100%", maxWidth: "520px", position: "relative", zIndex: 1 }}>

        {/* Question */}
        {!isDone && (
          <div style={{ minHeight: "80px", marginBottom: "2.5rem" }}>
            <QuestionText
              text={currentQuestion}
              erasing={erasing}
              onTypeDone={handleTypeDone}
              onEraseDone={handleEraseDone}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Answer panels ── */}
          {!isDone && waiting && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >

              {/* Step 0: Name */}
              {step === 0 && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    ref={nameRef}
                    autoFocus
                    type="text"
                    defaultValue={answers.name}
                    placeholder="Your first name"
                    maxLength={80}
                    onKeyDown={e => { if (e.key === "Enter") { const v = nameRef.current?.value.trim() ?? ""; if (v) answer("name", v); } }}
                    style={{ flex: 1, padding: "13px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-primary)", fontSize: "15px", outline: "none", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={() => { const v = nameRef.current?.value.trim() ?? ""; if (v) answer("name", v); }}
                    style={{ padding: "13px 18px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", color: "#fff", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}
                  >
                    →
                  </button>
                </div>
              )}

              {/* Step 1: University */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    {UNIVERSITIES.map(u => (
                      <button key={u} onClick={() => answer("university", u)} style={{ ...optBtn(), padding: "18px 8px", textAlign: "center", fontWeight: 600, fontSize: "13px" }}>{u}</button>
                    ))}
                  </div>
                  <button onClick={skip} style={{ ...optBtn(), padding: "11px 18px", fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Skip for now</button>
                </div>
              )}

              {/* Step 2: Semester */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {SEMESTERS.map(s => (
                    <button key={s.val} onClick={() => answer("semester", s.val)} style={{ ...optBtn(), padding: "15px 18px", fontSize: "14px", fontWeight: 600 }}>{s.label}</button>
                  ))}
                  <button onClick={skip} style={{ ...optBtn(), padding: "11px 18px", fontSize: "13px", color: "var(--text-muted)" }}>Skip for now</button>
                </div>
              )}

              {/* Step 3: Field of study */}
              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {FIELDS.map(f => (
                      <button key={f} onClick={() => answer("field", f)} style={{ ...optBtn(), padding: "11px 14px" }}>{f}</button>
                    ))}
                  </div>
                  <button onClick={skip} style={{ ...optBtn(), padding: "11px 18px", fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Skip for now</button>
                </div>
              )}

              {/* Step 4: Challenge */}
              {step === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {CHALLENGES.map(c => (
                    <button key={c.text} onClick={() => answer("challenge", c.text)} style={{ ...optBtn(), display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "20px", flexShrink: 0 }}>{c.icon}</span>
                      <span>{c.text}</span>
                    </button>
                  ))}
                  <button onClick={skip} style={{ ...optBtn(), padding: "11px 18px", fontSize: "13px", color: "var(--text-muted)" }}>Skip for now</button>
                </div>
              )}

              {/* Step 5: Learning style */}
              {step === 5 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { val: "visual",   icon: "🎨", title: "Visual & diagrams",    desc: "Graphs, tables, step-by-step breakdowns" },
                    { val: "practice", icon: "⚡", title: "Practice problems first", desc: "Throw examples at me, explain on the way" },
                    { val: "reading",  icon: "📖", title: "Thorough reading",      desc: "Full explanations before I try anything" },
                    { val: "mixed",    icon: "🔀", title: "Mix it up",             desc: "Varies by topic — let Proffy decide" },
                  ].map(o => (
                    <button key={o.val} onClick={() => answer("learningStyle", o.val)} style={{ ...optBtn(), display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "22px", flexShrink: 0 }}>{o.icon}</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "2px" }}>{o.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{o.desc}</div>
                      </div>
                    </button>
                  ))}
                  <button onClick={skip} style={{ ...optBtn(), padding: "11px 18px", fontSize: "13px", color: "var(--text-muted)" }}>Skip for now</button>
                </div>
              )}

              {/* Step 6: Hours */}
              {step === 6 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                    {["1–3h", "4–6h", "7–10h", "11–15h", "16–20h", "20h+"].map(h => (
                      <button key={h} onClick={() => answer("hours", h)} style={{ ...optBtn(), padding: "18px 8px", textAlign: "center", fontWeight: 600 }}>{h}</button>
                    ))}
                  </div>
                  <button onClick={skip} style={{ ...optBtn(), padding: "11px 18px", fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Skip for now</button>
                </div>
              )}

              {/* Step 7: Goal */}
              {step === 7 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { val: "pass",      icon: "✅", title: "Just pass",        desc: "Focus on the essentials, skip the extras" },
                    { val: "good",      icon: "⭐", title: "Good grade",        desc: "Solid understanding, aim for 80+" },
                    { val: "excellent", icon: "🏆", title: "Top of the class",  desc: "Deep mastery, full exam prep" },
                  ].map(o => (
                    <button key={o.val} onClick={() => answer("goal", o.val)} style={{ ...optBtn(), display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "22px", flexShrink: 0 }}>{o.icon}</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "2px" }}>{o.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{o.desc}</div>
                      </div>
                    </button>
                  ))}
                  <button onClick={skip} style={{ ...optBtn(), padding: "11px 18px", fontSize: "13px", color: "var(--text-muted)" }}>Skip for now</button>
                </div>
              )}

            </motion.div>
          )}

          {/* ── Done screen ── */}
          {isDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: "center" }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                style={{ fontSize: "4rem", marginBottom: "1.25rem" }}
              >
                🎓
              </motion.div>
              <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: "0.625rem" }}>
                {answers.name ? `You're all set, ${answers.name.split(" ")[0]}!` : "You're all set!"}
              </h1>
              <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.65, maxWidth: "360px", margin: "0 auto 2rem" }}>
                Proffy is personalised to your learning style and goals. Add your first course to get started.
              </p>

              {/* Summary */}
              {[
                { label: "University",     val: answers.university },
                { label: "Field",          val: answers.field },
                { label: "Learning style", val: ({ visual: "Visual & diagrams", practice: "Practice first", reading: "Thorough reading", mixed: "Mixed" } as Record<string,string>)[answers.learningStyle] ?? answers.learningStyle },
                { label: "Goal",           val: ({ pass: "Just pass", good: "Good grade", excellent: "Top of class" } as Record<string,string>)[answers.goal] ?? answers.goal },
                { label: "Study hours",    val: answers.hours ? answers.hours + " / week" : "" },
              ].filter(r => r.val).length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", padding: "16px 18px", marginBottom: "16px", textAlign: "left" }}>
                  {[
                    { label: "University",     val: answers.university },
                    { label: "Field",          val: answers.field },
                    { label: "Learning style", val: ({ visual: "Visual & diagrams", practice: "Practice first", reading: "Thorough reading", mixed: "Mixed" } as Record<string,string>)[answers.learningStyle] ?? answers.learningStyle },
                    { label: "Goal",           val: ({ pass: "Just pass", good: "Good grade", excellent: "Top of class" } as Record<string,string>)[answers.goal] ?? answers.goal },
                    { label: "Study hours",    val: answers.hours ? answers.hours + " / week" : "" },
                  ].filter(r => r.val).map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{r.label}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )}

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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
