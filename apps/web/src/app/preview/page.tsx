"use client";

import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionTemplate,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const S = {
  bg:         "#07080f",
  surface:    "#0c0f1e",
  elevated:   "#131728",
  hover:      "#191e30",
  border:     "rgba(255,255,255,0.06)",
  borderHi:   "rgba(79,142,247,0.30)",
  lime:       "#c8f135",
  limeGlow:   "rgba(200,241,53,0.30)",
  limeDim:    "rgba(200,241,53,0.10)",
  p:          "#4f8ef7",
  lt:         "#a78bfa",
  grad:       "linear-gradient(135deg,#4f8ef7,#a78bfa)",
  limeGrad:   "linear-gradient(135deg,#c8f135,#a3d90e)",
  parchment:  "#f0e8d4",
  leather:    "#1a1208",
  leatherDk:  "#0d0904",
  text:       "#e8eaf0",
  textSub:    "#8892a4",
  textMuted:  "#4e5568",
  gold:       "#c8a85a",
  goldDim:    "rgba(200,168,90,0.55)",
} as const;

const DISP = "var(--font-cormorant),'Georgia',serif";
const BODY = "var(--font-dm-sans),'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono','Fira Code',monospace";
const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const BOOK_EASE: [number, number, number, number] = [0.33, 1, 0.68, 1];

/* ─── Data ───────────────────────────────────────────────────────────────────── */
const NETWORK = [
  {
    letter: "B",
    name: "Proffy Bagrut",
    tagline: "High school",
    badge: "Coming Soon",
    live: false,
    shortDesc: "Every bagrut subject. Ask, practice, get clear explanations.",
    fullDesc:
      "Every bagrut subject covered. Ask questions, practice with past Ministry of Education exam patterns, and get clear explanations in Hebrew and English.",
    href: "#",
    color: "#a78bfa",
  },
  {
    letter: "Y",
    name: "Proffy Yael",
    tagline: "Hebrew writing",
    badge: "Coming Soon",
    live: false,
    shortDesc: "Master Hebrew spelling, grammar, and academic writing.",
    fullDesc:
      "Master Hebrew spelling, grammar, and academic writing. Built specifically for the Yael section of the Israeli psychometric exam. Every rule, explained clearly.",
    href: "#",
    color: "#fbbf24",
  },
  {
    letter: "P",
    name: "Proffy Psycho",
    tagline: "Psychometric",
    badge: "Beta",
    live: false,
    shortDesc: "Replace a ₪3,000 prep course. Full AI psychometric prep.",
    fullDesc:
      "Replace expensive prep courses. Full AI-powered prep for verbal, quantitative, and English sections. Practice every section type until you hit your target score.",
    href: "#",
    color: "#f87171",
  },
  {
    letter: "U",
    name: "Proffy Uni",
    tagline: "University",
    badge: "Live",
    live: true,
    shortDesc: "Upload slides, ask anything, ace the exam.",
    fullDesc:
      "Upload your course slides, past exams, and professor notes. Proffy learns your professor's style and answers like a top student who aced this exact class last semester.",
    href: "/register",
    color: "#4f8ef7",
  },
] as const;

const MISSION_ITEMS = [
  {
    title: "Study smarter",
    desc: "AI that reads your actual material and understands exactly what matters for your specific exam.",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    title: "Save time",
    desc: "Get instant answers from your slides instead of searching for hours. Know exactly what to focus on.",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    title: "Source-cited answers",
    desc: "Every answer cites the exact slide and page number. No hallucinations, no generic advice.",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    title: "Available 24/7",
    desc: "Study at 3am the night before the exam. Proffy never sleeps and never judges.",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
  },
] as const;

const STEPS = [
  {
    num: "01",
    title: "Upload your material",
    desc: "Drop lecture slides, past exams, or a Google Drive link. Proffy indexes everything and learns your course inside out.",
  },
  {
    num: "02",
    title: "Ask anything",
    desc: "Every answer cites the exact slide or page from your material. No hallucinations, no generic advice.",
  },
  {
    num: "03",
    title: "Walk in ready",
    desc: "Flashcards with spaced repetition, professor pattern analysis, and an exam countdown that tells you what to focus on.",
  },
] as const;

const MEET_BULLETS = [
  "Knows your course, professor, and exam date",
  "Answers with sources from your own material",
  "Builds exam-focused study plans automatically",
  "Available 24/7, even the night before",
] as const;

const UNIS = ["TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Ariel"] as const;

const PILLS = [
  "Course-aware AI",
  "Source-cited answers",
  "Hebrew and English",
  "All platforms",
  "24/7",
] as const;

