"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";

/* ── Brand ─────────────────────────────────────────────────────────────── */
const G = {
  p:  "#16a34a",
  h:  "#22c55e",
  lt: "#4ade80",
  dim:    "rgba(22,163,74,0.12)",
  glow:   "rgba(22,163,74,0.22)",
  soft:   "rgba(22,163,74,0.07)",
  border: "rgba(22,163,74,0.18)",
  borderHi: "rgba(22,163,74,0.4)",
  grad: "linear-gradient(135deg,#16a34a,#22c55e)",
} as const;

const FONT = "var(--font-plus-jakarta),var(--font-inter),system-ui,sans-serif";
const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

/* ── Static data ────────────────────────────────────────────────────────── */
const UNIS = [
  { n: "TAU", c: "#22c55e" }, { n: "Technion", c: "#34d399" },
  { n: "HUJI", c: "#86efac" }, { n: "BGU", c: "#fbbf24" },
  { n: "Bar Ilan", c: "#fb923c" }, { n: "Ariel", c: "#a78bfa" },
];

const STEPS = [
  { num: "01", title: "Upload your material", desc: "Drop lecture slides, past exams, or a Google Drive link. Proffy indexes everything and learns your course inside out.", icon: "↑" },
  { num: "02", title: "Ask anything, get sourced answers", desc: "Ask in plain language. Every answer cites the exact slide or page from your material — no hallucinations, no generic advice.", icon: "?" },
  { num: "03", title: "Walk in ready", desc: "Flashcards with spaced repetition, exam countdown, and professor pattern analysis that tells you exactly what to expect.", icon: "✓" },
];

const FEATURES = [
  { title: "Knows your professor's exam style", desc: "Feed it past exams. It learns what Prof. Cohen always asks, how he phrases trick questions, and what appears every year.", tag: "Key differentiator", wide: true },
  { title: "Answers from your actual slides", desc: "Every answer cites the exact slide and page number. Not the internet — your course.", wide: false },
  { title: "Smart flashcards", desc: "Auto-generated with SM-2 spaced repetition. Reviews scheduled at exactly the right time.", wide: false },
  { title: "Personalized study plan", desc: "Tell it your exam date and hours. It builds a week-by-week schedule that intensifies as exam day approaches.", wide: false },
  { title: "Hebrew handwriting support", desc: "Snap a photo of handwritten Hebrew notes. The AI reads, explains, and quizzes you on them.", wide: false },
];

const TESTIMONIALS = [
  { initials: "YL", name: "Yonatan L.", role: "3rd year CS · TAU", grade: "+17 pts", quote: "Before Proffy I'd spend 3 hours before each exam guessing what Cohen would ask. Now I just ask and it tells me exactly which patterns show up every year. Got 91 on the midterm." },
  { initials: "MK", name: "Miriam K.", role: "2nd year Math · Technion", grade: "+22 pts", quote: "The flashcards are insane. It reads my entire lecture pack and auto-generates cards. My grade jumped from 74 to 96 in one semester — the spaced repetition actually works." },
  { initials: "OB", name: "Or B.", role: "4th year Econ · HUJI", grade: "+15 pts", quote: "I tried ChatGPT for my macro exam and it just made stuff up. Proffy cited slide 23 from Prof. Hazan's lecture and was right. Completely different experience." },
];

/* ── Logo ───────────────────────────────────────────────────────────────── */
function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="lg-prev" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16a34a" /><stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lg-prev)" />
      <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
      <path d="M9 20 A7 5.5 0 0 0 23 20Z" fill="white" fillOpacity=".8" />
      <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity=".5" />
      <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity=".6" />
      <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity=".6" />
    </svg>
  );
}

