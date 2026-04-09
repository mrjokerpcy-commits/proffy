"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";

/* ── Tokens ─────────────────────────────────────────────────────────────── */
const C = {
  p:        "#4f8ef7",
  lt:       "#a78bfa",
  dim:      "rgba(79,142,247,0.08)",
  dimMd:    "rgba(79,142,247,0.14)",
  glow:     "rgba(79,142,247,0.28)",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(79,142,247,0.32)",
  grad:     "linear-gradient(135deg,#4f8ef7,#a78bfa)",
} as const;

const FONT = "var(--font-plus-jakarta),var(--font-inter),system-ui,sans-serif";
const EASE: [number,number,number,number] = [0.25, 0.1, 0.25, 1];

/* ── Icons ──────────────────────────────────────────────────────────────── */
const IcGradCap = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const IcBrain = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-3.14Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 17.5 2Z"/>
  </svg>
);
const IcPen = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const IcScroll = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);
const IcTarget = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IcLink = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IcLayers = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
  </svg>
);
const IcCalendar = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcScan = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
  </svg>
);

/* ── Data ───────────────────────────────────────────────────────────────── */
const PRODUCTS = [
  {
    icon: <IcGradCap />,
    name: "Proffy Uni",
    href: "/register",
    badge: "Live",
    badgeColor: "#22c55e",
    badgeBg: "rgba(34,197,94,0.1)",
    badgeBorder: "rgba(34,197,94,0.25)",
    tagline: "University",
    desc: "AI tutor that knows your professor, your course slides, and exactly what shows up on every exam.",
  },
  {
    icon: <IcBrain />,
    name: "Proffy Psycho",
    href: "#",
    badge: "Beta",
    badgeColor: "#fbbf24",
    badgeBg: "rgba(251,191,36,0.1)",
    badgeBorder: "rgba(251,191,36,0.25)",
    tagline: "Psychometric",
    desc: "Replace ₪3,000 prep courses. Full AI-powered prep for verbal, quantitative, and English sections.",
  },
  {
    icon: <IcPen />,
    name: "Proffy Yael",
    href: "#",
    badge: "Soon",
    badgeColor: "var(--text-muted)",
    badgeBg: "rgba(255,255,255,0.05)",
    badgeBorder: "rgba(255,255,255,0.1)",
    tagline: "Hebrew",
    desc: "Master Hebrew spelling, grammar, and academic writing. Built for the psychometric Hebrew section.",
  },
  {
    icon: <IcScroll />,
    name: "Proffy Bagrut",
    href: "#",
    badge: "Soon",
    badgeColor: "var(--text-muted)",
    badgeBg: "rgba(255,255,255,0.05)",
    badgeBorder: "rgba(255,255,255,0.1)",
    tagline: "High school",
    desc: "AI prep for every Bagrut subject, trained on past Ministry of Education exam question patterns.",
  },
];

const UNIS = ["TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Ariel"];

const STEPS = [
  { num: "01", title: "Upload your material", desc: "Drop lecture slides, past exams, or a Google Drive link. Proffy indexes everything and learns your course inside out." },
  { num: "02", title: "Ask anything, get sourced answers", desc: "Every answer cites the exact slide or page from your material. No hallucinations, no generic advice." },
  { num: "03", title: "Walk in ready", desc: "Flashcards with spaced repetition, professor pattern analysis, and an exam countdown that tells you exactly what to focus on." },
];

const FEATURES = [
  { icon: <IcTarget />, title: "Knows your professor's exam style", desc: "Feed it past exams. It learns what Prof. Cohen always asks, how he phrases trick questions, and what appears every year.", tag: "Core differentiator", wide: true },
  { icon: <IcLink />, title: "Answers from your actual slides", desc: "Every answer cites the exact slide and page number. Your course material, not the internet.", wide: false },
  { icon: <IcLayers />, title: "Smart flashcards", desc: "Auto-generated with SM-2 spaced repetition. Reviews scheduled at exactly the right time.", wide: false },
  { icon: <IcCalendar />, title: "Personalized study plan", desc: "Tell it your exam date and available hours. It builds a weekly schedule that intensifies as the exam approaches.", wide: false },
  { icon: <IcScan />, title: "Hebrew handwriting support", desc: "Snap a photo of handwritten Hebrew notes. The AI reads, explains, and quizzes you on them.", wide: false },
];