/* ─── Canvas particles ───────────────────────────────────────────────────────── */
function ParticleCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const SYMBOLS = ["∑", "π", "∫", "α", "β", "ℵ", "∞", "√", "Δ", "λ", "ψ",
                     "∂", "∇", "×", "≠", "≈", "ב", "ח", "ס", "פ", "ℒ", "ω"];
    const COLORS = ["#4f8ef7", "#a78bfa", "#c8f135", "rgba(200,168,90,0.7)"];

    type P = { x: number; y: number; vy: number; sym: string; opacity: number; size: number; color: string };

    const particles: P[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vy: -(0.25 + Math.random() * 0.45),
      sym: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      opacity: 0.08 + Math.random() * 0.22,
      size: 13 + Math.floor(Math.random() * 14),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px ${MONO}`;
        ctx.fillText(p.sym, p.x, p.y);
        ctx.restore();
        p.y += p.vy;
        if (p.y < -30) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
      });
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
    />
  );
}

/* ─── Card3D (mouse-tracking tilt + glare) ───────────────────────────────────── */
function Card3D({
  children,
  style,
  maxTilt = 9,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 380,
    damping: 28,
  });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 380,
    damping: 28,
  });
  const glareX = useTransform(rawX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(rawY, [-0.5, 0.5], ["0%", "100%"]);
  const glareOpacity = useMotionValue(0);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.09) 0%, transparent 55%)`;

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
    glareOpacity.set(1);
  };
  const onMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
    glareOpacity.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: "preserve-3d", position: "relative", ...style }}
    >
      <motion.div
        style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          pointerEvents: "none", zIndex: 2, opacity: glareOpacity, background: glareBg,
        }}
      />
      {children}
    </motion.div>
  );
}

/* ─── FlipCard (network cards) ───────────────────────────────────────────────── */
function FlipCard({ product }: { product: (typeof NETWORK)[number] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ height: 290, perspective: "1100px", cursor: "pointer" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        animate={{ rotateY: hovered ? 180 : 0 }}
        transition={{ duration: 0.65, ease: BOOK_EASE }}
        style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", position: "relative" }}
      >
        {/* ── Front ── */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: "1.25rem",
            background: S.surface,
            border: product.live ? `1px solid rgba(200,241,53,0.38)` : `1px solid ${S.border}`,
            boxShadow: product.live ? `0 0 24px rgba(200,241,53,0.08)` : "none",
            display: "flex", flexDirection: "column", padding: "2rem", gap: "1rem",
            overflow: "hidden",
          }}
        >
          {/* Pulsing live border */}
          {product.live && (
            <motion.div
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: -1, borderRadius: "1.25rem",
                border: `1px solid ${S.lime}`, pointerEvents: "none",
              }}
            />
          )}

          {/* Letter icon */}
          <div
            style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: `${product.color}18`, border: `1px solid ${product.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: DISP, fontSize: 26, fontWeight: 700, color: product.color,
            }}
          >
            {product.letter}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: S.textMuted, marginBottom: "0.4rem", fontFamily: BODY }}>
              {product.tagline}
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: S.text, marginBottom: "0.6rem", fontFamily: BODY, letterSpacing: "-0.02em" }}>
              {product.name}
            </h3>
            <p style={{ fontSize: "0.82rem", lineHeight: 1.65, color: S.textSub, fontFamily: BODY }}>
              {product.shortDesc}
            </p>
          </div>

          {/* Badge */}
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.28rem 0.75rem", borderRadius: 999,
              fontSize: "0.65rem", fontWeight: 700, fontFamily: BODY,
              background: product.live ? "rgba(200,241,53,0.10)" : "rgba(255,255,255,0.05)",
              color: product.live ? S.lime : S.textMuted,
              border: `1px solid ${product.live ? "rgba(200,241,53,0.22)" : "rgba(255,255,255,0.08)"}`,
              alignSelf: "flex-start",
            }}
          >
            {product.live && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: S.lime, boxShadow: `0 0 5px ${S.lime}` }}
              />
            )}
            {product.badge}
          </div>

          {/* Flip hint */}
          <div style={{ fontSize: "0.68rem", color: S.textMuted, fontFamily: BODY, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Hover to flip
          </div>
        </div>

        {/* ── Back ── */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: "1.25rem",
            background: product.live
              ? `linear-gradient(145deg, rgba(200,241,53,0.13), rgba(200,241,53,0.04))`
              : `linear-gradient(145deg, rgba(79,142,247,0.14), rgba(167,139,250,0.05))`,
            border: product.live
              ? `1px solid rgba(200,241,53,0.28)`
              : `1px solid rgba(79,142,247,0.22)`,
            padding: "2rem",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <div>
            <div style={{ fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: product.live ? S.lime : S.p, marginBottom: "0.75rem", fontFamily: BODY }}>
              {product.tagline}
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.78, color: S.text, fontFamily: BODY }}>{product.fullDesc}</p>
          </div>
          <Link
            href={product.href}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.88rem", fontWeight: 700,
              padding: "0.75rem 1.5rem", borderRadius: "0.875rem",
              background: product.live ? S.limeGrad : S.grad,
              color: product.live ? "#0a0f00" : "#fff",
              textDecoration: "none", alignSelf: "flex-start",
              boxShadow: product.live ? `0 4px 16px ${S.limeGlow}` : `0 4px 16px rgba(79,142,247,0.3)`,
              fontFamily: BODY,
            }}
          >
            {product.live ? "Start now →" : "Get notified →"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── PageFold (scroll-triggered 3D fold reveal) ─────────────────────────────── */
function PageFold({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: -16, y: 28 }}
      whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.65, ease: BOOK_EASE, delay }}
      style={{ transformPerspective: 1000, transformOrigin: "top center" }}
    >
      {children}
    </motion.div>
  );
}

/* ─── PerspectiveGrid ────────────────────────────────────────────────────────── */
function PerspectiveGrid() {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "52%", overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute", bottom: 0, left: "-65%", right: "-65%", height: "190%",
          backgroundImage: `linear-gradient(rgba(79,142,247,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.11) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          transform: "rotateX(68deg)",
          transformOrigin: "50% 100%",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)",
        }}
      />
      <div
        style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "55%", height: "38%",
          background: "radial-gradient(ellipse at 50% 100%, rgba(79,142,247,0.18) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

