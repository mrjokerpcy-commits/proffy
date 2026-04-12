"use client";

import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";

/* ── Tokens ──────────────────────────────────────────────────────────────── */
const DESK      = "#07080f";
const PARCH     = "#f0e8d4";
const INK       = "#1a1208";
const INK2      = "#4a3f2f";
const INK3      = "#8c7455";
const LIME      = "#c8f135";
const LIME_G    = "linear-gradient(135deg,#c8f135,#a3d90e)";
const SPINE_G   = "linear-gradient(90deg,#0a3d0a,#1a6b1a,#0a3d0a)";
const COVER_BG  = "linear-gradient(135deg,#0a0d1c 0%,#101528 55%,#080b16 100%)";
const TURN_EASE: [number, number, number, number] = [0.645, 0.045, 0.355, 1.0];
const DISP = "var(--font-cormorant),'Georgia',serif";
const BODY = "var(--font-dm-sans),'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono','Fira Code',monospace";
const SPP  = 300; // scroll pixels per page spread

/* ── Parchment page shell ────────────────────────────────────────────────── */
function Page({
  children,
  side,
  num,
  style,
}: {
  children: React.ReactNode;
  side: "left" | "right";
  num?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: PARCH,
        backgroundImage: `repeating-linear-gradient(transparent,transparent 27px,rgba(0,0,0,0.04) 27px,rgba(0,0,0,0.04) 28px)`,
        backgroundSize: "100% 28px",
        position: "relative",
        overflow: "hidden",
        padding: side === "left" ? "1.75rem 1.5rem 2rem 2.25rem" : "1.75rem 2.25rem 2rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        boxShadow:
          side === "left"
            ? "inset -8px 0 20px rgba(0,0,0,0.12)"
            : "inset 8px 0 20px rgba(0,0,0,0.12)",
        ...style,
      }}
    >
      {/* Red margin line */}
      <div
        style={{
          position: "absolute",
          [side === "left" ? "right" : "left"]: "2rem",
          top: 0,
          bottom: 0,
          width: 1,
          background: "rgba(180,60,60,0.32)",
          pointerEvents: "none",
        }}
      />
      {children}
      {num && (
        <div
          style={{
            position: "absolute",
            bottom: "0.6rem",
            [side === "left" ? "left" : "right"]: "50%",
            transform: "translateX(50%)",
            fontFamily: DISP,
            fontSize: 10,
            color: INK3,
            letterSpacing: "0.1em",
          }}
        >
          {num}
        </div>
      )}
    </div>
  );
}

/* ── Typography helpers ──────────────────────────────────────────────────── */
function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontFamily: DISP, fontSize: "clamp(2.2rem,4.5vw,4.5rem)", fontWeight: 300, lineHeight: 1.06, color: INK, letterSpacing: "-0.02em", margin: 0 }}>
      {children}
    </h1>
  );
}
function H2({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <h2
      style={{
        fontFamily: DISP,
        fontSize: "clamp(1.4rem,2.5vw,3rem)",
        fontWeight: 300,
        lineHeight: 1.15,
        letterSpacing: "-0.01em",
        color: accent ? LIME : INK,
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: INK3, marginBottom: "0.5rem" }}>
      {children}
    </div>
  );
}
function Rule() {
  return <div style={{ width: "3rem", height: 1, background: `linear-gradient(90deg,${INK3},transparent)`, margin: "0.7rem 0" }} />;
}
function BodyText({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <p style={{ fontFamily: BODY, fontSize: small ? "0.875rem" : "1.05rem", fontWeight: 300, lineHeight: 1.72, color: INK2, margin: 0 }}>
      {children}
    </p>
  );
}