/* ── Count-up ───────────────────────────────────────────────────────────── */
function StatCounter({ target, suffix = "", label, fmt }: { target: number; suffix?: string; label: string; fmt?: (v: number) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 1600, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <div ref={ref} style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
      <div style={{ fontSize: "clamp(2.4rem,4.5vw,3.5rem)", fontWeight: 800, lineHeight: 1, color: G.h, letterSpacing: "-0.04em" }}>
        {fmt ? fmt(val) : val.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: "0.875rem", marginTop: "0.5rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ── Chat demo ──────────────────────────────────────────────────────────── */
function ChatDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setPhase(0);
      ts.push(setTimeout(() => setPhase(1), 800));
      ts.push(setTimeout(() => setPhase(2), 2100));
      ts.push(setTimeout(() => setPhase(3), 3500));
      ts.push(setTimeout(run, 8500));
    };
    run();
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--bg-surface)", border: `1px solid ${G.border}`, boxShadow: `0 40px 80px -16px rgba(0,0,0,0.85), 0 0 60px ${G.soft}` }}>
      {/* Chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "var(--bg-elevated)", borderBottom: `1px solid ${G.border}` }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "4px 16px", borderRadius: 6, fontSize: 11, display: "flex", alignItems: "center", gap: 6, background: "var(--bg-base)", color: "var(--text-muted)", border: `1px solid ${G.border}`, maxWidth: 300, width: "100%" }}>
            uni.proffy.study/course/data-structures
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: 380 }}>
        {/* Sidebar */}
        <div style={{ width: 185, flexShrink: 0, padding: 10, borderRight: `1px solid ${G.border}`, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", marginBottom: 4 }}>
            <Logo size={18} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>Proffy</span>
          </div>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-muted)", padding: "0 10px 4px" }}>Courses</div>
          {[{ n: "Data Structures", d: 12, a: true }, { n: "Algorithms", d: 28, a: false }, { n: "Operating Systems", d: 45, a: false }].map(c => (
            <div key={c.n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 9, fontSize: 11, background: c.a ? G.dim : "transparent", border: `1px solid ${c.a ? G.border : "transparent"}`, color: c.a ? G.h : "var(--text-secondary)" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontWeight: c.a ? 600 : 400 }}>{c.n}</span>
              <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 5px", borderRadius: 4, marginLeft: 4, flexShrink: 0, color: c.d <= 14 ? "#fbbf24" : "#34d399", background: c.d <= 14 ? "rgba(251,191,36,0.1)" : "rgba(52,211,153,0.1)" }}>{c.d}d</span>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderBottom: `1px solid ${G.border}` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Data Structures</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Prof. Cohen · TAU</span>
          </div>

          <div style={{ flex: 1, overflow: "hidden", padding: "18px 18px 10px", display: "flex", flexDirection: "column", gap: 14 }}>
            {phase >= 1 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <div style={{ maxWidth: 230, padding: "9px 13px", borderRadius: "14px 14px 4px 14px", fontSize: 12, lineHeight: 1.55, background: G.p, color: "#fff" }}>
                  What will Cohen ask about trees on the exam?
                </div>
                <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>Y</div>
              </motion.div>
            )}

            {phase === 2 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: G.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><Logo size={12} /></div>
                <div style={{ padding: "10px 14px", borderRadius: "4px 14px 14px 14px", background: "var(--bg-elevated)", border: `1px solid ${G.border}`, display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                      style={{ width: 5, height: 5, borderRadius: "50%", background: G.h }} />
                  ))}
                </div>
              </motion.div>
            )}

            {phase >= 3 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: G.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><Logo size={12} /></div>
                <div style={{ flex: 1, padding: "11px 13px", borderRadius: "4px 14px 14px 14px", fontSize: 12, lineHeight: 1.65, background: "var(--bg-elevated)", border: `1px solid ${G.border}` }}>
                  <p style={{ color: "var(--text-primary)", margin: 0 }}>
                    Based on Cohen&apos;s <strong>last 4 exams</strong>, he asks about{" "}
                    <strong style={{ color: G.h }}>AVL rotations</strong> and{" "}
                    <strong style={{ color: G.h }}>amortized analysis</strong> every year — 20 pts each.
                  </p>
                  <p style={{ marginTop: 5, fontStyle: "italic", fontSize: 11, color: "var(--text-muted)" }}>&ldquo;Prove the time complexity of...&rdquo; — 2021, 2022, 2023.</p>
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500, background: G.dim, color: G.h, border: `1px solid ${G.border}` }}>
                    Cohen_exam_2023.pdf · Slide 14
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div style={{ padding: "12px 14px", borderTop: `1px solid ${G.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "var(--bg-elevated)", border: `1px solid ${G.border}` }}>
              <span style={{ flex: 1, fontSize: 12, color: "var(--text-muted)" }}>Ask about Data Structures…</span>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: G.p, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 155, flexShrink: 0, padding: 10, borderLeft: `1px solid ${G.border}`, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ borderRadius: 10, padding: "10px 12px", background: "var(--bg-elevated)", border: `1px solid ${G.border}` }}>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 6 }}>Exam countdown</div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: "#fbbf24" }}>12</div>
            <div style={{ fontSize: "9px", marginTop: 2, color: "var(--text-muted)" }}>days remaining</div>
            <div style={{ marginTop: 8, height: 3, borderRadius: 3, background: "var(--border)" }}>
              <div style={{ height: 3, borderRadius: 3, width: "72%", background: `linear-gradient(90deg,${G.p},${G.lt})` }} />
            </div>
          </div>
          <div style={{ borderRadius: 10, padding: "10px 12px", background: "var(--bg-elevated)", border: `1px solid ${G.border}` }}>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 8 }}>Cohen always asks</div>
            {[{ t: "AVL Trees", p: 90 }, { t: "Heaps", p: 75 }, { t: "Amortized", p: 60 }].map(x => (
              <div key={x.t} style={{ marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>{x.t}</span>
                  <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>{x.p}%</span>
                </div>
                <div style={{ height: 2.5, borderRadius: 2, background: "var(--border)" }}>
                  <div style={{ height: 2.5, borderRadius: 2, width: `${x.p}%`, background: G.p }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Fade-up section wrapper ────────────────────────────────────────────── */
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Sticky bar ─────────────────────────────────────────────────────────── */
function StickyBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE }}
      style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 100, display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", borderRadius: 999, background: "rgba(6,13,6,0.92)", backdropFilter: "blur(20px)", border: `1px solid ${G.borderHi}`, boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 30px ${G.soft}` }}
    >
      <Logo size={22} />
      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" as const }}>Ready to ace your exams?</span>
      <Link href="/register" style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 1.25rem", borderRadius: 999, background: G.grad, color: "#fff", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", whiteSpace: "nowrap" as const }}>
        Start free →
      </Link>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function PreviewPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: FONT, overflowX: "hidden" }}>

      {/* Background glows */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: 900, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(22,163,74,0.22) 0%,transparent 65%)", filter: "blur(80px)" }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          style={{ position: "absolute", bottom: "15%", right: "-5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(74,222,128,0.1) 0%,transparent 70%)", filter: "blur(80px)" }}
        />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle,rgba(22,163,74,0.055) 1px,transparent 1px)", backgroundSize: "28px 28px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%,black 20%,transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%,black 20%,transparent 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(22,163,74,0.55),rgba(74,222,128,0.4),transparent)" }} />
      </div>

      <StickyBar />

      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, backdropFilter: "blur(20px)", background: "rgba(6,13,6,0.85)", borderBottom: `1px solid ${G.border}` }}
      >
        <div style={{ maxWidth: "76rem", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Logo size={28} />
            <span style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>Proffy</span>
            <span style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: G.p, background: G.dim, border: `1px solid ${G.border}`, borderRadius: 4, padding: "2px 5px" }}>BETA</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href="/login" style={{ fontSize: "0.875rem", fontWeight: 600, padding: "0.5rem 1rem", borderRadius: "0.65rem", color: "var(--text-secondary)", textDecoration: "none", border: `1px solid ${G.border}` }}>Sign in</Link>
            <Link href="/register" style={{ fontSize: "0.875rem", fontWeight: 700, padding: "0.5rem 1.25rem", borderRadius: "0.65rem", color: "#fff", textDecoration: "none", background: G.grad, boxShadow: `0 2px 12px ${G.glow}` }}>Get started</Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "9rem 1.5rem 5rem" }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0.4rem 1rem", borderRadius: 999, background: G.dim, border: `1px solid ${G.border}`, fontSize: "0.78rem", fontWeight: 700, color: G.h, marginBottom: "2rem" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.h, boxShadow: `0 0 8px ${G.h}` }} />
          Now live for Israeli university students
        </motion.div>

        {/* Headline — word by word */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          style={{ fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.05, maxWidth: "54rem", fontSize: "clamp(3rem,7vw,5.5rem)", margin: 0, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.28em" }}
        >
          {["The", "AI", "tutor", "that"].map((w, i) => (
            <motion.span key={i} variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
              style={{ display: "inline-block" }}>{w}</motion.span>
          ))}
          {["knows", "your", "professor"].map((w, i) => (
            <motion.span key={`g${i}`} variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
              style={{ display: "inline-block", background: `linear-gradient(135deg,${G.p},${G.lt})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{w}</motion.span>
          ))}
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.55 }}
          style={{ marginTop: "1.75rem", fontSize: "1.2rem", maxWidth: "34rem", lineHeight: 1.75, color: "var(--text-secondary)" }}>
          Chat with an AI that knows your course, your professor, and your exam. Get sourced answers that match what actually shows up.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.5 }}
          style={{ marginTop: "2.5rem", display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/register" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.05rem", fontWeight: 700, padding: "0.9rem 2.5rem", borderRadius: "1rem", background: G.grad, color: "#fff", textDecoration: "none", boxShadow: `0 4px 24px ${G.glow}` }}>
            Start studying free →
          </Link>
          <Link href="/login" style={{ fontSize: "1rem", fontWeight: 600, padding: "0.875rem 1.75rem", borderRadius: "1rem", background: "var(--bg-elevated)", border: `1px solid ${G.border}`, color: "var(--text-secondary)", textDecoration: "none" }}>
            Sign in
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.6 }}
          style={{ marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text-muted)" }}>Trusted by students at</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {UNIS.map(u => <div key={u.n} style={{ padding: "4px 12px", borderRadius: 7, background: u.c + "10", border: `1px solid ${u.c}28`, fontSize: "11px", fontWeight: 700, color: u.c }}>{u.n}</div>)}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.5, duration: 0.7, ease: EASE }}
          style={{ marginTop: "4.5rem", width: "100%", maxWidth: 980 }}>
          <ChatDemo />
          <div style={{ height: 36, margin: "0 24px", opacity: 0.1, borderRadius: "0 0 16px 16px", background: `linear-gradient(to bottom,${G.glow},transparent)` }} />
        </motion.div>
      </section>

      {/* Stats */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${G.border}`, borderBottom: `1px solid ${G.border}`, background: "rgba(6,13,6,0.6)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          <StatCounter target={2400} suffix="+" label="Students active" />
          <StatCounter target={6} label="Universities" />
          <StatCounter target={1.2} suffix="M+" label="Questions answered" fmt={v => `${v.toFixed(1)}M`} />
          <StatCounter target={94} suffix="%" label="Grade improvement reported" />
        </div>
      </section>

      {/* How it works */}
      <section style={{ position: "relative", zIndex: 10, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: G.dim, color: G.h, border: `1px solid ${G.border}`, marginBottom: "1.25rem" }}>How it works</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                From slides to exam-ready{" "}
                <span style={{ background: `linear-gradient(135deg,${G.p},${G.lt})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>in minutes</span>
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>
            {STEPS.map((s, i) => (
              <FadeUp key={s.num} delay={i * 0.1}>
                <div style={{ borderRadius: "1.5rem", padding: "2.5rem 2rem", background: "var(--bg-surface)", border: `1px solid ${G.border}`, position: "relative", overflow: "hidden", height: "100%" }}>
                  <div style={{ position: "absolute", top: "1.5rem", right: "2rem", fontSize: "4.5rem", fontWeight: 900, color: G.p, opacity: 0.06, fontFamily: "monospace", lineHeight: 1, userSelect: "none" as const }}>{i + 1}</div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: G.dim, border: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", marginBottom: "1.5rem" }}>{s.icon}</div>
                  <div style={{ display: "inline-block", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: G.p, background: G.dim, border: `1px solid ${G.border}`, borderRadius: 5, padding: "2px 8px", marginBottom: "1rem" }}>{s.num}</div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.875rem", color: "var(--text-primary)" }}>{s.title}</h3>
                  <p style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "var(--text-muted)" }}>{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${G.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: G.dim, color: G.h, border: `1px solid ${G.border}`, marginBottom: "1.25rem" }}>Features</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                Not another chatbot.{" "}
                <span style={{ background: `linear-gradient(135deg,${G.p},${G.lt})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>A tutor that knows your course.</span>
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.08}>
                <div style={{ position: "relative", borderRadius: "1.25rem", padding: "2rem", background: "var(--bg-surface)", border: `1px solid ${G.border}`, gridColumn: f.wide ? "span 2" : undefined, height: "100%" }}>
                  {f.tag && <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 999, background: G.dim, color: G.h, border: `1px solid ${G.border}` }}>{f.tag}</div>}
                  <h3 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.6rem", color: "var(--text-primary)" }}>{f.title}</h3>
                  <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-muted)" }}>{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${G.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: G.dim, color: G.h, border: `1px solid ${G.border}`, marginBottom: "1.25rem" }}>Student stories</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
                Real students.{" "}
                <span style={{ background: `linear-gradient(135deg,${G.p},${G.lt})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Real results.</span>
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem" }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.1}>
                <div style={{ borderRadius: "1.25rem", padding: "2rem", background: "var(--bg-surface)", border: `1px solid ${G.border}`, display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%" }}>
                  <p style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "var(--text-secondary)", flex: 1 }}>&ldquo;{t.quote}&rdquo;</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: G.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>{t.initials}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>{t.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 1 }}>{t.role}</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)", flexShrink: 0 }}>{t.grade}</div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${G.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "60rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: G.dim, color: G.h, border: `1px solid ${G.border}`, marginBottom: "1.25rem" }}>Pricing</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.875rem" }}>Start free. Upgrade when ready.</h2>
              <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>Cancel anytime. No contracts.</p>
            </div>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {[
              { name: "Free", price: null, features: ["10 questions per day", "Upload up to 3 courses", "Basic flashcards", "Source-cited answers"], highlight: false, href: "/register" },
              { name: "Pro", price: "79", features: ["Unlimited questions", "Unlimited courses", "Smart flashcards + study plan", "Exam prep mode", "Professor fingerprinting"], highlight: true, href: "/register?plan=pro" },
              { name: "Max", price: "149", features: ["Everything in Pro", "Study groups", "Exam predictions", "Telegram bot access", "Priority support"], highlight: false, href: "/register?plan=max" },
            ].map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 0.1}>
                <div style={{ position: "relative", borderRadius: "1.5rem", padding: "2.25rem", display: "flex", flexDirection: "column", background: plan.highlight ? "linear-gradient(145deg,rgba(22,163,74,0.1),rgba(34,197,94,0.05))" : "var(--bg-surface)", border: `1px solid ${plan.highlight ? G.borderHi : G.border}`, boxShadow: plan.highlight ? `0 0 60px ${G.soft}` : "none", height: "100%" }}>
                  {plan.highlight && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", padding: "0.25rem 1rem", borderRadius: "0 0 0.75rem 0.75rem", fontSize: "0.68rem", fontWeight: 700, background: G.grad, color: "#fff" }}>Most popular</div>}
                  <div style={{ marginTop: "0.5rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "2.25rem", color: "var(--text-primary)", letterSpacing: "-0.04em" }}>{plan.price ? `₪${plan.price}` : "Free"}</span>
                    {plan.price && <span style={{ fontSize: "0.875rem", marginLeft: "0.4rem", color: "var(--text-muted)" }}>/month</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.25rem", marginBottom: "1.75rem", color: "var(--text-secondary)" }}>{plan.name}</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "2rem" }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem", fontSize: "0.9rem" }}>
                        <span style={{ flexShrink: 0, color: G.h, fontWeight: 700 }}>✓</span>
                        <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={plan.href} style={{ display: "block", textAlign: "center", padding: "0.85rem 1.5rem", borderRadius: "0.875rem", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", background: plan.highlight ? G.grad : "var(--bg-elevated)", color: plan.highlight ? "#fff" : "var(--text-secondary)", border: `1px solid ${plan.highlight ? "transparent" : G.border}`, boxShadow: plan.highlight ? `0 4px 20px ${G.glow}` : "none" }}>
                    {plan.price ? `Get ${plan.name}` : "Start free"}
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ position: "relative", zIndex: 10, padding: "7rem 1.5rem" }}>
        <FadeUp>
          <div style={{ maxWidth: "52rem", margin: "0 auto", textAlign: "center", padding: "4rem 2rem", borderRadius: "2rem", border: `1px solid ${G.borderHi}`, background: `radial-gradient(ellipse at 50% 0%,rgba(22,163,74,0.12),transparent 70%)`, position: "relative", overflow: "hidden" }}>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
              Your next exam is closer<br />
              <span style={{ background: `linear-gradient(135deg,${G.p},${G.lt})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>than you think.</span>
            </h2>
            <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "2.5rem", maxWidth: "32rem", margin: "0 auto 2.5rem" }}>
              Join thousands of Israeli students who already know what Cohen will ask on the exam.
            </p>
            <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "1.1rem", fontWeight: 700, padding: "1rem 2.75rem", borderRadius: "1rem", background: G.grad, color: "#fff", textDecoration: "none", boxShadow: `0 6px 30px ${G.glow}` }}>
              Start studying free →
            </Link>
            <p style={{ marginTop: "1.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>No credit card required. Free forever.</p>
          </div>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${G.border}`, padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo size={22} />
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Proffy</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>· Built for every student</span>
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {["Privacy", "Terms", "Contact"].map(l => <Link key={l} href="#" style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}>{l}</Link>)}
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>© {new Date().getFullYear()} Proffy</span>
        </div>
      </footer>
    </div>
  );
}