/* ─── SpellBook intro ────────────────────────────────────────────────────────── */
type BookPhase = "idle" | "opening" | "zooming";

function SpellBookIntro({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState<BookPhase>("idle");

  const handleClick = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("opening");
    setTimeout(() => setPhase("zooming"), 1500);
  }, [phase]);

  return (
    <motion.div
      key="intro"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: S.bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 0,
        fontFamily: BODY,
      }}
    >
      {/* Particles */}
      <ParticleCanvas active />

      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(79,142,247,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* Cover owl — jumps off as cover opens */}
      <motion.div
        animate={
          phase === "opening"
            ? { y: -110, opacity: 0, rotate: -15 }
            : { y: [0, -9, 0] }
        }
        transition={
          phase === "opening"
            ? { duration: 0.55, ease: EASE, delay: 0.25 }
            : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          position: "relative", zIndex: 10,
          marginBottom: -28, pointerEvents: "none",
        }}
      >
        <Image
          src="/mascot/reading.png"
          alt="Proffy owl"
          width={96}
          height={96}
          style={{ objectFit: "contain", filter: "drop-shadow(0 6px 18px rgba(79,142,247,0.45))" }}
          priority
        />
      </motion.div>

      {/* ── 3D Book ── */}
      <div style={{ perspective: "1100px", position: "relative", zIndex: 5 }}>
        <motion.div
          animate={
            phase === "zooming"
              ? { scale: 14, opacity: [1, 1, 0] }
              : { rotateX: 10, rotateY: phase === "opening" ? -2 : 0 }
          }
          transition={
            phase === "zooming"
              ? { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.6 }
          }
          onAnimationComplete={() => {
            if (phase === "zooming") onEnter();
          }}
          style={{
            width: 360, height: 230,
            position: "relative", transformStyle: "preserve-3d",
            transformOrigin: "50% 50%",
          }}
        >
          {/* Book body (always visible behind cover) */}
          <div
            style={{
              position: "absolute", inset: 0,
              borderRadius: "4px 14px 14px 4px",
              background: `linear-gradient(160deg, ${S.leather} 0%, ${S.leatherDk} 100%)`,
              boxShadow: "6px 10px 48px rgba(0,0,0,0.85), inset -3px 0 6px rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Parchment pages content */}
            <div
              style={{
                position: "absolute", inset: 0,
                background: S.parchment,
                backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, rgba(139,107,66,0.18) 27px, rgba(139,107,66,0.18) 28px)`,
                backgroundSize: "100% 28px",
                padding: "1.5rem 2rem 1.5rem 2.5rem",
                display: "flex", flexDirection: "column", justifyContent: "center",
                gap: 10, overflow: "hidden",
              }}
            >
              {/* Red margin line */}
              <div style={{ position: "absolute", left: "1.5rem", top: 0, bottom: 0, width: 1, background: "rgba(200,100,100,0.35)" }} />

              {/* Right-page owl fades in after cover opens */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={phase === "opening" ? { opacity: 1 } : {}}
                transition={{ delay: 0.9, duration: 0.5 }}
                style={{
                  position: "absolute", right: "1rem", bottom: "0.5rem",
                  pointerEvents: "none",
                }}
              >
                <Image
                  src="/mascot/hero.png"
                  alt="Proffy"
                  width={60}
                  height={60}
                  style={{ objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2)) saturate(0.7) sepia(0.3)" }}
                />
              </motion.div>

              {/* Faint "handwritten" page lines */}
              <div style={{ fontFamily: DISP, fontSize: 13, color: "rgba(80,55,30,0.45)", letterSpacing: "0.08em" }}>Academic Intelligence</div>
              <div style={{ fontFamily: DISP, fontSize: 22, fontWeight: 700, color: "rgba(60,40,20,0.7)", lineHeight: 1.3 }}>One platform.<br/>Every student.</div>
              <div style={{ width: 60, height: 1, background: "rgba(139,107,66,0.35)", marginTop: 4 }} />
              <div style={{ fontFamily: BODY, fontSize: 10, color: "rgba(80,55,30,0.4)", letterSpacing: "0.06em" }}>proffy.study</div>
            </div>
          </div>

          {/* Cover — swings open */}
          <motion.div
            animate={{ rotateY: phase !== "idle" ? -174 : 0 }}
            transition={{ duration: 1.2, ease: BOOK_EASE, delay: 0.1 }}
            style={{
              position: "absolute", inset: 0,
              borderRadius: "4px 14px 14px 4px",
              background: `linear-gradient(160deg, #2d1c0a 0%, #1a1208 45%, #100d07 100%)`,
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              boxShadow: "4px 8px 28px rgba(0,0,0,0.7)",
              zIndex: 3,
            }}
          >
            {/* Cover front face */}
            <div
              style={{
                position: "absolute", inset: 0, borderRadius: "4px 14px 14px 4px",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 10, overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(200,241,53,0.18)", borderRadius: 8 }} />
              <div style={{ position: "absolute", inset: 17, border: "1px solid rgba(200,241,53,0.09)", borderRadius: 6 }} />
              <Image src="/logo-owl.png" alt="Proffy" width={42} height={42} style={{ objectFit: "contain", filter: "brightness(0.6) sepia(0.5)", position: "relative", zIndex: 2 }} />
              <div style={{ fontFamily: DISP, fontSize: 26, fontWeight: 700, color: S.gold, letterSpacing: "0.16em", textAlign: "center", position: "relative", zIndex: 2, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
                PROFFY
              </div>
              <div style={{ width: 52, height: 1, background: `linear-gradient(90deg, transparent, rgba(200,241,53,0.45), transparent)`, position: "relative", zIndex: 2 }} />
              <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.22em", color: S.goldDim, textTransform: "uppercase", position: "relative", zIndex: 2 }}>
                Academic Intelligence
              </div>
            </div>

            {/* Spine shadow */}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: "linear-gradient(90deg, rgba(0,0,0,0.85), rgba(0,0,0,0.25))", borderRadius: "4px 0 0 4px" }} />
          </motion.div>

          {/* Page edges */}
          <div style={{ position: "absolute", right: -5, top: 3, bottom: 3, width: 7, background: "repeating-linear-gradient(to bottom, #f5edd8, #e8dcc4 2.5px)", borderRadius: "0 2px 2px 0" }} />
          {/* Bottom thickness */}
          <div style={{ position: "absolute", bottom: -6, left: 8, right: 4, height: 8, background: "linear-gradient(to bottom, #e8dcc4, #d4c9b0)", borderRadius: "0 0 4px 4px" }} />
        </motion.div>
      </div>

      {/* Enter button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        style={{ marginTop: 40, position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
      >
        <motion.button
          onClick={handleClick}
          disabled={phase !== "idle"}
          whileHover={{ scale: 1.04, boxShadow: `0 8px 32px rgba(200,241,53,0.38)` }}
          whileTap={{ scale: 0.97 }}
          style={{
            fontFamily: BODY, fontSize: "1rem", fontWeight: 700,
            padding: "0.9rem 2.75rem", borderRadius: 999,
            background: S.limeGrad, color: "#0a0f00",
            border: "none", cursor: phase !== "idle" ? "default" : "pointer",
            opacity: phase !== "idle" ? 0.6 : 1,
            boxShadow: `0 4px 24px ${S.limeGlow}`,
            letterSpacing: "0.01em", transition: "opacity 0.2s",
          }}
        >
          Open the Spellbook →
        </motion.button>

        <button
          onClick={onEnter}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "0.75rem", color: S.textMuted, fontFamily: BODY,
            letterSpacing: "0.04em",
          }}
        >
          Skip intro
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Sticky bar ─────────────────────────────────────────────────────────────── */
function StickyBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const fn = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{
            position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
            zIndex: 100, display: "flex", alignItems: "center", gap: "1rem",
            padding: "0.7rem 0.7rem 0.7rem 1.25rem",
            borderRadius: 999,
            background: "rgba(7,8,15,0.95)", backdropFilter: "blur(24px)",
            border: `1px solid rgba(79,142,247,0.28)`,
            boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
            fontFamily: BODY,
          }}
        >
          <Image src="/logo-owl.png" alt="Proffy" width={28} height={28} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: S.textSub, whiteSpace: "nowrap" }}>
            Ready to ace your exams?
          </span>
          <Link
            href="/register"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "0.5rem 1.25rem", borderRadius: 999,
              background: S.limeGrad, color: "#0a0f00",
              fontWeight: 700, fontSize: "0.875rem", textDecoration: "none",
              whiteSpace: "nowrap", cursor: "pointer",
            }}
          >
            Start free →
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Section label ──────────────────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-block", fontSize: "0.68rem", fontWeight: 700,
        padding: "0.32rem 0.95rem", borderRadius: 999,
        letterSpacing: "0.14em", textTransform: "uppercase",
        background: "rgba(79,142,247,0.08)", color: S.p,
        border: `1px solid rgba(79,142,247,0.18)`,
        marginBottom: "1.25rem", fontFamily: BODY,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Section heading ────────────────────────────────────────────────────────── */