/* ── In-page flip cards ──────────────────────────────────────────────────── */
const NETWORK = [
  { letter: "B", name: "Proffy Bagrut",  tagline: "High school",  badge: "Soon", live: false, short: "Every bagrut subject — ask, practice, get clear explanations.", full: "Every bagrut subject covered. Practice with past Ministry of Education exam patterns, get explanations in Hebrew and English.", href: "#",        color: "#a78bfa" },
  { letter: "Y", name: "Proffy Yael",    tagline: "Hebrew writing",badge: "Soon", live: false, short: "Master Hebrew spelling, grammar and academic writing.",           full: "Master Hebrew spelling, grammar, and academic writing for the Yael section of the Israeli psychometric exam. Every rule explained.",  href: "#",        color: "#fbbf24" },
  { letter: "P", name: "Proffy Psycho",  tagline: "Psychometric",  badge: "Beta", live: false, short: "Replace a ₪3,000 prep course. Full AI psychometric prep.",         full: "Replace expensive prep courses. Full AI-powered prep for verbal, quantitative, and English sections. Practice until you hit your target.", href: "#",        color: "#f87171" },
  { letter: "U", name: "Proffy Uni",     tagline: "University",    badge: "Live", live: true,  short: "Upload slides, ask anything, ace the exam.",                      full: "Upload your course slides and past exams. Proffy learns your professor's style and answers like a top student who aced this exact class.", href: "/register", color: "#4f8ef7" },
] as const;

function MiniFlip({ p }: { p: (typeof NETWORK)[number] }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      style={{ perspective: "800px", flex: 1, minHeight: 100, cursor: "pointer" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", position: "relative" }}
      >
        {/* Front */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            borderRadius: 10,
            background: "rgba(255,255,255,0.5)",
            border: p.live ? `1px solid rgba(200,241,53,0.5)` : "1px solid rgba(42,31,14,0.14)",
            boxShadow: p.live ? `0 0 0 2px ${LIME}` : "none",
            padding: "0.75rem",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
        >
          {p.live && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ position: "absolute", inset: -1, borderRadius: 10, border: `1px solid ${LIME}`, pointerEvents: "none" }}
            />
          )}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontFamily: DISP, fontSize: "1.4rem", fontWeight: 700, color: p.color, lineHeight: 1 }}>{p.letter}</span>
            <span style={{ fontFamily: MONO, fontSize: "0.5rem", letterSpacing: "0.1em", padding: "2px 6px", borderRadius: 999, background: p.live ? "rgba(200,241,53,0.18)" : "rgba(42,31,14,0.07)", color: p.live ? "#3a5000" : INK3, border: `1px solid ${p.live ? "rgba(200,241,53,0.4)" : "rgba(42,31,14,0.15)"}` }}>
              {p.live && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: LIME, marginRight: 4, verticalAlign: "middle" }} />}
              {p.badge}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: INK3, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>{p.tagline}</div>
            <div style={{ fontFamily: DISP, fontSize: "0.88rem", fontWeight: 700, color: INK, lineHeight: 1.25 }}>{p.name}</div>
            <div style={{ fontFamily: BODY, fontSize: "0.62rem", color: INK2, lineHeight: 1.55, marginTop: 3 }}>{p.short}</div>
          </div>
        </div>
        {/* Back */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 10,
            background: p.live ? "linear-gradient(135deg,#0d1f00,#1a3d00)" : "linear-gradient(135deg,#0a0d1c,#101528)",
            border: p.live ? "1px solid rgba(200,241,53,0.22)" : "1px solid rgba(79,142,247,0.2)",
            padding: "0.75rem",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
        >
          <p style={{ fontFamily: BODY, fontSize: "0.65rem", lineHeight: 1.65, color: p.live ? "rgba(200,241,53,0.85)" : "rgba(200,210,240,0.85)", margin: 0 }}>{p.full}</p>
          <Link href={p.href} style={{ fontFamily: BODY, fontSize: "0.62rem", fontWeight: 700, padding: "4px 10px", borderRadius: 999, textDecoration: "none", background: p.live ? LIME_G : "linear-gradient(135deg,#4f8ef7,#a78bfa)", color: p.live ? "#0a0f00" : "#fff", alignSelf: "flex-start", display: "inline-flex" }}>
            {p.live ? "Start now →" : "Get notified →"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Confetti ────────────────────────────────────────────────────────────── */
function Confetti({ active }: { active: boolean }) {
  const pieces = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: -(80 + Math.random() * 140),
      rot: Math.random() * 720 - 360,
      color: [LIME, "#fff", "#4ade80", "#fbbf24", "#a78bfa"][i % 5],
      w: 5 + Math.random() * 7,
      h: 3 + Math.random() * 5,
      delay: Math.random() * 0.4,
    }))
  ).current;

  if (!active) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 15, overflow: "hidden" }}>
      {pieces.map((c) => (
        <motion.div
          key={c.id}
          initial={{ x: "50%", y: "60%", scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: `calc(50% + ${c.x}px)`, y: `calc(60% + ${c.y}px)`, scale: [0, 1, 0.8], rotate: c.rot, opacity: [1, 1, 0] }}
          transition={{ duration: 1.3, delay: c.delay, ease: "easeOut" }}
          style={{ position: "absolute", top: 0, left: 0, width: c.w, height: c.h, background: c.color, borderRadius: 2 }}
        />
      ))}
    </div>
  );
}

