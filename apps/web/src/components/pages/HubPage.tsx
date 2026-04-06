"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ui/ThemeToggle";

// ─── Constellation canvas ─────────────────────────────────────────────────────
function ConstellationBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 60;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.6,
    }));

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!prefersReduced) {
        nodes.forEach((n) => {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
          if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        });
      }

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99,102,241,${0.18 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,102,241,0.45)";
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0, opacity: 0.6,
      }}
    />
  );
}

// ─── Product cards data ───────────────────────────────────────────────────────
const PRODUCTS = [
  {
    key: "app",
    label: "Proffy App",
    sub: "University",
    href: "https://app.proffy.study",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.15)",
    border: "rgba(99,102,241,0.25)",
    description: "Upload your slides, ask anything, ace the exam. Your AI study partner that knows your exact course.",
    cta: "Open App",
    live: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(99,102,241,0.15)" />
        <rect x="5" y="10" width="22" height="4.5" rx="2" fill="#6366f1" />
        <path d="M 9 19 A 7 5 0 0 0 23 19 Z" fill="#6366f1" fillOpacity="0.7" />
        <line x1="16" y1="14.5" x2="16" y2="19" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="27" y1="12.25" x2="27" y2="21" stroke="#6366f1" strokeWidth="1.3" strokeOpacity="0.5" strokeLinecap="round" />
        <circle cx="27" cy="22.5" r="1.5" fill="#6366f1" fillOpacity="0.5" />
      </svg>
    ),
  },
  {
    key: "psycho",
    label: "Proffy Psycho",
    sub: "Psychometric Prep",
    href: "https://psycho.proffy.study",
    color: "#d4a017",
    glow: "rgba(212,160,23,0.12)",
    border: "rgba(212,160,23,0.22)",
    description: "Serious prep for the psychometric exam. Structured drills, verbal, quantitative, English — built to score.",
    cta: "Coming Soon",
    live: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(212,160,23,0.12)" />
        <circle cx="16" cy="14" r="6" fill="none" stroke="#d4a017" strokeWidth="1.8" />
        <line x1="16" y1="20" x2="16" y2="26" stroke="#d4a017" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="12" y1="24" x2="20" y2="24" stroke="#d4a017" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="14" r="2" fill="#d4a017" />
      </svg>
    ),
  },
  {
    key: "yael",
    label: "Proffy \u00d7 Yael",
    sub: '\u05d9\u05e2"\u05dc Prep',
    href: "https://yael.proffy.study",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.22)",
    description: "\u05e0\u05e2\u05d6\u05d5\u05e8 \u05dc\u05da \u05dc\u05d4\u05e6\u05dc\u05d9\u05d7. Warm, human, Hebrew-first prep for the \u05d9\u05e2\"\u05dc exam.",
    cta: "Coming Soon",
    live: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(245,158,11,0.12)" />
        <path d="M16 7 C10 7 6 11 6 16 C6 21 10 25 16 25 C22 25 26 21 26 16" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M21 7 L26 12" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M26 7 L21 12" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "bagrut",
    label: "Proffy Bagrut",
    sub: "Bagrut Prep",
    href: "https://bagrut.proffy.study",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.22)",
    description: "Built for 16-18 year olds. Subjects as cards, streaks, and an AI that actually speaks your language.",
    cta: "Coming Soon",
    live: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(139,92,246,0.12)" />
        <rect x="6" y="9" width="8" height="8" rx="2" fill="#8b5cf6" fillOpacity="0.7" />
        <rect x="18" y="9" width="8" height="8" rx="2" fill="#06b6d4" fillOpacity="0.7" />
        <rect x="6" y="21" width="8" height="4" rx="2" fill="#8b5cf6" fillOpacity="0.4" />
        <rect x="18" y="21" width="8" height="4" rx="2" fill="#06b6d4" fillOpacity="0.4" />
      </svg>
    ),
  },
];