function SectionHead({
  label,
  title,
  sub,
  center = true,
}: {
  label: string;
  title: React.ReactNode;
  sub?: string;
  center?: boolean;
}) {
  return (
    <PageFold>
      <div style={{ textAlign: center ? "center" : "left", marginBottom: "3.5rem" }}>
        <Label>{label}</Label>
        <h2
          style={{
            fontSize: "clamp(2rem,3.8vw,3rem)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.15, margin: 0,
            fontFamily: DISP, color: S.text,
          }}
        >
          {title}
        </h2>
        {sub && (
          <p style={{ fontSize: "1.05rem", color: S.textSub, marginTop: "1rem", maxWidth: "36rem", margin: "1rem auto 0", lineHeight: 1.75, fontFamily: BODY }}>
            {sub}
          </p>
        )}
      </div>
    </PageFold>
  );
}

/* ─── Main site ──────────────────────────────────────────────────────────────── */
function MainSite() {
  const { scrollYProgress } = useScroll();

  /* Owl scroll mascot */
  const spring = useSpring(scrollYProgress, { stiffness: 50, damping: 18 });
  const owlX = useTransform(spring,
    [0, 0.12, 0.28, 0.45, 0.62, 0.80, 1],
    ["-90px", "58vw", "8vw", "72vw", "18vw", "82vw", "calc(100vw + 100px)"],
  );
  const owlY = useTransform(spring,
    [0, 0.12, 0.28, 0.45, 0.62, 0.80, 1],
    ["88vh", "52vh", "72vh", "30vh", "68vh", "22vh", "12vh"],
  );
  const owlRotate = useTransform(spring, [0, 0.12, 0.28, 0.45, 0.62, 0.80, 1], [-18, 12, -22, 8, -18, 14, 20]);
  const owlScaleX = useTransform(spring, [0, 0.12, 0.13, 0.28, 0.29, 0.45, 0.46, 0.62, 0.63, 1], [1, 1, -1, -1, 1, 1, -1, -1, 1, 1]);
  const owlOpacity = useTransform(spring, [0, 0.04, 0.93, 1], [0, 1, 1, 0]);

  /* Hero owl 3D tilt */
  const heroOwlRawX = useMotionValue(0);
  const heroOwlRawY = useMotionValue(0);
  const heroOwlRX = useSpring(useTransform(heroOwlRawY, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 22 });
  const heroOwlRY = useSpring(useTransform(heroOwlRawX, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 22 });
  const heroOwlRef = useRef<HTMLDivElement>(null);

  const onHeroOwlMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroOwlRef.current) return;
    const r = heroOwlRef.current.getBoundingClientRect();
    heroOwlRawX.set((e.clientX - r.left) / r.width - 0.5);
    heroOwlRawY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onHeroOwlLeave = () => { heroOwlRawX.set(0); heroOwlRawY.set(0); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55, ease: EASE }}
      style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: BODY, overflowX: "hidden" }}
    >
      {/* Fixed background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 130% 50% at 60% -5%, rgba(79,142,247,0.10) 0%, rgba(167,139,250,0.04) 45%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(79,142,247,0.45),rgba(167,139,250,0.35),transparent)" }} />
      </div>

      {/* Scroll mascot */}
      <motion.div style={{ position: "fixed", left: 0, top: 0, x: owlX, y: owlY, rotate: owlRotate, opacity: owlOpacity, zIndex: 20, pointerEvents: "none" }}>
        <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} style={{ scaleX: owlScaleX }}>
          <Image src="/mascot/wave.png" alt="Proffy owl" width={64} height={64} style={{ objectFit: "contain", filter: "drop-shadow(0 6px 20px rgba(79,142,247,0.5))" }} />
        </motion.div>
      </motion.div>

      <StickyBar />

      {/* ── Nav ── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          backdropFilter: "blur(20px)", background: "rgba(7,8,15,0.88)",
          borderBottom: `1px solid ${S.border}`,
        }}
      >
        <div style={{ maxWidth: "76rem", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Image src="/logo-header-dark.png" alt="Proffy" width={110} height={36} style={{ objectFit: "contain", objectPosition: "left" }} />
          </Link>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href="/login" style={{ fontSize: "0.875rem", fontWeight: 600, padding: "0.5rem 1rem", borderRadius: "0.65rem", color: S.textSub, textDecoration: "none", border: `1px solid ${S.border}`, cursor: "pointer", fontFamily: BODY }}>
              Sign in
            </Link>
            <Link href="/register" style={{ fontSize: "0.875rem", fontWeight: 700, padding: "0.5rem 1.25rem", borderRadius: "0.65rem", color: "#fff", textDecoration: "none", background: S.grad, boxShadow: `0 2px 12px rgba(79,142,247,0.28)`, cursor: "pointer", fontFamily: BODY }}>
              Get started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─────────────────────────────────────────────── HERO ── */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: "82rem", margin: "0 auto", padding: "9rem 1.5rem 6rem", display: "flex", alignItems: "center", gap: "3rem", minHeight: "100vh" }}>
        <PerspectiveGrid />

        {/* Left */}
        <div style={{ flex: "1 1 0", minWidth: 0, position: "relative", zIndex: 2 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0.4rem 1rem", borderRadius: 999, background: "rgba(200,241,53,0.08)", border: `1px solid rgba(200,241,53,0.2)`, fontSize: "0.75rem", fontWeight: 700, color: S.lime, marginBottom: "2rem", fontFamily: BODY }}
          >
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.lime, boxShadow: `0 0 8px ${S.lime}` }} />
            </motion.div>
            Now live for Israeli students
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
            style={{ fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.1, fontSize: "clamp(2.8rem,5vw,4.8rem)", margin: 0, fontFamily: DISP }}
          >
            <motion.span variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} style={{ display: "block", color: S.text }}>
              One platform.
            </motion.span>
            <motion.span
              variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.12 } } }}
              style={{ display: "block", background: S.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >
              Every student.
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.55 }}
            style={{ marginTop: "1.75rem", fontSize: "1.1rem", maxWidth: "36rem", lineHeight: 1.8, color: S.textSub, fontFamily: BODY }}
          >
            From bagrut to university, AI that understands your course, your professor, and your exam.
          </motion.p>

          {/* Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95, duration: 0.5 }}
            style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
          >
            {PILLS.map((p) => (
              <div key={p} style={{ padding: "0.3rem 0.85rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600, background: "rgba(79,142,247,0.07)", border: `1px solid rgba(79,142,247,0.18)`, color: S.p, fontFamily: BODY }}>
                {p}
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.5 }}
            style={{ marginTop: "2.25rem", display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap" }}
          >
            <Link href="/register" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1rem", fontWeight: 700, padding: "0.9rem 2.25rem", borderRadius: "1rem", background: S.limeGrad, color: "#0a0f00", textDecoration: "none", boxShadow: `0 4px 24px ${S.limeGlow}`, cursor: "pointer", fontFamily: BODY }}>
              Start with Proffy Uni →
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            style={{ marginTop: "2.25rem", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: S.textMuted, fontFamily: BODY }}>
              Trusted by students at
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {UNIS.map((u) => (
                <div key={u} style={{ padding: "4px 12px", borderRadius: 7, background: "rgba(79,142,247,0.06)", border: `1px solid rgba(79,142,247,0.13)`, fontSize: "11px", fontWeight: 700, color: S.textSub, fontFamily: BODY }}>
                  {u}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right — hero owl with 3D tilt */}
        <motion.div
          ref={heroOwlRef}
          initial={{ opacity: 0, x: 50, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.9, ease: EASE }}
          onMouseMove={onHeroOwlMove}
          onMouseLeave={onHeroOwlLeave}
          style={{
            flexShrink: 0, width: "clamp(240px,28vw,380px)",
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            rotateX: heroOwlRX, rotateY: heroOwlRY, transformPerspective: 900,
          }}
        >
          <div style={{ position: "absolute", inset: "5%", borderRadius: "50%", background: "radial-gradient(circle,rgba(79,142,247,0.18) 0%,rgba(167,139,250,0.07) 50%,transparent 70%)", filter: "blur(50px)" }} />
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "relative", zIndex: 1 }}
          >
            <Image
              src="/mascot/hero.png"
              alt="Proffy owl at desk"
              width={380}
              height={380}
              style={{ width: "100%", height: "auto", filter: "drop-shadow(0 24px 60px rgba(79,142,247,0.28))" }}
              priority
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────────────────────────────────────────── MISSION ── */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${S.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
          <SectionHead
            label="Our Mission"
            title={<>Academic intelligence<br />for every student.</>}
            sub="Proffy gives every student the same advantage a private tutor provides — except it knows your exact professor, your slides, and your exam date."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
            {MISSION_ITEMS.map((item, i) => (
              <PageFold key={item.title} delay={i * 0.1}>
                <Card3D>
                  <div
                    style={{
                      borderRadius: "1.25rem", padding: "2rem",
                      background: S.surface, border: `1px solid ${S.border}`,
                      height: "100%", display: "flex", flexDirection: "column", gap: "1rem",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = S.borderHi)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = S.border)}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(79,142,247,0.09)", border: `1px solid rgba(79,142,247,0.22)`, display: "flex", alignItems: "center", justifyContent: "center", color: S.p, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: S.text, marginBottom: 0, fontFamily: DISP, letterSpacing: "-0.01em" }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: S.textMuted, fontFamily: BODY }}>{item.desc}</p>
                  </div>
                </Card3D>
              </PageFold>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────── WHO WE ARE ── */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${S.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <PageFold>
            <Card3D maxTilt={6}>
              <div
                style={{
                  borderRadius: "1.5rem", padding: "2.75rem",
                  background: S.surface, border: `1px solid ${S.border}`,
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Quote mark */}
                <div style={{ position: "absolute", top: -10, left: 20, fontFamily: DISP, fontSize: 120, color: "rgba(79,142,247,0.06)", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>
                  "
                </div>
                <div style={{ display: "flex", gap: 2, marginBottom: "1.5rem" }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ))}
                </div>
                <p style={{ fontSize: "1.1rem", lineHeight: 1.8, color: S.text, fontStyle: "italic", fontFamily: DISP, position: "relative", zIndex: 1 }}>
                  &ldquo;We built the tool we wished we had when we were students.&rdquo;
                </p>
                <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <Image src="/logo-owl.png" alt="Proffy" width={36} height={36} style={{ objectFit: "contain" }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: S.text, fontFamily: BODY }}>Proffy Team</div>
                    <div style={{ fontSize: "0.78rem", color: S.textMuted, fontFamily: BODY }}>Israel</div>
                  </div>
                </div>
              </div>
            </Card3D>
          </PageFold>

          <PageFold delay={0.15}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Label>Who We Are</Label>
              <h2 style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, margin: 0, fontFamily: DISP, color: S.text }}>
                Built by students,<br />
                <span style={{ background: S.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  for students.
                </span>
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.85, color: S.textSub, maxWidth: "30rem", fontFamily: BODY }}>
                We were TAU and Technion students who spent more time searching for information than actually learning. Proffy is what we wish had existed then.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <Image src="/mascot/thinking.png" alt="Proffy thinking" width={72} height={72} style={{ objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(79,142,247,0.25))" }} />
                <div style={{ fontSize: "0.85rem", color: S.textMuted, lineHeight: 1.7, fontFamily: BODY }}>
                  Deep domain knowledge meets<br />modern AI. Built for Israel&apos;s academic system.
                </div>
              </div>
            </div>
          </PageFold>
        </div>
      </section>

      {/* ─────────────────────────────────────────────── HOW IT WORKS ── */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${S.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "3rem", marginBottom: "3.5rem" }}>
            <PageFold>
              <div>
                <Label>How It Works</Label>
                <h2 style={{ fontSize: "clamp(2rem,3.8vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: 0, fontFamily: DISP, color: S.text }}>
                  Three steps to<br />
                  <span style={{ background: S.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    exam confidence.
                  </span>
                </h2>
              </div>
            </PageFold>
            <PageFold delay={0.1}>
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src="/mascot/thinking.png" alt="Proffy notes" width={100} height={100} style={{ objectFit: "contain", filter: "drop-shadow(0 6px 18px rgba(167,139,250,0.3))" }} />
              </motion.div>
            </PageFold>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem" }}>
            {STEPS.map((s, i) => (
              <PageFold key={s.num} delay={i * 0.12}>
                <Card3D>
                  <div
                    style={{
                      borderRadius: "1.25rem", padding: "2.25rem 2rem",
                      background: S.surface, border: `1px solid ${S.border}`,
                      position: "relative", overflow: "hidden",
                      height: "100%", display: "flex", flexDirection: "column", gap: "1.25rem",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = S.borderHi)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = S.border)}
                  >
                    {/* Watermark number */}
                    <div style={{ position: "absolute", bottom: -10, right: 18, fontSize: "7rem", fontWeight: 900, lineHeight: 1, fontFamily: DISP, userSelect: "none", pointerEvents: "none", background: S.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", opacity: 0.08 }}>
                      {i + 1}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: "rgba(79,142,247,0.09)", border: `1px solid rgba(79,142,247,0.25)`, fontSize: "0.75rem", fontWeight: 800, color: S.p, flexShrink: 0, fontFamily: BODY }}>
                      {i + 1}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.75rem", color: S.text, fontFamily: DISP }}>{s.title}</h3>
                      <p style={{ fontSize: "0.88rem", lineHeight: 1.78, color: S.textMuted, fontFamily: BODY }}>{s.desc}</p>
                    </div>
                  </div>
                </Card3D>
              </PageFold>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────── NETWORK ── */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${S.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "2rem", marginBottom: "3.5rem" }}>
            <PageFold>
              <div>
                <Label>The Network</Label>
                <h2 style={{ fontSize: "clamp(2rem,3.8vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: 0, fontFamily: DISP, color: S.text }}>
                  One AI,<br />
                  <span style={{ background: S.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    every stage of education.
                  </span>
                </h2>
              </div>
            </PageFold>
            <PageFold delay={0.1}>
              <motion.div
                animate={{ y: [0, -9, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src="/mascot/pointing.png" alt="Proffy pointing" width={110} height={110} style={{ objectFit: "contain", filter: "drop-shadow(0 6px 18px rgba(79,142,247,0.3))" }} />
              </motion.div>
            </PageFold>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
            {NETWORK.map((product, i) => (
              <PageFold key={product.name} delay={i * 0.1}>
                <FlipCard product={product} />
              </PageFold>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────── MEET PROFFY ── */}
      <section style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${S.border}`, padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <PageFold>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Label>Meet Proffy</Label>
              <h2 style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, margin: 0, fontFamily: DISP, color: S.text }}>
                Your AI<br />
                <span style={{ background: S.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  study companion.
                </span>
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.85, color: S.textSub, fontFamily: BODY }}>
                Proffy is not a search engine. It reads your actual course material, learns your professor&apos;s style, and answers like a top student who aced this exact class last semester. No hallucinations. No generic advice. Just what you need to pass.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {MEET_BULLETS.map((b) => (
                  <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.9rem", fontFamily: BODY }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, background: S.limeGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginTop: 1 }}>✓</span>
                    <span style={{ color: S.textSub, lineHeight: 1.6 }}>{b}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: "1rem", fontWeight: 700, padding: "0.9rem 2.25rem",
                  borderRadius: "1rem", background: S.limeGrad, color: "#0a0f00",
                  textDecoration: "none", boxShadow: `0 4px 20px ${S.limeGlow}`,
                  cursor: "pointer", alignSelf: "flex-start", fontFamily: BODY,
                }}
              >
                Start with Proffy Uni →
              </Link>
            </div>
          </PageFold>

          <PageFold delay={0.15}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
              <div style={{ position: "absolute", inset: "10%", borderRadius: "50%", background: "radial-gradient(circle,rgba(200,241,53,0.12) 0%,rgba(200,241,53,0.03) 50%,transparent 70%)", filter: "blur(30px)" }} />
              <motion.div
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "relative", zIndex: 1 }}
              >
                <Image src="/mascot/thumbsup.png" alt="Proffy thumbs up" width={280} height={280} style={{ width: "100%", maxWidth: 280, height: "auto", objectFit: "contain", filter: "drop-shadow(0 20px 50px rgba(200,241,53,0.2))" }} />
              </motion.div>
            </div>
          </PageFold>
        </div>
      </section>

      {/* ─────────────────────────────────────────────── CTA ── */}
      <section style={{ position: "relative", zIndex: 10, padding: "5rem 1.5rem 7rem" }}>
        <PageFold>
          <div
            style={{
              maxWidth: "58rem", margin: "0 auto", textAlign: "center",
              padding: "4.5rem 2rem",
              borderRadius: "2rem",
              border: `1px solid rgba(200,241,53,0.22)`,
              background: `radial-gradient(ellipse at 50% 0%, rgba(200,241,53,0.07), transparent 65%)`,
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${S.lime},rgba(200,241,53,0.4),transparent)` }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease: BOOK_EASE }}
              style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}
            >
              <motion.div
                animate={{ y: [0, -16, 0], rotate: [-5, 5, -5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src="/mascot/celebrate.png" alt="Proffy celebrating" width={110} height={110} style={{ objectFit: "contain", filter: "drop-shadow(0 8px 24px rgba(200,241,53,0.35))" }} />
              </motion.div>
            </motion.div>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.12, marginBottom: "1.25rem", fontFamily: DISP, color: S.text }}>
              Ready to study smarter?
            </h2>
            <p style={{ fontSize: "1.05rem", color: S.textSub, lineHeight: 1.75, maxWidth: "30rem", margin: "0 auto 2.5rem", fontFamily: BODY }}>
              Join thousands of students worldwide.
            </p>
            <Link
              href="/register"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: "1.1rem", fontWeight: 700, padding: "1rem 2.75rem",
                borderRadius: "1rem", background: S.limeGrad, color: "#0a0f00",
                textDecoration: "none", boxShadow: `0 6px 30px ${S.limeGlow}`,
                cursor: "pointer", fontFamily: BODY,
              }}
            >
              Get Early Access →
            </Link>
          </div>
        </PageFold>
      </section>

      {/* ─────────────────────────────────────────────── FOOTER ── */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${S.border}`, padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Image src="/logo-header-dark.png" alt="Proffy" width={100} height={30} style={{ objectFit: "contain", objectPosition: "left", opacity: 0.75 }} />
            </Link>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {NETWORK.map((p) => (
                <Link key={p.name} href={p.href} style={{ fontSize: "0.78rem", textDecoration: "none", padding: "0.25rem 0.65rem", borderRadius: 6, border: `1px solid ${S.border}`, color: S.textMuted, cursor: "pointer", fontFamily: BODY }}>
                  {p.name}
                </Link>
              ))}
            </div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              {["Privacy", "Terms", "Contact"].map((l) => (
                <Link key={l} href="#" style={{ fontSize: "0.8rem", color: S.textMuted, textDecoration: "none", cursor: "pointer", fontFamily: BODY }}>
                  {l}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${S.border}`, paddingTop: "1.5rem" }}>
            <p style={{ fontSize: "0.78rem", color: S.textMuted, margin: 0, fontFamily: BODY }}>
              &copy; 2026 Proffy &middot; Built for every student
            </p>
            <motion.div animate={{ rotate: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <Image src="/mascot/sleeping.png" alt="Proffy sleeping" width={48} height={48} style={{ objectFit: "contain", opacity: 0.7 }} />
            </motion.div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function PreviewPage() {
  const [entered, setEntered] = useState<boolean | null>(null);

  useEffect(() => {
    // Mobile: skip intro; returning visitor: skip intro
    const isMobile = window.innerWidth < 768;
    const seen = sessionStorage.getItem("proffy-spellbook") === "1";
    if (isMobile || seen) {
      setEntered(true);
    } else {
      setEntered(false);
    }
  }, []);

  const handleEnter = useCallback(() => {
    sessionStorage.setItem("proffy-spellbook", "1");
    setEntered(true);
  }, []);

  // Avoid flash: render nothing until client decides
  if (entered === null) {
    return <div style={{ background: S.bg, minHeight: "100vh" }} />;
  }

  return (
    <AnimatePresence mode="wait">
      {!entered ? (
        <SpellBookIntro key="intro" onEnter={handleEnter} />
      ) : (
        <MainSite key="main" />
      )}
    </AnimatePresence>
  );
}