/* ── Spread content ──────────────────────────────────────────────────────── */
// Spread 0 — Title
function S0L() {
  return (
    <Page side="left">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
        <Image src="/logo-owl.png" alt="" width={48} height={48} style={{ objectFit: "contain", opacity: 0.12, filter: "sepia(1)" }} />
        <div style={{ width: "55%", height: 1, background: `linear-gradient(90deg,transparent,${INK3},transparent)` }} />
        <div style={{ fontFamily: DISP, fontSize: "0.65rem", color: INK3, letterSpacing: "0.28em", textTransform: "uppercase", textAlign: "center" }}>Academic Intelligence</div>
        <div style={{ width: "55%", height: 1, background: `linear-gradient(90deg,transparent,${INK3},transparent)` }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
          {["TAU","Technion","HUJI","BGU","Bar Ilan","Ariel"].map((u) => (
            <span key={u} style={{ fontFamily: BODY, fontSize: "0.58rem", color: INK3, padding: "2px 8px", border: "1px solid rgba(42,31,14,0.2)", borderRadius: 4 }}>{u}</span>
          ))}
        </div>
        <div style={{ fontFamily: DISP, fontSize: "0.62rem", color: INK3, letterSpacing: "0.12em", marginTop: "0.5rem", fontStyle: "italic" }}>
          Use arrow keys or scroll to turn pages
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

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: y * -8, ry: x * 8 });
  };

  return (
    <Page side="right" num="i">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1rem", position: "relative" }}>
        <Label>proffy.study</Label>
        <H1>PROFFY</H1>
        <Rule />
        <div style={{ fontFamily: DISP, fontSize: "clamp(0.9rem,1.6vw,1.2rem)", color: INK2, fontStyle: "italic", lineHeight: 1.45 }}>
          The AI tutor that knows your exam.
        </div>
        <BodyText small>
          From bagrut to university, AI that understands your course, your professor, and your exam.
        </BodyText>
        <div style={{ marginTop: "0.5rem" }}>
          <Link href="/register" style={{ fontFamily: BODY, fontSize: "0.8rem", fontWeight: 700, padding: "0.55rem 1.4rem", borderRadius: 999, background: LIME_G, color: "#0a0f00", textDecoration: "none", display: "inline-flex" }}>
            Start with Proffy Uni →
          </Link>
        </div>
        {/* Hero owl — spring entrance, mouse tilt */}
        <motion.div
          ref={ref}
          onMouseMove={onMove}
          onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={entered ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          style={{
            position: "absolute", right: 0, bottom: 0,
            rotateX: tilt.rx, rotateY: tilt.ry,
            transformPerspective: 600,
          }}
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <Image src="/mascot/hero.png" alt="Proffy" width={160} height={160} style={{ objectFit: "contain", opacity: 0.72, filter: "sepia(0.25)" }} />
          </motion.div>
        </motion.div>
      </div>
    </Page>
  );
}