// ─── Hub Page ─────────────────────────────────────────────────────────────────
export default function HubPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      position: "relative",
      overflowX: "hidden",
      fontFamily: "var(--font-inter, Inter, sans-serif)",
    }}>
      <ConstellationBg />

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 max(24px, 5vw)",
        height: "64px",
        background: "rgba(11,11,30,0.7)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="hub-logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" /><stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#hub-logo-g)" />
            <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
            <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8" />
            <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
            <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
            <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6" />
          </svg>
          <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.03em" }}>Proffy</span>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {mounted && <ThemeToggle />}
          <a
            href="https://app.proffy.study"
            style={{
              padding: "8px 20px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white",
              textDecoration: "none",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Get Access
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", textAlign: "center",
        padding: "160px max(24px, 5vw) 80px",
      }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "99px", padding: "6px 18px",
            marginBottom: "32px",
          }}
        >
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "#6366f1",
            boxShadow: "0 0 10px #6366f1",
            animation: "fc-pulse 2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#6366f1", textTransform: "uppercase" }}>
            The Proffy Network
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontSize: "clamp(42px, 7vw, 80px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            marginBottom: "24px",
            background: "linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #c084fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            paddingBottom: "0.12em",
          }}
        >
          One platform.<br />Every Israeli student.
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            maxWidth: "560px",
            marginBottom: "48px",
          }}
        >
          From university to bagrut to psycho — Proffy powers your prep with AI that knows your exact course, exam, and professor.
        </motion.p>

        {/* CTA */}
        <motion.a
          href="https://app.proffy.study"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "14px 36px", borderRadius: "14px",
            fontSize: "16px", fontWeight: 700,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6 60%, #a855f7 100%)",
            color: "white", textDecoration: "none",
            boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(99,102,241,0.45)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.35)";
          }}
        >
          Start with Proffy App
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.a>
      </section>

      {/* ── Product cards ── */}
      <section style={{
        position: "relative", zIndex: 1,
        padding: "0 max(24px, 5vw) 120px",
        maxWidth: "1100px", margin: "0 auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}>
          {PRODUCTS.map((p, i) => (
            <motion.a
              key={p.key}
              href={p.live ? p.href : undefined}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 + i * 0.08 }}
              style={{
                display: "block",
                background: "var(--bg-surface)",
                border: `1px solid ${p.border}`,
                borderRadius: "20px",
                padding: "28px",
                textDecoration: "none",
                color: "inherit",
                position: "relative",
                overflow: "hidden",
                cursor: p.live ? "pointer" : "default",
                transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                if (!p.live) return;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = p.color;
                e.currentTarget.style.boxShadow = `0 16px 48px ${p.glow}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.borderColor = p.border;
                e.currentTarget.style.boxShadow = "";
              }}
            >
              {/* Glow blob */}
              <div style={{
                position: "absolute", top: 0, right: 0,
                width: "180px", height: "180px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)`,
                transform: "translate(40%, -40%)",
                pointerEvents: "none",
              }} />

              {/* Icon + badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
                {p.icon}
                <span style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "3px 10px", borderRadius: "99px",
                  background: p.live ? `${p.color}20` : "rgba(255,255,255,0.05)",
                  color: p.live ? p.color : "var(--text-disabled)",
                  border: `1px solid ${p.live ? p.border : "var(--border)"}`,
                }}>
                  {p.live ? "Live" : "Soon"}
                </span>
              </div>

              {/* Text */}
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: p.color, marginBottom: "6px" }}>
                {p.sub}
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "10px", color: "var(--text-primary)" }}>
                {p.label}
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
                {p.description}
              </p>

              {/* CTA link */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: p.live ? p.color : "var(--text-disabled)" }}>
                {p.cta}
                {p.live && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid var(--border)",
        padding: "28px max(24px, 5vw)",
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
        gap: "12px",
        color: "var(--text-disabled)", fontSize: "13px",
      }}>
        <span>© {new Date().getFullYear()} Proffy · Built for Israeli students</span>
        <div style={{ display: "flex", gap: "20px" }}>
          <a href="mailto:hello@proffy.study" style={{ color: "var(--text-disabled)", textDecoration: "none" }}>Contact</a>
          <a href="#" style={{ color: "var(--text-disabled)", textDecoration: "none" }}>Privacy</a>
          <a href="#" style={{ color: "var(--text-disabled)", textDecoration: "none" }}>Terms</a>
        </div>
      </footer>
    </div>
  );
}
