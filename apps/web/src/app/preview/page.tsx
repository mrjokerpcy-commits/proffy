"use client";

import { motion, AnimatePresence, useMotionValue, animate as animateY, type MotionValue } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";

/* ── Tokens ──────────────────────────────────────────────────────────────── */
const DESK    = "#05070e";
const PARCH   = "#ece3cc";
const INK     = "#140e07";
const INK2    = "#3a2d1c";
const INK3    = "#75613e";
const LIME    = "#c8f135";
const LIME_G  = "linear-gradient(135deg,#c8f135,#9fce00)";
const SPINE_G = "linear-gradient(90deg,#071407,#0e2d0e,#071407)";
const COVER_G = "linear-gradient(160deg,#0e1428 0%,#141c36 55%,#090c1e 100%)";
const DISP    = "var(--font-cormorant),'Georgia',serif";
const BODY    = "var(--font-dm-sans),'Inter',system-ui,sans-serif";
const MONO    = "'JetBrains Mono','Fira Code',monospace";

/* ── Page shell ──────────────────────────────────────────────────────────── */
function Page({ children, side, num, style }: {
  children: React.ReactNode;
  side: "left" | "right";
  num?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: PARCH,
      backgroundImage: `
        repeating-linear-gradient(transparent,transparent 31px,rgba(0,0,0,0.04) 31px,rgba(0,0,0,0.04) 32px),
        radial-gradient(ellipse 55% 38% at ${side === "left" ? "72% 14%" : "28% 14%"}, rgba(255,252,235,0.52) 0%,transparent 60%)
      `,
      backgroundSize: "100% 32px,100% 100%",
      position: "relative", overflow: "hidden",
      padding: "clamp(1rem,3vh,2.5rem) clamp(1.1rem,3.5vw,2.5rem)",
      display: "flex", flexDirection: "column",
      boxShadow: side === "left"
        ? "inset -20px 0 40px rgba(0,0,0,0.09)"
        : "inset 20px 0 40px rgba(0,0,0,0.09)",
      ...style,
    }}>
      <div style={{
        position: "absolute",
        [side === "left" ? "right" : "left"]: "clamp(1rem,3.5vw,2.5rem)",
        top: 0, bottom: 0, width: 1,
        background: "rgba(148,42,42,0.22)", pointerEvents: "none",
      }} />
      {children}
      {num && (
        <div style={{
          position: "absolute", bottom: "0.7rem", left: "50%", transform: "translateX(-50%)",
          fontFamily: DISP, fontSize: 11, color: INK3, letterSpacing: "0.12em",
        }}>{num}</div>
      )}
    </div>
  );
}

/* ── Typography ──────────────────────────────────────────────────────────── */
function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontFamily: DISP, fontSize: "clamp(2rem,7vw,6rem)", fontWeight: 300, lineHeight: 0.95, color: INK, letterSpacing: "-0.02em", margin: 0 }}>{children}</h1>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontFamily: DISP, fontSize: "clamp(1.35rem,3.5vw,3.5rem)", fontWeight: 300, lineHeight: 1.1, color: INK, letterSpacing: "-0.015em", margin: 0 }}>{children}</h2>;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: MONO, fontSize: "clamp(0.55rem,1.2vw,0.72rem)", letterSpacing: "0.2em", textTransform: "uppercase", color: INK3, marginBottom: "0.65rem" }}>{children}</div>;
}
function Rule() {
  return <div style={{ width: "4rem", height: "1.5px", background: `linear-gradient(90deg,${INK3},transparent)`, margin: "0.6rem 0 0.85rem" }} />;
}
function Txt({ children, sm }: { children: React.ReactNode; sm?: boolean }) {
  return <p style={{ fontFamily: BODY, fontSize: sm ? "clamp(0.78rem,1.4vw,0.95rem)" : "clamp(0.88rem,1.8vw,1.18rem)", fontWeight: 300, lineHeight: 1.75, color: INK2, margin: 0 }}>{children}</p>;
}

/* ── Flip cards ──────────────────────────────────────────────────────────── */
const NETWORK = [
  { letter: "B", name: "Proffy Bagrut",  tagline: "High school",   badge: "Soon", live: false, short: "Every bagrut subject. Ask, practice, get clear explanations.", full: "Every bagrut subject covered. Practice with past Ministry of Education exam patterns, get explanations in Hebrew and English.", href: "#",         color: "#a78bfa" },
  { letter: "Y", name: "Proffy Yael",    tagline: "Hebrew writing", badge: "Soon", live: false, short: "Master Hebrew spelling, grammar and academic writing.",          full: "Master Hebrew spelling, grammar, and academic writing for the Yael section of the Israeli psychometric exam.", href: "#",         color: "#fbbf24" },
  { letter: "P", name: "Proffy Psycho",  tagline: "Psychometric",   badge: "Beta", live: false, short: "Replace a 3,000 prep course with full AI preparation.",        full: "Replace expensive prep courses. Full AI-powered prep for verbal, quantitative, and English sections.", href: "#",         color: "#f87171" },
  { letter: "U", name: "Proffy Uni",     tagline: "University",     badge: "Live", live: true,  short: "Upload slides, ask anything, ace the exam.",                     full: "Upload your course slides and past exams. Proffy learns your professor's style and answers like a top student.", href: "/register", color: "#4f8ef7" },
] as const;