const TESTIMONIALS = [
  { initials: "YL", name: "Yonatan L.", role: "3rd year CS · TAU", grade: "+17 pts", quote: "Before Proffy I'd spend 3 hours guessing what Cohen would ask. Now I just ask and it tells me exactly which patterns show up every year. Got 91 on the midterm." },
  { initials: "MK", name: "Miriam K.", role: "2nd year Math · Technion", grade: "+22 pts", quote: "It reads my entire lecture pack and auto-generates flashcards. My grade jumped from 74 to 96 in one semester. The spaced repetition actually works." },
  { initials: "OB", name: "Or B.", role: "4th year Econ · HUJI", grade: "+15 pts", quote: "I tried ChatGPT and it made stuff up. Proffy cited slide 23 from Prof. Hazan's lecture and was right. Completely different experience." },
];

/* ── Stat counter ───────────────────────────────────────────────────────── */
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
      <div style={{ fontSize: "clamp(2.2rem,4vw,3.2rem)", fontWeight: 800, lineHeight: 1, background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "-0.04em" }}>
        {fmt ? fmt(val) : val.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.02em" }}>{label}</div>
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
    <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--bg-surface)", border: `1px solid ${C.border}`, boxShadow: `0 40px 80px -16px rgba(0,0,0,0.9), 0 0 60px rgba(79,142,247,0.06)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "var(--bg-elevated)", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "4px 16px", borderRadius: 6, fontSize: 11, display: "flex", alignItems: "center", gap: 6, background: "var(--bg-base)", color: "var(--text-muted)", border: `1px solid ${C.border}`, maxWidth: 320, width: "100%" }}>
            uni.proffy.study/course/data-structures
          </div>
        </div>
      </div>
      <div style={{ display: "flex", height: 380 }}>
        {/* Sidebar */}
        <div style={{ width: 185, flexShrink: 0, padding: 10, borderRight: `1px solid ${C.border}`, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", marginBottom: 4 }}>
            <Image src="/logo-owl.png" alt="Proffy" width={22} height={22} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>Proffy</span>
          </div>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-muted)", padding: "0 10px 4px" }}>Courses</div>
          {[{ n: "Data Structures", d: 12, a: true }, { n: "Algorithms", d: 28, a: false }, { n: "Operating Systems", d: 45, a: false }].map(c => (
            <div key={c.n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 9, fontSize: 11, background: c.a ? "rgba(79,142,247,0.1)" : "transparent", border: `1px solid ${c.a ? C.border : "transparent"}`, color: c.a ? C.p : "var(--text-secondary)" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontWeight: c.a ? 600 : 400 }}>{c.n}</span>
              <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 5px", borderRadius: 4, marginLeft: 4, flexShrink: 0, color: c.d <= 14 ? "#fbbf24" : "#34d399", background: c.d <= 14 ? "rgba(251,191,36,0.1)" : "rgba(52,211,153,0.1)" }}>{c.d}d</span>
            </div>
          ))}
        </div>
        {/* Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Data Structures</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Prof. Cohen · TAU</span>
          </div>
          <div style={{ flex: 1, overflow: "hidden", padding: "18px 18px 10px", display: "flex", flexDirection: "column", gap: 14 }}>
            {phase >= 1 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <div style={{ maxWidth: 230, padding: "9px 13px", borderRadius: "14px 14px 4px 14px", fontSize: 12, lineHeight: 1.55, background: C.grad, color: "#fff" }}>
                  What will Cohen ask about trees on the exam?
                </div>
                <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>Y</div>
              </motion.div>
            )}
            {phase === 2 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Image src="/logo-owl.png" alt="Proffy" width={26} height={26} style={{ borderRadius: 8, flexShrink: 0, objectFit: "contain" }} />
                <div style={{ padding: "10px 14px", borderRadius: "4px 14px 14px 14px", background: "var(--bg-elevated)", border: `1px solid ${C.border}`, display: "flex", gap: 4 }}>
                  {[0,1,2].map(i => (
                    <motion.div key={i} animate={{ y: [0,-4,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                      style={{ width: 5, height: 5, borderRadius: "50%", background: C.p }} />
                  ))}
                </div>
              </motion.div>
            )}
            {phase >= 3 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Image src="/logo-owl.png" alt="Proffy" width={26} height={26} style={{ borderRadius: 8, flexShrink: 0, objectFit: "contain" }} />
                <div style={{ flex: 1, padding: "11px 13px", borderRadius: "4px 14px 14px 14px", fontSize: 12, lineHeight: 1.65, background: "var(--bg-elevated)", border: `1px solid ${C.border}` }}>
                  <p style={{ color: "var(--text-primary)", margin: 0 }}>
                    Based on Cohen&apos;s <strong>last 4 exams</strong>, he asks about{" "}
                    <strong style={{ color: C.p }}>AVL rotations</strong> and{" "}
                    <strong style={{ color: C.lt }}>amortized analysis</strong> every year — 20 pts each.
                  </p>
                  <p style={{ marginTop: 5, fontStyle: "italic", fontSize: 11, color: "var(--text-muted)" }}>&ldquo;Prove the time complexity of...&rdquo; — 2021, 2022, 2023.</p>
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500, background: C.dim, color: C.p, border: `1px solid ${C.border}` }}>
                    Cohen_exam_2023.pdf · Slide 14
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "var(--bg-elevated)", border: `1px solid ${C.border}` }}>
              <span style={{ flex: 1, fontSize: 12, color: "var(--text-muted)" }}>Ask about Data Structures...</span>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: C.grad, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </div>
          </div>
        </div>
        {/* Right panel */}
        <div style={{ width: 155, flexShrink: 0, padding: 10, borderLeft: `1px solid ${C.border}`, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ borderRadius: 10, padding: "10px 12px", background: "var(--bg-elevated)", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 6 }}>Exam countdown</div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: "#fbbf24" }}>12</div>
            <div style={{ fontSize: "9px", marginTop: 2, color: "var(--text-muted)" }}>days remaining</div>
            <div style={{ marginTop: 8, height: 3, borderRadius: 3, background: "var(--border)" }}>
              <div style={{ height: 3, borderRadius: 3, width: "72%", background: C.grad }} />
            </div>
          </div>
          <div style={{ borderRadius: 10, padding: "10px 12px", background: "var(--bg-elevated)", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 8 }}>Cohen always asks</div>
            {[{ t: "AVL Trees", p: 90 }, { t: "Heaps", p: 75 }, { t: "Amortized", p: 60 }].map(x => (
              <div key={x.t} style={{ marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>{x.t}</span>
                  <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>{x.p}%</span>
                </div>
                <div style={{ height: 2.5, borderRadius: 2, background: "var(--border)" }}>
                  <div style={{ height: 2.5, borderRadius: 2, width: `${x.p}%`, background: C.grad }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── FadeUp ─────────────────────────────────────────────────────────────── */
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
      style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 100, display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 0.75rem 0.75rem 1.25rem", borderRadius: 999, background: "rgba(6,8,20,0.95)", backdropFilter: "blur(24px)", border: `1px solid ${C.borderHi}`, boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 30px rgba(79,142,247,0.06)` }}
    >
      <Image src="/logo-owl.png" alt="Proffy" width={28} height={28} style={{ objectFit: "contain" }} />
      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" as const }}>Ready to ace your exams?</span>
      <Link href="/register" style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 1.25rem", borderRadius: 999, background: C.grad, color: "#fff", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", whiteSpace: "nowrap" as const, cursor: "pointer" }}>
        Start free →
      </Link>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function PreviewPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: FONT, overflowX: "hidden" }}>

      {/* Background — single clean aurora, no animated blobs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 120% 55% at 60% -5%, rgba(79,142,247,0.11) 0%, rgba(167,139,250,0.05) 45%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(79,142,247,0.5),rgba(167,139,250,0.4),transparent)" }} />
      </div>

      <StickyBar />

      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, backdropFilter: "blur(20px)", background: "rgba(6,8,20,0.85)", borderBottom: `1px solid ${C.border}` }}
      >
        <div style={{ maxWidth: "76rem", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Image src="/logo-header-dark.png" alt="Proffy" width={110} height={36} style={{ objectFit: "contain", objectPosition: "left" }} />
          </Link>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href="/login" style={{ fontSize: "0.875rem", fontWeight: 600, padding: "0.5rem 1rem", borderRadius: "0.65rem", color: "var(--text-secondary)", textDecoration: "none", border: `1px solid ${C.border}`, cursor: "pointer" }}>Sign in</Link>
            <Link href="/register" style={{ fontSize: "0.875rem", fontWeight: 700, padding: "0.5rem 1.25rem", borderRadius: "0.65rem", color: "#fff", textDecoration: "none", background: C.grad, boxShadow: `0 2px 12px ${C.glow}`, cursor: "pointer" }}>Get started</Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: "82rem", margin: "0 auto", padding: "9rem 1.5rem 5rem", display: "flex", alignItems: "center", gap: "3rem" }}>
        {/* Left */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0.4rem 1rem", borderRadius: 999, background: C.dim, border: `1px solid ${C.border}`, fontSize: "0.78rem", fontWeight: 700, color: C.p, marginBottom: "2rem" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.p, boxShadow: `0 0 8px ${C.p}` }} />
            Now live for Israeli students
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            style={{ fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.08, fontSize: "clamp(2.8rem,5vw,4.6rem)", margin: 0 }}
          >
            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              style={{ display: "block" }}>The AI tutor that</motion.span>
            <motion.span
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.15 } } }}
              style={{ display: "block", background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >
              knows your exam.
            </motion.span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.55 }}
            style={{ marginTop: "1.75rem", fontSize: "1.15rem", maxWidth: "36rem", lineHeight: 1.8, color: "var(--text-secondary)" }}>
            University, psychometric, Bagrut. One platform that knows your professor, your slides, and exactly what shows up on every exam.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.5 }}
            style={{ marginTop: "2.5rem", display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap" as const }}>
            <Link href="/register" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.05rem", fontWeight: 700, padding: "0.9rem 2.5rem", borderRadius: "1rem", background: C.grad, color: "#fff", textDecoration: "none", boxShadow: `0 4px 24px ${C.glow}`, cursor: "pointer" }}>
              Start studying free →
            </Link>
            <Link href="/login" style={{ fontSize: "1rem", fontWeight: 600, padding: "0.875rem 1.75rem", borderRadius: "1rem", background: "var(--bg-elevated)", border: `1px solid ${C.border}`, color: "var(--text-secondary)", textDecoration: "none", cursor: "pointer" }}>
              Sign in
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25, duration: 0.6 }}
            style={{ marginTop: "2.25rem", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text-muted)" }}>Trusted by students at</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
              {UNIS.map(u => (
                <div key={u} style={{ padding: "4px 12px", borderRadius: 7, background: "rgba(79,142,247,0.06)", border: `1px solid rgba(79,142,247,0.14)`, fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>{u}</div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right — mascot */}
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.9, ease: EASE }}
          style={{ flexShrink: 0, width: "clamp(240px,30vw,400px)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ position: "absolute", inset: "5%", borderRadius: "50%", background: "radial-gradient(circle,rgba(79,142,247,0.2) 0%,rgba(167,139,250,0.08) 50%,transparent 70%)", filter: "blur(60px)" }} />
          <motion.div
            animate={{ y: [0,-12,0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "relative", zIndex: 1 }}
          >
            <Image
              src="/mascot/meet-tall.png"
              alt="Proffy owl mascot"
              width={400}
              height={500}
              style={{ width: "100%", height: "auto", filter: "drop-shadow(0 24px 60px rgba(79,142,247,0.3))" }}
              priority
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: "rgba(6,8,20,0.5)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {[
            { target: 2400, suffix: "+", label: "Students active", fmt: undefined },
            { target: 6, suffix: "", label: "Universities", fmt: undefined },
            { target: 1.2, suffix: "M+", label: "Questions answered", fmt: (v: number) => `${v.toFixed(1)}M` },
            { target: 94, suffix: "%", label: "Grade improvement reported", fmt: undefined },
          ].map((s, i) => (
            <div key={i} style={{ borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
              <StatCounter {...s} />
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section style={{ position: "relative", zIndex: 10, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: C.dim, color: C.p, border: `1px solid ${C.border}`, marginBottom: "1.25rem" }}>One platform</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                Every exam.{" "}
                <span style={{ background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Every stage.</span>
              </h2>
              <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", marginTop: "1rem", maxWidth: "34rem", margin: "1rem auto 0" }}>
                From high school Bagrut to university finals and psychometric prep. Proffy covers every exam Israeli students face.
              </p>
            </div>
          </FadeUp>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
            {PRODUCTS.map((p, i) => (
              <FadeUp key={p.name} delay={i * 0.1}>
                <div style={{ borderRadius: "1.25rem", padding: "1.75rem", background: "var(--bg-surface)", border: `1px solid ${C.border}`, position: "relative", display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%", overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderHi)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                  {/* Top accent line — brand gradient, same on all cards */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: C.grad }} />
                  {/* Badge */}
                  <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", fontSize: "0.63rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 999, background: p.badgeBg, color: p.badgeColor, border: `1px solid ${p.badgeBorder}` }}>{p.badge}</div>
                  {/* Icon */}
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.dim, border: `1px solid ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.p, flexShrink: 0 }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.p, marginBottom: "0.4rem" }}>{p.tagline}</div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: "0.75rem" }}>{p.name}</h3>
                    <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "var(--text-muted)" }}>{p.desc}</p>
                  </div>
                  <Link href={p.href} style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.85rem", fontWeight: 700, color: C.p, textDecoration: "none", cursor: "pointer" }}>
                    {p.badge === "Live" ? "Start free →" : "Get notified →"}
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Chat demo */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${C.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: C.dim, color: C.p, border: `1px solid ${C.border}`, marginBottom: "1.25rem" }}>See it live</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                Ask Proffy anything.{" "}
                <span style={{ background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Get sourced answers.</span>
              </h2>
            </div>
          </FadeUp>
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: EASE }}
            style={{ width: "100%", maxWidth: 980, margin: "0 auto" }}>
            <ChatDemo />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${C.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: C.dim, color: C.p, border: `1px solid ${C.border}`, marginBottom: "1.25rem" }}>How it works</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                From slides to exam-ready{" "}
                <span style={{ background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>in minutes</span>
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem" }}>
            {STEPS.map((s, i) => (
              <FadeUp key={s.num} delay={i * 0.1}>
                <div style={{ borderRadius: "1.25rem", padding: "2.25rem 2rem", background: "var(--bg-surface)", border: `1px solid ${C.border}`, position: "relative", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Watermark number */}
                  <div style={{ position: "absolute", bottom: -8, right: 20, fontSize: "7rem", fontWeight: 900, lineHeight: 1, fontFamily: "monospace", userSelect: "none" as const, pointerEvents: "none", background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", opacity: 0.07 }}>
                    {i + 1}
                  </div>
                  {/* Step badge */}
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: C.dim, border: `1px solid ${C.borderHi}`, fontSize: "0.75rem", fontWeight: 800, color: C.p, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.75rem", color: "var(--text-primary)" }}>{s.title}</h3>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "var(--text-muted)" }}>{s.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${C.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: C.dim, color: C.p, border: `1px solid ${C.border}`, marginBottom: "1.25rem" }}>Features</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                Not another chatbot.{" "}
                <span style={{ background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>A tutor that knows your course.</span>
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.08}>
                <div style={{ position: "relative", borderRadius: "1.25rem", padding: "2rem", background: "var(--bg-surface)", border: `1px solid ${C.border}`, gridColumn: f.wide ? "span 2" : undefined, height: "100%", overflow: "hidden", cursor: "default", transition: "border-color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderHi)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                  {f.tag && (
                    <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 999, background: C.dim, color: C.p, border: `1px solid ${C.border}` }}>{f.tag}</div>
                  )}
                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: C.dim, border: `1px solid ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.p, marginBottom: "1.25rem" }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.6rem", color: "var(--text-primary)" }}>{f.title}</h3>
                  <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-muted)" }}>{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${C.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: C.dim, color: C.p, border: `1px solid ${C.border}`, marginBottom: "1.25rem" }}>Student stories</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
                Real students.{" "}
                <span style={{ background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Real results.</span>
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem" }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.1}>
                <div style={{ borderRadius: "1.25rem", padding: "2rem", background: "var(--bg-surface)", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%", transition: "border-color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderHi)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    ))}
                  </div>
                  <p style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "var(--text-secondary)", flex: 1 }}>&ldquo;{t.quote}&rdquo;</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: C.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>{t.initials}</div>
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
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${C.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "60rem", margin: "0 auto" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: 999, letterSpacing: "0.12em", textTransform: "uppercase" as const, background: C.dim, color: C.p, border: `1px solid ${C.border}`, marginBottom: "1.25rem" }}>Pricing</div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.875rem" }}>Start free. Upgrade when ready.</h2>
              <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>Cancel anytime. No contracts.</p>
            </div>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {[
              { name: "Free", price: null, features: ["10 questions per day", "Upload up to 3 courses", "Basic flashcards", "Source-cited answers"], highlight: false, href: "/register" },
              { name: "Pro", price: "29", features: ["Unlimited questions", "Unlimited courses", "Smart flashcards + study plan", "Professor fingerprinting", "AI general mode"], highlight: true, href: "/register?plan=pro" },
              { name: "Max", price: "59", features: ["Everything in Pro", "Exam predictions", "Panic mode (48h prep)", "Study groups", "Priority support"], highlight: false, href: "/register?plan=max" },
            ].map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 0.1}>
                <div style={{ position: "relative", borderRadius: "1.5rem", padding: "2.25rem", display: "flex", flexDirection: "column", background: plan.highlight ? C.dimMd : "var(--bg-surface)", border: `1px solid ${plan.highlight ? C.borderHi : C.border}`, boxShadow: plan.highlight ? `0 0 60px rgba(79,142,247,0.08)` : "none", height: "100%", transition: "border-color 0.2s" }}
                  onMouseEnter={e => { if (!plan.highlight) e.currentTarget.style.borderColor = C.borderHi; }}
                  onMouseLeave={e => { if (!plan.highlight) e.currentTarget.style.borderColor = C.border; }}>
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", padding: "0.25rem 1rem", borderRadius: "0 0 0.75rem 0.75rem", fontSize: "0.68rem", fontWeight: 700, background: C.grad, color: "#fff", whiteSpace: "nowrap" as const }}>Most popular</div>
                  )}
                  <div style={{ marginTop: "0.5rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "2.25rem", letterSpacing: "-0.04em", background: plan.highlight ? C.grad : "none", WebkitBackgroundClip: plan.highlight ? "text" : "unset", WebkitTextFillColor: plan.highlight ? "transparent" : "unset", backgroundClip: plan.highlight ? "text" : "unset", color: plan.highlight ? "transparent" : "var(--text-primary)" }}>
                      {plan.price ? `₪${plan.price}` : "Free"}
                    </span>
                    {plan.price && <span style={{ fontSize: "0.875rem", marginLeft: "0.4rem", color: "var(--text-muted)" }}>/month</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.25rem", marginBottom: "1.75rem", color: "var(--text-secondary)" }}>{plan.name}</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "2rem" }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem", fontSize: "0.9rem" }}>
                        <span style={{ flexShrink: 0, fontWeight: 700, background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>✓</span>
                        <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={plan.href} style={{ display: "block", textAlign: "center", padding: "0.85rem 1.5rem", borderRadius: "0.875rem", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", background: plan.highlight ? C.grad : "var(--bg-elevated)", color: plan.highlight ? "#fff" : "var(--text-secondary)", border: `1px solid ${plan.highlight ? "transparent" : C.border}`, boxShadow: plan.highlight ? `0 4px 20px ${C.glow}` : "none", cursor: "pointer" }}>
                    {plan.price ? `Get ${plan.name}` : "Start free"}
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ position: "relative", zIndex: 10, padding: "5rem 1.5rem 7rem" }}>
        <FadeUp>
          <div style={{ maxWidth: "58rem", margin: "0 auto", textAlign: "center", padding: "4rem 2rem", borderRadius: "2rem", border: `1px solid ${C.borderHi}`, background: `radial-gradient(ellipse at 50% 0%,${C.dim},transparent 70%)`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.p},${C.lt},transparent)` }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}
            >
              <Image src="/mascot/celebrate.png" alt="Proffy celebrating" width={100} height={100} style={{ objectFit: "contain", filter: "drop-shadow(0 8px 24px rgba(79,142,247,0.4))" }} />
            </motion.div>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
              Your next exam is closer<br />
              <span style={{ background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>than you think.</span>
            </h2>
            <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "32rem", margin: "0 auto 2.5rem" }}>
              Join thousands of Israeli students who already know exactly what their professor will ask.
            </p>
            <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "1.1rem", fontWeight: 700, padding: "1rem 2.75rem", borderRadius: "1rem", background: C.grad, color: "#fff", textDecoration: "none", boxShadow: `0 6px 30px ${C.glow}`, cursor: "pointer" }}>
              Start studying free →
            </Link>
            <p style={{ marginTop: "1.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>No credit card required. Free forever on the free plan.</p>
          </div>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${C.border}`, padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "1rem" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Image src="/logo-header-dark.png" alt="Proffy" width={100} height={30} style={{ objectFit: "contain", objectPosition: "left", opacity: 0.8 }} />
          </Link>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const }}>
            {PRODUCTS.map(p => (
              <Link key={p.name} href={p.href} style={{ fontSize: "0.78rem", textDecoration: "none", padding: "0.25rem 0.6rem", borderRadius: 6, border: `1px solid ${C.border}`, color: "var(--text-muted)", cursor: "pointer" }}>{p.name}</Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <Link key={l} href="#" style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none", cursor: "pointer" }}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