// Spread 1 — Mission
function S1L() {
  return (
    <Page side="left" num="1">
      <Label>Chapter I</Label>
      <H2>Our Mission</H2>
      <Rule />
      <BodyText>
        Proffy gives every student the same advantage a private tutor provides — except it knows your exact professor, your slides, and your exam date.
      </BodyText>
      <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(255,255,255,0.5)", borderRadius: 8, border: "1px solid rgba(42,31,14,0.12)" }}>
        <div style={{ display: "flex", gap: 3, marginBottom: "0.5rem" }}>
          {Array.from({ length: 5 }).map((_, j) => (
            <svg key={j} width="11" height="11" viewBox="0 0 24 24" fill="#c8a040"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          ))}
        </div>
        <div style={{ fontFamily: DISP, fontSize: "0.9rem", fontStyle: "italic", color: INK, lineHeight: 1.65 }}>
          &ldquo;We built the tool we wished we had when we were students.&rdquo;
        </div>
        <div style={{ fontFamily: BODY, fontSize: "0.62rem", color: INK3, marginTop: "0.4rem" }}>Proffy Team, Israel</div>
      </div>
      <div style={{ marginTop: "auto" }}>
        <Image src="/mascot/reading.png" alt="" width={65} height={65} style={{ objectFit: "contain", opacity: 0.4, filter: "sepia(0.5)", float: "right" }} />
      </div>
    </Page>
  );
}