function FlipCard({ p }: { p: (typeof NETWORK)[number] }) {
  const [fl, setFl] = useState(false);
  return (
    <div style={{ perspective: 900, flex: 1, minHeight: 0, cursor: "pointer" }}
      onMouseEnter={() => setFl(true)} onMouseLeave={() => setFl(false)}
      onClick={() => setFl((f) => !f)}>
      <motion.div animate={{ rotateY: fl ? 180 : 0 }} transition={{ duration: 0.65, ease: [0.4,0,0.2,1] }}
        style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          borderRadius: 12, background: "rgba(255,255,255,0.58)",
          border: p.live ? "1.5px solid rgba(200,241,53,0.55)" : "1.5px solid rgba(42,31,14,0.14)",
          boxShadow: p.live ? "0 0 0 2px rgba(200,241,53,0.18),0 4px 18px rgba(0,0,0,0.07)" : "0 4px 18px rgba(0,0,0,0.05)",
          padding: "clamp(0.6rem,2vh,1.1rem)",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          {p.live && <motion.div animate={{ opacity: [0.4,1,0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ position: "absolute", inset: -1, borderRadius: 12, border: `1.5px solid ${LIME}`, pointerEvents: "none" }} />}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <span style={{ fontFamily: DISP, fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 700, color: p.color, lineHeight: 1 }}>{p.letter}</span>
            <span style={{ fontFamily: MONO, fontSize: "clamp(0.44rem,1vw,0.5rem)", letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 999, background: p.live ? "rgba(200,241,53,0.18)" : "rgba(42,31,14,0.07)", color: p.live ? "#3a5000" : INK3, border: `1px solid ${p.live ? "rgba(200,241,53,0.38)" : "rgba(42,31,14,0.14)"}` }}>
              {p.live && <motion.span animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: LIME, marginRight: 4, verticalAlign: "middle" }} />}
              {p.badge}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "clamp(0.44rem,1vw,0.5rem)", color: INK3, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{p.tagline}</div>
            <div style={{ fontFamily: DISP, fontSize: "clamp(0.82rem,1.8vw,1.1rem)", fontWeight: 700, color: INK, lineHeight: 1.2 }}>{p.name}</div>
            <div style={{ fontFamily: BODY, fontSize: "clamp(0.6rem,1.2vw,0.76rem)", color: INK2, lineHeight: 1.6, marginTop: 4 }}>{p.short}</div>
          </div>
        </div>
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)", borderRadius: 12,
          background: p.live ? "linear-gradient(135deg,#0c2000,#193b00)" : "linear-gradient(135deg,#090c1b,#101528)",
          border: p.live ? "1.5px solid rgba(200,241,53,0.2)" : "1.5px solid rgba(79,142,247,0.2)",
          padding: "clamp(0.6rem,2vh,1.1rem)",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <p style={{ fontFamily: BODY, fontSize: "clamp(0.62rem,1.2vw,0.78rem)", lineHeight: 1.7, color: p.live ? "rgba(200,241,53,0.85)" : "rgba(200,210,240,0.85)", margin: 0 }}>{p.full}</p>
          <Link href={p.href} style={{ fontFamily: BODY, fontSize: "clamp(0.62rem,1.2vw,0.78rem)", fontWeight: 700, padding: "5px 12px", borderRadius: 999, textDecoration: "none", background: p.live ? LIME_G : "linear-gradient(135deg,#4f8ef7,#a78bfa)", color: p.live ? "#0a0f00" : "#fff", alignSelf: "flex-start", display: "inline-flex" }}>
            {p.live ? "Start now →" : "Get notified →"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Confetti ────────────────────────────────────────────────────────────── */
function Confetti({ active }: { active: boolean }) {
  const p = useRef(Array.from({ length: 50 }, (_, i) => ({
    id: i, x: (Math.random() - 0.5) * 450, y: -(100 + Math.random() * 180), rot: Math.random() * 720 - 360,
    color: [LIME,"#fff","#4ade80","#fbbf24","#a78bfa"][i % 5],
    w: 6 + Math.random() * 9, h: 3 + Math.random() * 6, delay: Math.random() * 0.45,
  }))).current;
  if (!active) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 15, overflow: "hidden" }}>
      {p.map((c) => (
        <motion.div key={c.id}
          initial={{ x: "50%", y: "65%", scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: `calc(50% + ${c.x}px)`, y: `calc(65% + ${c.y}px)`, scale: [0,1,0.8], rotate: c.rot, opacity: [1,1,0] }}
          transition={{ duration: 1.4, delay: c.delay, ease: "easeOut" }}
          style={{ position: "absolute", top: 0, left: 0, width: c.w, height: c.h, background: c.color, borderRadius: 2 }}
        />
      ))}
    </div>
  );
}

/* ── Spreads ─────────────────────────────────────────────────────────────── */
function S0L() {
  return (
    <Page side="left">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "clamp(0.5rem,1.8vh,1.25rem)" }}>
        <Image src="/logo-owl.png" alt="" width={56} height={56} style={{ objectFit: "contain", opacity: 0.1, filter: "sepia(1)", width: "clamp(32px,6vw,56px)", height: "auto" }} />
        <div style={{ width: "58%", height: "1.5px", background: `linear-gradient(90deg,transparent,${INK3},transparent)` }} />
        <div style={{ fontFamily: DISP, fontSize: "clamp(0.55rem,1.2vw,0.74rem)", color: INK3, letterSpacing: "0.28em", textTransform: "uppercase", textAlign: "center" }}>Academic Intelligence</div>
        <div style={{ width: "58%", height: "1.5px", background: `linear-gradient(90deg,transparent,${INK3},transparent)` }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
          {["TAU","Technion","HUJI","BGU","Bar Ilan","Ariel"].map((u) => (
            <span key={u} style={{ fontFamily: BODY, fontSize: "clamp(0.55rem,1.1vw,0.66rem)", color: INK3, padding: "2px 9px", border: "1px solid rgba(42,31,14,0.2)", borderRadius: 4 }}>{u}</span>
          ))}
        </div>
        <div style={{ fontFamily: DISP, fontSize: "clamp(0.52rem,1vw,0.66rem)", color: INK3, letterSpacing: "0.1em", fontStyle: "italic", marginTop: "0.3rem", textAlign: "center" }}>
          Scroll or swipe to turn pages
        </div>
      </div>
    </Page>
  );
}

function S0R() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [entered, setEntered] = useState(false);
  useEffect(() => { setTimeout(() => setEntered(true), 200); }, []);
  return (
    <Page side="right" num="i">
      <div ref={ref}
        onMouseMove={(e) => {
          if (!ref.current) return;
          const r = ref.current.getBoundingClientRect();
          setTilt({ rx: ((e.clientY - r.top) / r.height - 0.5) * -8, ry: ((e.clientX - r.left) / r.width - 0.5) * 8 });
        }}
        onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
        style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(0.35rem,1.2vh,0.85rem)", position: "relative" }}
      >
        <Lbl>proffy.study</Lbl>
        <H1>PROFFY</H1>
        <Rule />
        <div style={{ fontFamily: DISP, fontSize: "clamp(0.9rem,2.2vw,1.5rem)", color: INK2, fontStyle: "italic", lineHeight: 1.38 }}>
          The AI tutor that knows your exam.
        </div>
        <Txt sm>From bagrut to university — AI that understands your course, your professor, and your exam date.</Txt>
        <div style={{ marginTop: "clamp(0.35rem,1.2vh,1rem)" }}>
          <Link href="/register" style={{ fontFamily: BODY, fontSize: "clamp(0.75rem,1.4vw,0.9rem)", fontWeight: 700, padding: "0.55rem 1.4rem", borderRadius: 999, background: LIME_G, color: "#0a0f00", textDecoration: "none", display: "inline-flex" }}>
            Start with Proffy Uni →
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.85 }}
          animate={entered ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          style={{ position: "absolute", right: 0, bottom: 0, rotateX: tilt.rx, rotateY: tilt.ry, transformPerspective: 600 }}
        >
          <motion.div animate={{ y: [0,-14,0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <Image src="/mascot/hero.png" alt="Proffy" width={180} height={180} style={{ objectFit: "contain", opacity: 0.72, filter: "sepia(0.18)", width: "clamp(90px,16vw,180px)", height: "auto" }} />
          </motion.div>
        </motion.div>
      </div>
    </Page>
  );
}

function S1L() {
  return (
    <Page side="left" num="1">
      <Lbl>Chapter I</Lbl>
      <H2>Our Mission</H2>
      <Rule />
      <Txt>Proffy gives every student the same advantage a private tutor provides — it knows your exact professor, your slides, and your exam date.</Txt>
      <div style={{ marginTop: "clamp(0.6rem,1.8vh,1.4rem)", padding: "clamp(0.7rem,1.8vh,1.3rem)", background: "rgba(255,255,255,0.55)", borderRadius: 10, border: "1px solid rgba(42,31,14,0.1)" }}>
        <div style={{ display: "flex", gap: 3, marginBottom: "0.45rem" }}>
          {Array.from({ length: 5 }).map((_, j) => (
            <svg key={j} width="11" height="11" viewBox="0 0 24 24" fill="#c8a040"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          ))}
        </div>
        <div style={{ fontFamily: DISP, fontSize: "clamp(0.85rem,1.8vw,1.08rem)", fontStyle: "italic", color: INK, lineHeight: 1.65 }}>
          &ldquo;We built the tool we wished we had when we were students.&rdquo;
        </div>
        <div style={{ fontFamily: BODY, fontSize: "clamp(0.56rem,1.1vw,0.68rem)", color: INK3, marginTop: "0.35rem" }}>Proffy Team, Israel</div>
      </div>
      <div style={{ marginTop: "auto" }}>
        <Image src="/mascot/reading.png" alt="" width={90} height={90} style={{ objectFit: "contain", opacity: 0.36, filter: "sepia(0.5)", float: "right", width: "clamp(55px,9vw,90px)", height: "auto" }} />
      </div>
    </Page>
  );
}

function S1R() {
  const items = [
    { title: "Study smarter", desc: "AI that reads your actual material and understands what matters for your exam." },
    { title: "Save time",     desc: "Instant answers from your slides. No more searching for hours." },
    { title: "Source-cited",  desc: "Every answer cites the exact slide and page. No hallucinations." },
    { title: "Available 24/7",desc: "Study at 3am the night before. Proffy never sleeps." },
  ];
  return (
    <Page side="right" num="2">
      <Lbl>Four principles</Lbl>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(0.4rem,1.2vh,0.85rem)", flex: 1 }}>
        {items.map((item) => (
          <div key={item.title} style={{ padding: "clamp(0.6rem,1.5vh,1.15rem)", background: "rgba(255,255,255,0.52)", borderRadius: 10, border: "1px solid rgba(42,31,14,0.1)", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <div style={{ fontFamily: DISP, fontSize: "clamp(0.88rem,1.8vw,1.2rem)", fontWeight: 700, color: INK }}>{item.title}</div>
            <div style={{ fontFamily: BODY, fontSize: "clamp(0.66rem,1.2vw,0.8rem)", color: INK2, lineHeight: 1.65 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

const STEPS = [
  { n: "I",   title: "Upload your material", desc: "Drop lecture slides, past exams, or a Google Drive link. Proffy indexes everything and learns your course inside out." },
  { n: "II",  title: "Ask anything",          desc: "Every answer cites the exact slide or page from your material. No hallucinations, no generic advice." },
  { n: "III", title: "Walk in ready",          desc: "Flashcards with spaced repetition, professor pattern analysis, and an exam countdown that tells you exactly what to focus on." },
];

function S2L() {
  return (
    <Page side="left" num="3">
      <Lbl>Chapter II</Lbl>
      <H2>How It Works</H2>
      <Rule />
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.6rem,1.6vh,1.3rem)", flex: 1 }}>
        {STEPS.slice(0,2).map((s) => (
          <div key={s.n} style={{ display: "flex", gap: "clamp(0.4rem,1vw,0.9rem)" }}>
            <span style={{ fontFamily: DISP, fontSize: "clamp(0.85rem,1.6vw,1rem)", fontWeight: 700, color: INK3, flexShrink: 0, width: 24 }}>{s.n}.</span>
            <div>
              <div style={{ fontFamily: DISP, fontSize: "clamp(0.9rem,1.8vw,1.15rem)", fontWeight: 700, color: INK, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontFamily: BODY, fontSize: "clamp(0.66rem,1.2vw,0.8rem)", color: INK2, lineHeight: 1.72 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto" }}>
        <Image src="/mascot/thinking.png" alt="" width={90} height={90} style={{ objectFit: "contain", opacity: 0.36, filter: "sepia(0.45)", float: "right", width: "clamp(55px,9vw,90px)", height: "auto" }} />
      </div>
    </Page>
  );
}

function S2R() {
  return (
    <Page side="right" num="4">
      <div style={{ paddingTop: "clamp(0.8rem,2vh,1.8rem)", display: "flex", flexDirection: "column", gap: "clamp(0.6rem,1.6vh,1.3rem)", flex: 1 }}>
        {STEPS.slice(2).map((s) => (
          <div key={s.n} style={{ display: "flex", gap: "clamp(0.4rem,1vw,0.9rem)" }}>
            <span style={{ fontFamily: DISP, fontSize: "clamp(0.85rem,1.6vw,1rem)", fontWeight: 700, color: INK3, flexShrink: 0, width: 24 }}>{s.n}.</span>
            <div>
              <div style={{ fontFamily: DISP, fontSize: "clamp(0.9rem,1.8vw,1.15rem)", fontWeight: 700, color: INK, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontFamily: BODY, fontSize: "clamp(0.66rem,1.2vw,0.8rem)", color: INK2, lineHeight: 1.72 }}>{s.desc}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: "clamp(0.6rem,1.5vh,1.3rem)", padding: "clamp(0.7rem,1.6vh,1.25rem)", background: "rgba(79,142,247,0.07)", borderRadius: 10, border: "1px solid rgba(79,142,247,0.14)" }}>
          <div style={{ fontFamily: DISP, fontSize: "clamp(0.9rem,1.8vw,1.1rem)", fontStyle: "italic", color: INK, marginBottom: "0.35rem" }}>
            &ldquo;From slides to exam-ready in minutes.&rdquo;
          </div>
          <div style={{ fontFamily: BODY, fontSize: "clamp(0.66rem,1.2vw,0.8rem)", color: INK2, lineHeight: 1.7 }}>Upload your material, ask questions, and let Proffy do the heavy lifting.</div>
        </div>
      </div>
    </Page>
  );
}

/* ── Chat demo spread ────────────────────────────────────────────────────── */
const SAMPLE_QS = [
  "What topics does Prof. Cohen always put on exams?",
  "Explain the knapsack algorithm in simple terms",
  "Summarize lecture 6 in bullet points",
  "What formula should I memorize for the final?",
];

function S3L() {
  return (
    <Page side="left" num="5">
      <Lbl>Chapter III — The Experience</Lbl>
      <H2>Ask anything. Get source-cited answers.</H2>
      <Rule />
      <Txt sm>Proffy reads your actual slides and past exams. Every answer traces back to the exact source — no hallucinations, no generic advice.</Txt>
      <div style={{ marginTop: "clamp(0.6rem,1.5vh,1.3rem)", display: "flex", flexDirection: "column", gap: "clamp(0.32rem,0.8vh,0.62rem)" }}>
        {SAMPLE_QS.map((q) => (
          <div key={q} style={{
            fontFamily: BODY, fontSize: "clamp(0.65rem,1.2vw,0.78rem)", color: INK2,
            padding: "clamp(0.32rem,0.8vh,0.6rem) clamp(0.55rem,1.1vw,0.8rem)",
            background: "rgba(255,255,255,0.5)", borderRadius: 8,
            border: "1px solid rgba(42,31,14,0.1)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontFamily: DISP, fontSize: "clamp(0.7rem,1.3vw,0.82rem)", color: INK3, flexShrink: 0 }}>?</span>
            {q}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto" }}>
        <Image src="/mascot/reading.png" alt="" width={90} height={90} style={{ objectFit: "contain", opacity: 0.36, filter: "sepia(0.5)", float: "right", width: "clamp(55px,9vw,90px)", height: "auto" }} />
      </div>
    </Page>
  );
}

function S3R() {
  return (
    <Page side="right" num="6">
      <div style={{
        flex: 1, borderRadius: 12, overflow: "hidden",
        background: "#080d1a",
        border: "1px solid rgba(79,142,247,0.18)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Window chrome */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "clamp(0.38rem,0.9vh,0.7rem) clamp(0.6rem,1.2vw,0.9rem)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["#f87171","#fbbf24","#34d399"].map((c) => (
              <div key={c} style={{ width: 6, height: 6, borderRadius: "50%", background: c, opacity: 0.7 }} />
            ))}
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: "clamp(0.4rem,0.9vw,0.46rem)", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
              PROFFY UNI — Algorithms 101
            </span>
          </div>
          <motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: "50%", background: LIME, boxShadow: `0 0 5px ${LIME}` }} />
        </div>
        {/* Messages */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "clamp(0.4rem,1vh,0.85rem)", padding: "clamp(0.5rem,1.2vh,1rem) clamp(0.6rem,1.2vw,0.9rem)", overflowY: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              fontFamily: BODY, fontSize: "clamp(0.58rem,1.1vw,0.71rem)", color: "rgba(255,255,255,0.9)",
              background: "linear-gradient(135deg,#4f8ef7,#a78bfa)",
              padding: "clamp(0.32rem,0.75vh,0.6rem) clamp(0.48rem,0.95vw,0.72rem)",
              borderRadius: "10px 10px 3px 10px", maxWidth: "82%", lineHeight: 1.55,
            }}>
              What topics does Prof. Cohen always put on exams?
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
              <Image src="/logo-owl.png" alt="" width={12} height={12} style={{ objectFit: "contain", filter: "brightness(10)" }} />
            </div>
            <div style={{
              fontFamily: BODY, fontSize: "clamp(0.58rem,1.1vw,0.71rem)", color: "rgba(255,255,255,0.82)",
              background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)",
              padding: "clamp(0.32rem,0.75vh,0.6rem) clamp(0.48rem,0.95vw,0.72rem)",
              borderRadius: "10px 10px 10px 3px", maxWidth: "88%", lineHeight: 1.65,
            }}>
              Based on Prof. Cohen&apos;s last 4 exams, dynamic programming appears every time — especially knapsack. Graph traversal (BFS/DFS) is also a near-certainty.
              <div style={{ marginTop: "0.4rem", display: "flex", gap: 4, flexWrap: "wrap" }}>
                {["Slide 47","Slide 61","Past exam 2023"].map((s) => (
                  <span key={s} style={{
                    fontFamily: MONO, fontSize: "clamp(0.38rem,0.75vw,0.42rem)", color: "#4f8ef7",
                    padding: "2px 5px", borderRadius: 4,
                    background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.22)",
                    letterSpacing: "0.07em",
                  }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              fontFamily: BODY, fontSize: "clamp(0.58rem,1.1vw,0.71rem)", color: "rgba(255,255,255,0.9)",
              background: "linear-gradient(135deg,#4f8ef7,#a78bfa)",
              padding: "clamp(0.32rem,0.75vh,0.6rem) clamp(0.48rem,0.95vw,0.72rem)",
              borderRadius: "10px 10px 3px 10px", maxWidth: "82%", lineHeight: 1.55,
            }}>
              Give me the knapsack algorithm step by step
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Image src="/logo-owl.png" alt="" width={12} height={12} style={{ objectFit: "contain", filter: "brightness(10)" }} />
            </div>
            <div style={{ display: "flex", gap: 4, padding: "clamp(0.32rem,0.75vh,0.6rem) clamp(0.48rem,0.95vw,0.72rem)", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px 10px 10px 3px" }}>
              {[0,1,2].map((i) => (
                <motion.div key={i} animate={{ y: [0,-4,0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.35)" }} />
              ))}
            </div>
          </div>
        </div>
        {/* Input */}
        <div style={{
          display: "flex", gap: 7, alignItems: "center",
          margin: "0 clamp(0.5rem,1vw,0.85rem) clamp(0.4rem,0.9vh,0.75rem)",
          background: "rgba(255,255,255,0.05)", borderRadius: 9,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "clamp(0.28rem,0.65vh,0.5rem) clamp(0.45rem,0.9vw,0.7rem)",
        }}>
          <span style={{ fontFamily: BODY, fontSize: "clamp(0.55rem,1vw,0.65rem)", color: "rgba(255,255,255,0.2)", flex: 1 }}>Ask Proffy anything...</span>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: LIME_G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#0a0f00", fontSize: 9, fontWeight: 700 }}>↑</span>
          </div>
        </div>
      </div>
    </Page>
  );
}

function S4L() {
  return (
    <Page side="left" num="7">
      <Lbl>Chapter IV — The Network</Lbl>
      <H2>One AI, every stage of education.</H2>
      <Rule />
      <div style={{ fontFamily: BODY, fontSize: "clamp(0.66rem,1.2vw,0.8rem)", color: INK2, marginBottom: "clamp(0.35rem,0.9vh,0.8rem)", lineHeight: 1.7 }}>
        Tap each card to flip it and see what&apos;s coming.
      </div>
      <div style={{ display: "flex", gap: "clamp(0.38rem,0.9vw,0.82rem)", flex: 1 }}>
        {NETWORK.slice(0,2).map((p) => <FlipCard key={p.name} p={p} />)}
      </div>
    </Page>
  );
}

function S4R() {
  return (
    <Page side="right" num="8">
      <div style={{ display: "flex", gap: "clamp(0.38rem,0.9vw,0.82rem)", paddingTop: "clamp(0.7rem,2vh,1.8rem)", flex: 1 }}>
        {NETWORK.slice(2).map((p) => <FlipCard key={p.name} p={p} />)}
      </div>
      <div style={{ marginTop: "clamp(0.6rem,1.5vh,1.2rem)", padding: "clamp(0.6rem,1.4vh,1.1rem)", background: "rgba(200,241,53,0.1)", borderRadius: 10, border: "1px solid rgba(200,241,53,0.26)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: "0.28rem" }}>
          <motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 7, height: 7, borderRadius: "50%", background: LIME, boxShadow: `0 0 6px ${LIME}`, flexShrink: 0 }} />
          <span style={{ fontFamily: MONO, fontSize: "clamp(0.5rem,1vw,0.58rem)", color: "#3a5000", letterSpacing: "0.12em" }}>PROFFY UNI IS LIVE</span>
        </div>
        <div style={{ fontFamily: BODY, fontSize: "clamp(0.64rem,1.2vw,0.78rem)", color: INK2, lineHeight: 1.6 }}>Upload slides, ask anything, ace the exam.</div>
      </div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
        <motion.div animate={{ rotateZ: [-8,8,-8] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <Image src="/mascot/thinking.png" alt="" width={90} height={90} style={{ objectFit: "contain", opacity: 0.4, filter: "sepia(0.4)", width: "clamp(55px,9vw,90px)", height: "auto" }} />
        </motion.div>
      </div>
    </Page>
  );
}

const BULLETS = [
  "Knows your course, professor, and exam date",
  "Answers with sources from your own material",
  "Builds exam-focused study plans automatically",
  "Available 24/7, even the night before",
];

function S5L() {
  return (
    <Page side="left" num="9">
      <Lbl>Chapter V — Meet Proffy</Lbl>
      <H2>Your AI study companion.</H2>
      <Rule />
      <Txt sm>Proffy is not a search engine. It reads your actual course material, learns your professor&apos;s style, and answers like a top student who aced this exact class last semester.</Txt>
      <div style={{ marginTop: "clamp(0.35rem,0.9vh,0.8rem)" }}>
        <Txt sm>No hallucinations. No generic advice. Just what you need to pass.</Txt>
      </div>
      <div style={{ marginTop: "auto" }}>
        <Image src="/mascot/thumbsup.png" alt="" width={110} height={110} style={{ objectFit: "contain", opacity: 0.42, filter: "sepia(0.3)", float: "right", width: "clamp(65px,10vw,110px)", height: "auto" }} />
      </div>
    </Page>
  );
}

function S5R() {
  return (
    <Page side="right" num="10">
      <Lbl>What Proffy does</Lbl>
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.38rem,1vh,0.82rem)", flex: 1 }}>
        {BULLETS.map((b) => (
          <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "clamp(0.4rem,0.8vw,0.7rem)", padding: "clamp(0.48rem,1.1vh,0.88rem) clamp(0.6rem,1.2vw,0.95rem)", background: "rgba(255,255,255,0.52)", borderRadius: 9, border: "1px solid rgba(42,31,14,0.09)" }}>
            <span style={{ fontFamily: BODY, fontSize: "clamp(0.7rem,1.3vw,0.82rem)", fontWeight: 700, color: "#3a5000", flexShrink: 0, marginTop: 1 }}>✓</span>
            <span style={{ fontFamily: BODY, fontSize: "clamp(0.72rem,1.3vw,0.86rem)", color: INK2, lineHeight: 1.56 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "clamp(0.7rem,1.8vh,1.6rem)" }}>
        <Link href="/register" style={{ fontFamily: BODY, fontSize: "clamp(0.78rem,1.4vw,0.9rem)", fontWeight: 700, padding: "0.55rem 1.4rem", borderRadius: 999, background: LIME_G, color: "#0a0f00", textDecoration: "none", display: "inline-flex" }}>
          Start with Proffy Uni →
        </Link>
      </div>
    </Page>
  );
}

function S6L() {
  const [confetti, setConfetti] = useState(false);
  return (
    <Page side="left" num="11">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "clamp(0.6rem,1.5vh,1.3rem)", textAlign: "center", position: "relative" }}>
        <Confetti active={confetti} />
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 180, damping: 10 }}
          onAnimationComplete={() => setConfetti(true)}
        >
          <motion.div animate={{ y: [0,-20,0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}>
            <Image src="/mascot/celebrate.png" alt="" width={110} height={110} style={{ objectFit: "contain", opacity: 0.75, filter: "sepia(0.12)", width: "clamp(70px,10vw,110px)", height: "auto" }} />
          </motion.div>
        </motion.div>
        <H2>Ready to study smarter?</H2>
        <Txt sm>Join thousands of students worldwide.</Txt>
        <Link href="/register" style={{ fontFamily: BODY, fontSize: "clamp(0.8rem,1.4vw,0.92rem)", fontWeight: 700, padding: "0.62rem 1.7rem", borderRadius: 999, background: LIME_G, color: "#0a0f00", textDecoration: "none", display: "inline-flex" }}>
          Get Early Access →
        </Link>
      </div>
    </Page>
  );
}

function S6R() {
  return (
    <Page side="right">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "clamp(0.6rem,1.5vh,1.3rem)", textAlign: "center" }}>
        <Image src="/logo-header-dark.png" alt="Proffy" width={120} height={36} style={{ objectFit: "contain", opacity: 0.2, filter: "sepia(1)", width: "clamp(80px,11vw,120px)", height: "auto" }} />
        <div style={{ width: "52%", height: "1.5px", background: `linear-gradient(90deg,transparent,${INK3},transparent)` }} />
        <div style={{ fontFamily: DISP, fontSize: "clamp(0.58rem,1.1vw,0.74rem)", color: INK3, letterSpacing: "0.22em", textTransform: "uppercase" }}>Built for every student</div>
        <div style={{ fontFamily: DISP, fontSize: "clamp(0.55rem,1vw,0.68rem)", color: INK3 }}>&copy; 2026 Proffy</div>
        <motion.div animate={{ rotate: [0,-5,0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} style={{ marginTop: "clamp(0.35rem,0.9vh,0.8rem)" }}>
          <Image src="/mascot/sleeping.png" alt="" width={90} height={90} style={{ objectFit: "contain", opacity: 0.36, filter: "sepia(0.48)", width: "clamp(55px,9vw,90px)", height: "auto" }} />
        </motion.div>
      </div>
    </Page>
  );
}

/* ── Spread registry ─────────────────────────────────────────────────────── */
const SPREADS = [
  { left: <S0L />, right: <S0R />, bookmark: "HOME"    },
  { left: <S1L />, right: <S1R />, bookmark: "MISSION" },
  { left: <S2L />, right: <S2R />, bookmark: null       },
  { left: <S3L />, right: <S3R />, bookmark: "CHAT"    },
  { left: <S4L />, right: <S4R />, bookmark: "NETWORK" },
  { left: <S5L />, right: <S5R />, bookmark: "MEET"    },
  { left: <S6L />, right: <S6R />, bookmark: "START"   },
];
const TOTAL = SPREADS.length;

/* Flat page list for mobile: each spread = 2 pages */
const PAGES_FLAT = SPREADS.flatMap((s, i) => [
  { node: s.left,  key: `${i}L` },
  { node: s.right, key: `${i}R` },
]);
const TOTAL_M = PAGES_FLAT.length;

/* ── Turning page (desktop) ──────────────────────────────────────────────── */
function TurningPage({ front, back, rotateY }: { front: React.ReactNode; back: React.ReactNode; rotateY: MotionValue<number> }) {
  return (
    <motion.div style={{
      position: "absolute", top: 0, left: "50%",
      width: "50%", height: "100%",
      transformStyle: "preserve-3d",
      transformOrigin: "left center",
      rotateY, zIndex: 20,
    }}>
      <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>{front}</div>
      <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>{back}</div>
    </motion.div>
  );
}

/* ── Particles ───────────────────────────────────────────────────────────── */
function DeskParticles() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const SYMS = ["∑","π","∫","α","β","Δ","∇","∞","λ","θ","מ","ל","ת","ש","×","÷","≠","≈"];
    type P = { x:number; y:number; vy:number; vxPhase:number; sym:string; op:number; sz:number };
    const ps: P[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      vy: -(0.14 + Math.random() * 0.38), vxPhase: Math.random() * Math.PI * 2,
      sym: SYMS[Math.floor(Math.random() * SYMS.length)],
      op: 0.045 + Math.random() * 0.09, sz: 11 + Math.floor(Math.random() * 10),
    }));
    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach((p) => {
        ctx.save(); ctx.globalAlpha = p.op;
        ctx.fillStyle = "rgba(200,241,53,1)";
        ctx.font = `${p.sz}px ${MONO}`;
        ctx.fillText(p.sym, p.x, p.y);
        ctx.restore();
        p.y += p.vy; p.x += Math.sin(frame * 0.01 + p.vxPhase) * 0.3;
        if (p.y < -20) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
      });
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

/* ── Mobile book ─────────────────────────────────────────────────────────── */
function BookMobile() {
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);

  const goNext = useCallback(() => {
    if (page >= TOTAL_M - 1) return;
    setDir(1);
    setPage((p) => p + 1);
  }, [page]);

  const goPrev = useCallback(() => {
    if (page <= 0) return;
    setDir(-1);
    setPage((p) => p - 1);
  }, [page]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) goNext(); else goPrev();
    };
    const kh = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
    };
    let tx = 0;
    const ts = (e: TouchEvent) => { tx = e.touches[0].clientX; };
    const te = (e: TouchEvent) => {
      const dx = tx - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) { if (dx > 0) goNext(); else goPrev(); }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", kh);
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchend", te, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", kh);
      window.removeEventListener("touchstart", ts);
      window.removeEventListener("touchend", te);
    };
  }, [goNext, goPrev]);

  return (
    <>
      {/* Page area */}
      <div style={{
        position: "absolute",
        top: "2.8rem", left: "0.75rem", right: "0.75rem", bottom: "3.2rem",
        zIndex: 10,
        boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 12px 40px rgba(0,0,0,0.65)",
        borderRadius: 4,
        overflow: "hidden",
      }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={PAGES_FLAT[page].key}
            initial={{ opacity: 0, x: dir > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir > 0 ? -40 : 40 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: "absolute", inset: 0 }}
          >
            {PAGES_FLAT[page].node}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Logo */}
      <div style={{ position: "absolute", top: "0.6rem", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Image src="/logo-header-dark.png" alt="Proffy" width={72} height={22} style={{ objectFit: "contain", opacity: 0.42 }} />
        </Link>
      </div>

      {/* Nav */}
      <div style={{ position: "absolute", bottom: "0.65rem", left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <button onClick={goPrev} disabled={page === 0} style={{ width: 36, height: 36, borderRadius: "50%", background: page === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.09)", border: `1px solid rgba(255,255,255,${page === 0 ? "0.04" : "0.14"})`, color: page === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.65)", cursor: page === 0 ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", minWidth: 40, textAlign: "center" }}>{page + 1} / {TOTAL_M}</span>
        <button onClick={goNext} disabled={page === TOTAL_M - 1} style={{ width: 36, height: 36, borderRadius: "50%", background: page === TOTAL_M - 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.09)", border: `1px solid rgba(255,255,255,${page === TOTAL_M - 1 ? "0.04" : "0.14"})`, color: page === TOTAL_M - 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.65)", cursor: page === TOTAL_M - 1 ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
      </div>
    </>
  );
}

/* ── Desktop book ────────────────────────────────────────────────────────── */
function BookDesktop() {
  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState(false);
  const turnY = useMotionValue(0);

  const goNext = useCallback(async () => {
    if (spread >= TOTAL - 1 || turning) return;
    setTurning(true);
    await animateY(turnY, -180, { duration: 0.65, ease: [0.4, 0, 0.2, 1] });
    setSpread((s) => s + 1);
    turnY.set(0);
    setTurning(false);
  }, [spread, turning, turnY]);

  const goPrev = useCallback(async () => {
    if (spread <= 0 || turning) return;
    setTurning(true);
    setSpread((s) => s - 1);
    turnY.set(-180);
    await animateY(turnY, 0, { duration: 0.65, ease: [0.4, 0, 0.2, 1] });
    setTurning(false);
  }, [spread, turning, turnY]);

  const goTo = useCallback((target: number) => {
    if (turning || target === spread) return;
    setSpread(target);
    turnY.set(0);
  }, [turning, spread, turnY]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) goNext(); else goPrev();
    };
    const kh = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
    };
    let tx = 0;
    const ts = (e: TouchEvent) => { tx = e.touches[0].clientX; };
    const te = (e: TouchEvent) => {
      const dx = tx - e.changedTouches[0].clientX;
      if (dx > 50) goNext(); if (dx < -50) goPrev();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", kh);
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchend", te, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", kh);
      window.removeEventListener("touchstart", ts);
      window.removeEventListener("touchend", te);
    };
  }, [goNext, goPrev]);

  const visLeft   = SPREADS[spread].left;
  const visRight  = spread < TOTAL - 1 ? SPREADS[spread + 1].right : SPREADS[spread].right;
  const turnFront = SPREADS[spread].right;
  const turnBack  = spread < TOTAL - 1 ? SPREADS[spread + 1].left : SPREADS[spread].left;
  const bms       = SPREADS.map((s, i) => ({ label: s.bookmark, index: i })).filter((b) => b.label);

  return (
    <>
      <div style={{ position: "absolute", top: "2.6rem", left: "1.25rem", right: "2.75rem", bottom: "2.6rem", perspective: "2600px", zIndex: 10 }}>
        <motion.div animate={{ rotateX: 2 }} style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", display: "flex", boxShadow: "0 80px 200px rgba(0,0,0,0.98), 0 30px 80px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.02)" }}>
          <div style={{ position: "absolute", left: -14, top: "2%", bottom: "2%", width: 16, background: COVER_G, borderRadius: "5px 0 0 5px", border: "1px solid rgba(200,241,53,0.08)", boxShadow: "inset -2px 0 6px rgba(0,0,0,0.55)", zIndex: 30 }} />
          <div style={{ width: "calc(50% - 11px)", height: "100%", overflow: "hidden", flexShrink: 0 }}>{visLeft}</div>
          <div style={{ width: 22, flexShrink: 0, background: SPINE_G, zIndex: 25, position: "relative", boxShadow: "3px 0 12px rgba(0,0,0,0.55), -3px 0 12px rgba(0,0,0,0.55)" }}>
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.35)" }} />
            <div style={{ position: "absolute", left: 4, top: 0, bottom: 0, width: 1, background: "rgba(200,241,53,0.12)" }} />
            <div style={{ position: "absolute", right: 4, top: 0, bottom: 0, width: 1, background: "rgba(200,241,53,0.12)" }} />
          </div>
          <div style={{ width: "calc(50% - 11px)", height: "100%", overflow: "hidden", flexShrink: 0, position: "relative" }}>
            {visRight}
            {spread < TOTAL - 1 && (
              <div onClick={goNext} style={{ position: "absolute", bottom: 0, right: 0, cursor: "pointer", width: 0, height: 0, borderLeft: "34px solid transparent", borderBottom: "34px solid rgba(110,78,38,0.22)", zIndex: 10, transition: "transform 0.18s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; }}
              />
            )}
          </div>
          <div style={{ position: "absolute", bottom: -6, left: "1.5%", right: "1.5%", height: 8, background: `repeating-linear-gradient(to right,${PARCH},#d8cdb0 2px)`, borderRadius: "0 0 3px 3px", zIndex: 5 }} />
          {spread < TOTAL - 1 && <TurningPage front={turnFront} back={turnBack} rotateY={turnY} />}
          <div style={{ position: "absolute", right: -14, top: "2%", bottom: "2%", width: 16, background: COVER_G, borderRadius: "0 5px 5px 0", border: "1px solid rgba(200,241,53,0.08)", boxShadow: "inset 2px 0 6px rgba(0,0,0,0.55)", zIndex: 30 }} />
        </motion.div>
        <div style={{ position: "absolute", bottom: -35, left: "4%", right: "4%", height: 45, background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.72) 0%,transparent 70%)", filter: "blur(14px)", pointerEvents: "none" }} />
      </div>

      {/* Bookmarks */}
      <div style={{ position: "absolute", right: "0.35rem", top: "14%", display: "flex", flexDirection: "column", gap: 7, zIndex: 40 }}>
        {bms.map((b) => (
          <button key={b.label} onClick={() => goTo(b.index)} title={b.label!} style={{ width: 26, height: 58, background: b.index === spread ? LIME : "rgba(255,255,255,0.07)", border: "none", borderRadius: "0 5px 5px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: b.index === spread ? `0 0 14px rgba(200,241,53,0.45)` : "none", transition: "all 0.22s", padding: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: "0.38rem", letterSpacing: "0.1em", textTransform: "uppercase", color: b.index === spread ? "#0a0f00" : "rgba(255,255,255,0.28)", transform: "rotate(90deg)", whiteSpace: "nowrap", display: "block" }}>{b.label}</span>
          </button>
        ))}
      </div>

      {/* Logo */}
      <div style={{ position: "absolute", top: "0.55rem", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Image src="/logo-header-dark.png" alt="Proffy" width={88} height={26} style={{ objectFit: "contain", opacity: 0.42 }} />
        </Link>
      </div>

      {/* Nav */}
      <div style={{ position: "absolute", bottom: "0.55rem", left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: "0.9rem" }}>
        <button onClick={goPrev} disabled={spread === 0} style={{ width: 34, height: 34, borderRadius: "50%", background: spread === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.09)", border: `1px solid rgba(255,255,255,${spread === 0 ? "0.04" : "0.14"})`, color: spread === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.65)", cursor: spread === 0 ? "not-allowed" : "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>←</button>
        <div style={{ display: "flex", gap: 5 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{ width: i === spread ? 20 : 6, height: 6, borderRadius: 999, background: i === spread ? LIME : "rgba(255,255,255,0.18)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.28s" }} />
          ))}
        </div>
        <button onClick={goNext} disabled={spread === TOTAL - 1} style={{ width: 34, height: 34, borderRadius: "50%", background: spread === TOTAL - 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.09)", border: `1px solid rgba(255,255,255,${spread === TOTAL - 1 ? "0.04" : "0.14"})`, color: spread === TOTAL - 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.65)", cursor: spread === TOTAL - 1 ? "not-allowed" : "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>→</button>
      </div>
    </>
  );
}

/* ── Root dispatcher ─────────────────────────────────────────────────────── */
function Book() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile ? <BookMobile /> : <BookDesktop />;
}

/* ── Export ──────────────────────────────────────────────────────────────── */
export default function PreviewPage() {
  return (
    <div style={{
      background: `radial-gradient(ellipse 70% 50% at 50% -5%,rgba(200,241,53,0.032) 0%,transparent 60%),${DESK}`,
      height: "100vh",
      overflow: "hidden",
      position: "relative",
    }}>
      <DeskParticles />
      <Book />
    </div>
  );
}