function S1R() {
  const items = [
    { title: "Study smarter", desc: "AI that reads your actual material and understands what matters for your exam." },
    { title: "Save time", desc: "Instant answers from your slides. No more searching for hours." },
    { title: "Source-cited", desc: "Every answer cites the exact slide and page. No hallucinations." },
    { title: "Available 24/7", desc: "Study at 3am the night before. Proffy never sleeps." },
  ];
  return (
    <Page side="right" num="2">
      <Label>Four principles</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", flex: 1 }}>
        {items.map((item) => (
          <div key={item.title} style={{ padding: "0.875rem", background: "rgba(255,255,255,0.5)", borderRadius: 8, border: "1px solid rgba(42,31,14,0.12)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ fontFamily: DISP, fontSize: "0.95rem", fontWeight: 700, color: INK }}>{item.title}</div>
            <div style={{ fontFamily: BODY, fontSize: "0.7rem", color: INK2, lineHeight: 1.65 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

// Spread 2 — How It Works
const STEPS = [
  { n: "I",   title: "Upload your material", desc: "Drop lecture slides, past exams, or a Google Drive link. Proffy indexes everything and learns your course inside out." },
  { n: "II",  title: "Ask anything",          desc: "Every answer cites the exact slide or page from your material. No hallucinations, no generic advice." },
  { n: "III", title: "Walk in ready",          desc: "Flashcards with spaced repetition, professor pattern analysis, and an exam countdown that tells you exactly what to focus on." },
];

function S2L() {
  return (
    <Page side="left" num="3">
      <Label>Chapter II</Label>
      <H2>How It Works</H2>
      <Rule />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", flex: 1 }}>
        {STEPS.slice(0, 2).map((s) => (
          <div key={s.n} style={{ display: "flex", gap: "0.75rem" }}>
            <span style={{ fontFamily: DISP, fontSize: "1rem", fontWeight: 700, color: INK3, flexShrink: 0, width: 26 }}>{s.n}.</span>
            <div>
              <div style={{ fontFamily: DISP, fontSize: "0.95rem", fontWeight: 700, color: INK, marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontFamily: BODY, fontSize: "0.7rem", color: INK2, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto" }}>
        <Image src="/mascot/thinking.png" alt="" width={68} height={68} style={{ objectFit: "contain", opacity: 0.4, filter: "sepia(0.5)", float: "right" }} />
      </div>
    </Page>
  );
}

function S2R() {
  return (
    <Page side="right" num="4">
      <div style={{ paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem", flex: 1 }}>
        {STEPS.slice(2).map((s) => (
          <div key={s.n} style={{ display: "flex", gap: "0.75rem" }}>
            <span style={{ fontFamily: DISP, fontSize: "1rem", fontWeight: 700, color: INK3, flexShrink: 0, width: 26 }}>{s.n}.</span>
            <div>
              <div style={{ fontFamily: DISP, fontSize: "0.95rem", fontWeight: 700, color: INK, marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontFamily: BODY, fontSize: "0.7rem", color: INK2, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(79,142,247,0.07)", borderRadius: 8, border: "1px solid rgba(79,142,247,0.16)" }}>
          <div style={{ fontFamily: DISP, fontSize: "1rem", fontStyle: "italic", color: INK, marginBottom: "0.4rem" }}>
            &ldquo;From slides to exam-ready in minutes.&rdquo;
          </div>
          <div style={{ fontFamily: BODY, fontSize: "0.7rem", color: INK2, lineHeight: 1.7 }}>Upload your material, ask questions, and let Proffy do the heavy lifting.</div>
        </div>
      </div>
    </Page>
  );
}

// Spread 3 — Network (B + Y)
function S3L() {
  return (
    <Page side="left" num="5">
      <Label>Chapter III — The Network</Label>
      <H2>One AI, every stage of education.</H2>
      <Rule />
      <div style={{ fontFamily: BODY, fontSize: "0.7rem", color: INK2, marginBottom: "0.75rem", lineHeight: 1.7 }}>
        Hover each card to flip it and see what&apos;s coming.
      </div>
      <div style={{ display: "flex", gap: "0.625rem", flex: 1 }}>
        {NETWORK.slice(0, 2).map((p) => <MiniFlip key={p.name} p={p} />)}
      </div>
    </Page>
  );
}

function S3R() {
  return (
    <Page side="right" num="6">
      <div style={{ display: "flex", gap: "0.625rem", paddingTop: "2rem", flex: 1 }}>
        {NETWORK.slice(2).map((p) => <MiniFlip key={p.name} p={p} />)}
      </div>
      <div style={{ marginTop: "0.875rem", padding: "0.875rem", background: "rgba(200,241,53,0.1)", borderRadius: 8, border: "1px solid rgba(200,241,53,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.35rem" }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: "50%", background: LIME, boxShadow: `0 0 5px ${LIME}`, flexShrink: 0 }} />
          <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "#3a5000", letterSpacing: "0.1em" }}>PROFFY UNI IS LIVE</span>
        </div>
        <div style={{ fontFamily: BODY, fontSize: "0.68rem", color: INK2, lineHeight: 1.6 }}>Upload slides, ask anything, ace the exam.</div>
      </div>
      {/* Thinking owl with head tilt */}
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
        <motion.div animate={{ rotateZ: [-8, 8, -8] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <Image src="/mascot/thinking.png" alt="" width={70} height={70} style={{ objectFit: "contain", opacity: 0.45, filter: "sepia(0.4)" }} />
        </motion.div>
      </div>
    </Page>
  );
}

// Spread 4 — Meet Proffy
const BULLETS = [
  "Knows your course, professor, and exam date",
  "Answers with sources from your own material",
  "Builds exam-focused study plans automatically",
  "Available 24/7, even the night before",
];

function S4L() {
  return (
    <Page side="left" num="7">
      <Label>Chapter IV — Meet Proffy</Label>
      <H2>Your AI study companion.</H2>
      <Rule />
      <BodyText small>
        Proffy is not a search engine. It reads your actual course material, learns your professor&apos;s style, and answers like a top student who aced this exact class last semester.
      </BodyText>
      <BodyText small>
        No hallucinations. No generic advice. Just what you need to pass.
      </BodyText>
      <div style={{ marginTop: "auto" }}>
        <Image src="/mascot/thumbsup.png" alt="" width={85} height={85} style={{ objectFit: "contain", opacity: 0.5, filter: "sepia(0.35)", float: "right" }} />
      </div>
    </Page>
  );
}

function S4R() {
  return (
    <Page side="right" num="8">
      <Label>What Proffy does</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", flex: 1 }}>
        {BULLETS.map((b) => (
          <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", padding: "0.6rem 0.75rem", background: "rgba(255,255,255,0.5)", borderRadius: 7, border: "1px solid rgba(42,31,14,0.1)" }}>
            <span style={{ fontFamily: BODY, fontSize: "0.75rem", fontWeight: 700, color: "#3a5000", flexShrink: 0, marginTop: 1 }}>✓</span>
            <span style={{ fontFamily: BODY, fontSize: "0.73rem", color: INK2, lineHeight: 1.55 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <Link href="/register" style={{ fontFamily: BODY, fontSize: "0.82rem", fontWeight: 700, padding: "0.6rem 1.4rem", borderRadius: 999, background: LIME_G, color: "#0a0f00", textDecoration: "none", display: "inline-flex" }}>
          Start with Proffy Uni →
        </Link>
      </div>
    </Page>
  );
}

// Spread 5 — CTA
function S5L() {
  const [confetti, setConfetti] = useState(false);
  return (
    <Page side="left" num="9">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem", textAlign: "center", position: "relative" }}>
        <Confetti active={confetti} />
        {/* Celebrate owl — overshoot spring + jump loop */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 180, damping: 10 }}
          onAnimationComplete={() => setConfetti(true)}
        >
          <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}>
            <Image src="/mascot/celebrate.png" alt="" width={95} height={95} style={{ objectFit: "contain", opacity: 0.75, filter: "sepia(0.15)" }} />
          </motion.div>
        </motion.div>
        <H2>Ready to study smarter?</H2>
        <BodyText small>Join thousands of students worldwide.</BodyText>
        <Link href="/register" style={{ fontFamily: BODY, fontSize: "0.85rem", fontWeight: 700, padding: "0.65rem 1.75rem", borderRadius: 999, background: LIME_G, color: "#0a0f00", textDecoration: "none", display: "inline-flex" }}>
          Get Early Access →
        </Link>
      </div>
    </Page>
  );
}

function S5R() {
  return (
    <Page side="right">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem", textAlign: "center" }}>
        <Image src="/logo-header-dark.png" alt="Proffy" width={110} height={34} style={{ objectFit: "contain", opacity: 0.25, filter: "sepia(1)" }} />
        <div style={{ width: "50%", height: 1, background: `linear-gradient(90deg,transparent,${INK3},transparent)` }} />
        <div style={{ fontFamily: DISP, fontSize: "0.7rem", color: INK3, letterSpacing: "0.2em", textTransform: "uppercase" }}>Built for every student</div>
        <div style={{ fontFamily: DISP, fontSize: "0.65rem", color: INK3 }}>&copy; 2026 Proffy</div>
        <motion.div animate={{ rotate: [0, -5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} style={{ marginTop: "0.75rem" }}>
          <Image src="/mascot/sleeping.png" alt="" width={68} height={68} style={{ objectFit: "contain", opacity: 0.4, filter: "sepia(0.5)" }} />
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
  { left: <S3L />, right: <S3R />, bookmark: "NETWORK" },
  { left: <S4L />, right: <S4R />, bookmark: "MEET"    },
  { left: <S5L />, right: <S5R />, bookmark: "START"   },
];
const TOTAL = SPREADS.length;

/* ── Turning page ────────────────────────────────────────────────────────── */
function TurningPage({
  front,
  back,
  rotateY,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  rotateY: MotionValue<number>;
}) {
  return (
    <motion.div
      style={{
        position: "absolute", top: 0, left: "50%",
        width: "50%", height: "100%",
        transformStyle: "preserve-3d",
        transformOrigin: "left center",
        rotateY,
        zIndex: 20,
      }}
    >
      <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
        {front}
      </div>
      <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
        {back}
      </div>
    </motion.div>
  );
}

/* ── Bookmark ribbons ────────────────────────────────────────────────────── */
function Bookmarks({ spread, onGo }: { spread: number; onGo: (s: number) => void }) {
  const bms = SPREADS.map((s, i) => ({ label: s.bookmark, index: i })).filter((b) => b.label);
  return (
    <div style={{ position: "absolute", right: -38, top: "12%", display: "flex", flexDirection: "column", gap: 6, zIndex: 30 }}>
      {bms.map((b) => (
        <button
          key={b.label}
          onClick={() => onGo(b.index)}
          title={b.label!}
          style={{
            width: 28, height: 58,
            background: b.index === spread ? LIME : "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: "0 4px 4px 0",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: b.index === spread ? `0 0 12px rgba(200,241,53,0.4)` : "none",
            transition: "all 0.2s",
            padding: 0,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.42rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: b.index === spread ? "#0a0f00" : "rgba(255,255,255,0.35)",
              transform: "rotate(90deg)",
              whiteSpace: "nowrap",
              display: "block",
            }}
          >
            {b.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Canvas particles ────────────────────────────────────────────────────── */
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
    const ps: P[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vy: -(0.15 + Math.random() * 0.4),
      vxPhase: Math.random() * Math.PI * 2,
      sym: SYMS[Math.floor(Math.random() * SYMS.length)],
      op: 0.06 + Math.random() * 0.12,
      sz: 12 + Math.floor(Math.random() * 8),
    }));

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.op;
        ctx.fillStyle = `rgba(200,241,53,1)`;
        ctx.font = `${p.sz}px ${MONO}`;
        ctx.fillText(p.sym, p.x, p.y);
        ctx.restore();
        p.y += p.vy;
        p.x += Math.sin(frame * 0.01 + p.vxPhase) * 0.3;
        if (p.y < -20) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
      });
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

/* ── Book ────────────────────────────────────────────────────────────────── */
function Book({ scrollY }: { scrollY: MotionValue<number> }) {
  const [spread, setSpread] = useState(0);

  const turnRotation = useTransform(scrollY, (y) => {
    const maxY = (TOTAL - 1) * SPP;
    const cy = Math.max(0, Math.min(y, maxY));
    const progress = (cy % SPP) / SPP;
    return -progress * 180;
  });

  useMotionValueEvent(scrollY, "change", (y) => {
    const maxY = (TOTAL - 1) * SPP;
    const cy = Math.max(0, Math.min(y, maxY));
    setSpread(Math.floor(cy / SPP));
  });

  const goTo = useCallback((s: number) => {
    window.scrollTo({ top: s * SPP, behavior: "smooth" });
  }, []);

  const goNext = useCallback(() => { if (spread < TOTAL - 1) goTo(spread + 1); }, [spread, goTo]);
  const goPrev = useCallback(() => { if (spread > 0) goTo(spread - 1); }, [spread, goTo]);

  useEffect(() => {
    const kh = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    let tx = 0;
    const ts = (e: TouchEvent) => { tx = e.touches[0].clientX; };
    const te = (e: TouchEvent) => {
      const dx = tx - e.changedTouches[0].clientX;
      if (dx > 50) goNext();
      if (dx < -50) goPrev();
    };
    window.addEventListener("keydown", kh);
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchend", te, { passive: true });
    return () => { window.removeEventListener("keydown", kh); window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  }, [goNext, goPrev]);

  const visLeft  = SPREADS[spread].left;
  const visRight = spread < TOTAL - 1 ? SPREADS[spread + 1]?.right ?? SPREADS[TOTAL-1].right : SPREADS[spread].right;
  const turnFront = SPREADS[spread].right;
  const turnBack  = SPREADS[spread + 1]?.left ?? SPREADS[TOTAL-1].left;

  return (
    <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", padding: "0 1rem" }}>
      {/* Book frame */}
      <div style={{ perspective: "2200px", width: "100%", position: "relative" }}>
        <motion.div
          animate={{ rotateX: 3 }}
          style={{
            width: "100%",
            aspectRatio: "16/10",
            position: "relative",
            transformStyle: "preserve-3d",
            display: "flex",
            boxShadow: "0 40px 120px rgba(0,0,0,0.95), 0 10px 40px rgba(0,0,0,0.7)",
          }}
        >
          {/* Left leather cover edge */}
          <div style={{ position: "absolute", left: -12, top: "3%", bottom: "3%", width: 14, background: COVER_BG, borderRadius: "4px 0 0 4px", border: "1px solid rgba(200,241,53,0.12)", boxShadow: "inset -2px 0 4px rgba(0,0,0,0.4)", zIndex: 30 }} />

          {/* Left page */}
          <div style={{ width: "calc(50% - 9px)", height: "100%", overflow: "hidden", flexShrink: 0 }}>
            {visLeft}
          </div>

          {/* Spine */}
          <div style={{ width: 18, flexShrink: 0, background: SPINE_G, zIndex: 25, position: "relative", boxShadow: "2px 0 8px rgba(0,0,0,0.4), -2px 0 8px rgba(0,0,0,0.4)" }}>
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.25)" }} />
          </div>

          {/* Right page */}
          <div style={{ width: "calc(50% - 9px)", height: "100%", overflow: "hidden", flexShrink: 0, position: "relative" }}>
            {visRight}
            {/* Corner fold hint */}
            {spread < TOTAL - 1 && (
              <div
                onClick={goNext}
                style={{
                  position: "absolute", bottom: 0, right: 0, cursor: "pointer",
                  width: 0, height: 0,
                  borderLeft: "28px solid transparent",
                  borderBottom: `28px solid rgba(139,107,66,0.22)`,
                  transition: "transform 0.2s",
                  zIndex: 10,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-5px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; }}
              />
            )}
          </div>

          {/* Page edges */}
          <div style={{ position: "absolute", bottom: -6, left: "2%", right: "2%", height: 8, background: `repeating-linear-gradient(to right,${PARCH},#e8dcc4 2.5px)`, borderRadius: "0 0 3px 3px", zIndex: 5 }} />

          {/* Turning page */}
          {spread < TOTAL - 1 && (
            <TurningPage front={turnFront} back={turnBack} rotateY={turnRotation} />
          )}

          {/* Bookmarks */}
          <Bookmarks spread={spread} onGo={goTo} />

          {/* Right leather cover edge */}
          <div style={{ position: "absolute", right: -12, top: "3%", bottom: "3%", width: 14, background: COVER_BG, borderRadius: "0 4px 4px 0", border: "1px solid rgba(200,241,53,0.12)", boxShadow: "inset 2px 0 4px rgba(0,0,0,0.4)", zIndex: 30 }} />
        </motion.div>

        {/* Desk shadow */}
        <div style={{ position: "absolute", bottom: -30, left: "5%", right: "5%", height: 40, background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.7) 0%, transparent 70%)", filter: "blur(10px)", pointerEvents: "none" }} />
      </div>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <button onClick={goPrev} disabled={spread === 0} style={{ width: 38, height: 38, borderRadius: "50%", background: spread === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)", border: `1px solid rgba(255,255,255,${spread === 0 ? "0.05" : "0.13"})`, color: spread === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.65)", cursor: spread === 0 ? "not-allowed" : "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>←</button>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{ width: i === spread ? 20 : 6, height: 6, borderRadius: 999, background: i === spread ? LIME : "rgba(255,255,255,0.18)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
          ))}
        </div>
        <button onClick={goNext} disabled={spread === TOTAL - 1} style={{ width: 38, height: 38, borderRadius: "50%", background: spread === TOTAL - 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)", border: `1px solid rgba(255,255,255,${spread === TOTAL - 1 ? "0.05" : "0.13"})`, color: spread === TOTAL - 1 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.65)", cursor: spread === TOTAL - 1 ? "not-allowed" : "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>→</button>
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em" }}>
        scroll · arrow keys · swipe
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function PreviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  return (
    <div
      ref={containerRef}
      style={{ background: DESK, fontFamily: BODY, position: "relative" }}
    >
      {/* Scroll height creates the turns */}
      <div style={{ height: `calc(100vh + ${(TOTAL - 1) * SPP}px)` }}>
        {/* Sticky book viewport */}
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem 0 1rem",
            overflow: "hidden",
          }}
        >
          {/* Desk background glow */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "40%", background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,241,53,0.04) 0%, transparent 60%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: "60%", background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.5) 0%, transparent 70%)" }} />
          </div>

          <DeskParticles />

          {/* Logo mark */}
          <div style={{ position: "absolute", top: "0.875rem", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Image src="/logo-header-dark.png" alt="Proffy" width={88} height={26} style={{ objectFit: "contain", opacity: 0.5 }} />
            </Link>
          </div>

          <div style={{ position: "relative", zIndex: 10, width: "100%" }}>
            <Book scrollY={scrollY} />
          </div>
        </div>
      </div>
    </div>
  );
}
