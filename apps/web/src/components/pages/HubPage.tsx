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
    const isLight = document.documentElement.classList.contains("light");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 55;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.16,
      r: Math.random() * 1.4 + 0.5,
    }));

    const draw = () => {
      const w = window.innerWidth, h = window.innerHeight;
      canvas.width = w; canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      const dotColor = isLight ? "rgba(79,70,229," : "rgba(99,102,241,";

      if (!prefersReduced) {
        nodes.forEach((n) => {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        });
      }

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `${dotColor}${(isLight ? 0.12 : 0.16) * (1 - dist / 130)})`;
            ctx.lineWidth = 0.9;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `${dotColor}${isLight ? 0.35 : 0.5})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  );
}

// ─── Product cards ────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    key: "app",
    label: "Proffy App",
    sub: "אוניברסיטה",
    href: "https://app.proffy.study",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.14)",
    border: "rgba(99,102,241,0.22)",
    description: "העלה שקפים, שאל הכל, עבור את הבחינה. ה-AI שמכיר את הקורס, המרצה והמבחן שלך.",
    cta: "פתח →",
    live: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(99,102,241,0.12)" />
        <rect x="5" y="10" width="22" height="4" rx="2" fill="#6366f1" />
        <path d="M 9 19 A 7 5 0 0 0 23 19 Z" fill="#6366f1" fillOpacity="0.65" />
        <line x1="16" y1="14" x2="16" y2="19" stroke="#6366f1" strokeWidth="1.4" strokeOpacity="0.5" />
        <line x1="27" y1="12" x2="27" y2="21" stroke="#6366f1" strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />
        <circle cx="27" cy="22.5" r="1.4" fill="#6366f1" fillOpacity="0.5" />
      </svg>
    ),
  },
  {
    key: "psycho",
    label: "Proffy Psycho",
    sub: "פסיכומטרי",
    href: "https://psycho.proffy.study",
    color: "#d4a017",
    glow: "rgba(212,160,23,0.11)",
    border: "rgba(212,160,23,0.2)",
    description: "הכנה רצינית לפסיכומטרי. תרגילים מובנים בכל קטגוריה — לציון שמשנה.",
    cta: "בקרוב",
    live: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(212,160,23,0.1)" />
        <circle cx="16" cy="14" r="6" fill="none" stroke="#d4a017" strokeWidth="1.8" />
        <line x1="16" y1="20" x2="16" y2="26" stroke="#d4a017" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="13" y1="24" x2="19" y2="24" stroke="#d4a017" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="14" r="2" fill="#d4a017" />
      </svg>
    ),
  },
  {
    key: "yael",
    label: 'Proffy × יע"ל',
    sub: 'יע"ל',
    href: "https://yael.proffy.study",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.11)",
    border: "rgba(245,158,11,0.2)",
    description: 'נעזור לך להצליח. הכנה ליע"ל בעברית — חמה, אנושית ומדויקת.',
    cta: "בקרוב",
    live: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(245,158,11,0.1)" />
        <path d="M8 24 Q16 8 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="18" x2="20" y2="18" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "bagrut",
    label: "Proffy Bagrut",
    sub: "בגרות",
    href: "https://bagrut.proffy.study",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.11)",
    border: "rgba(139,92,246,0.2)",
    description: "נבנה לבני 16-18. נושאים כקלפים, רצפים, ו-AI שמדבר בשפה שלך.",
    cta: "בקרוב",
    live: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(139,92,246,0.1)" />
        <rect x="6" y="8" width="9" height="9" rx="2.5" fill="#8b5cf6" fillOpacity="0.7" />
        <rect x="17" y="8" width="9" height="9" rx="2.5" fill="#06b6d4" fillOpacity="0.7" />
        <rect x="6" y="20" width="9" height="5" rx="2" fill="#8b5cf6" fillOpacity="0.35" />
        <rect x="17" y="20" width="9" height="5" rx="2" fill="#06b6d4" fillOpacity="0.35" />
      </svg>
    ),
  },
];

// ─── Hub page ─────────────────────────────────────────────────────────────────
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
      fontFamily: "var(--font-noto-hebrew, var(--font-inter), system-ui, sans-serif)",
    }}>
      <ConstellationBg />

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 max(24px, 5vw)", height: "62px",
        background: "var(--nav-bg)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid var(--nav-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
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
          <span style={{ fontWeight: 800, fontSize: "17px", letterSpacing: "-0.02em" }}>Proffy</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {mounted && <ThemeToggle />}
          <a
            href="https://app.proffy.study"
            style={{
              padding: "8px 18px", borderRadius: "10px",
              fontSize: "14px", fontWeight: 600,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white", textDecoration: "none",
              boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
              transition: "opacity 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
          >
            קבל גישה
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center",
        padding: "160px max(24px, 5vw) 80px",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "99px", padding: "5px 16px", marginBottom: "28px",
          }}
        >
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1",
            boxShadow: "0 0 10px #6366f1", animation: "fc-pulse 2s ease-in-out infinite", flexShrink: 0,
          }} />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#6366f1", textTransform: "uppercase" }}>
            רשת Proffy
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08 }}
          className="hub-hero-text"
          style={{
            fontSize: "clamp(40px, 7vw, 82px)",
            fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08,
            marginBottom: "22px",
          }}
        >
          פלטפורמה אחת.<br />לכל סטודנט ישראלי.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16 }}
          style={{
            fontSize: "clamp(15px, 1.8vw, 19px)",
            color: "var(--text-secondary)", lineHeight: 1.7,
            maxWidth: "540px", marginBottom: "44px",
          }}
        >
          מאוניברסיטה ועד בגרות ופסיכומטרי — Proffy מניע את ההכנה שלך עם AI שמכיר את הקורס, הבחינה והמרצה שלך.
        </motion.p>

        <motion.a
          href="https://app.proffy.study"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "14px 36px", borderRadius: "14px",
            fontSize: "15px", fontWeight: 700,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6 60%, #a855f7 100%)",
            color: "white", textDecoration: "none",
            boxShadow: "0 8px 32px rgba(99,102,241,0.3)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(99,102,241,0.42)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.3)"; }}
        >
          התחל עם Proffy App
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "scaleX(-1)" }}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.a>
      </section>

      {/* ── Cards ── */}
      <section style={{
        position: "relative", zIndex: 1,
        padding: "0 max(24px, 5vw) 120px",
        maxWidth: "1080px", margin: "0 auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "18px",
        }}>
          {PRODUCTS.map((p, i) => (
            <motion.a
              key={p.key}
              href={p.live ? p.href : undefined}
              initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 + i * 0.07 }}
              className="hub-card"
              style={{
                display: "block", textDecoration: "none", color: "inherit",
                border: `1px solid ${p.border}`,
                borderRadius: "18px", padding: "24px",
                position: "relative", overflow: "hidden",
                cursor: p.live ? "pointer" : "default",
                transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                if (!p.live) return;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = p.color;
                e.currentTarget.style.boxShadow = `0 20px 48px ${p.glow}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.borderColor = p.border;
                e.currentTarget.style.boxShadow = "";
              }}
            >
              {/* Glow blob */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: "200px", height: "200px", borderRadius: "50%",
                background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)`,
                transform: "translate(-40%, -40%)", pointerEvents: "none",
              }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" }}>
                {p.icon}
                <span style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
                  padding: "3px 10px", borderRadius: "99px",
                  background: p.live ? `${p.color}18` : "rgba(128,128,128,0.07)",
                  color: p.live ? p.color : "var(--text-disabled)",
                  border: `1px solid ${p.live ? p.border : "var(--border)"}`,
                }}>
                  {p.live ? "זמין" : "בקרוב"}
                </span>
              </div>

              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: p.color, marginBottom: "6px" }}>
                {p.sub}
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "10px" }}>
                {p.label}
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "18px" }}>
                {p.description}
              </p>
              <div style={{ fontSize: "13px", fontWeight: 600, color: p.live ? p.color : "var(--text-disabled)" }}>
                {p.cta}
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid var(--border)",
        padding: "24px max(24px, 5vw)",
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
        gap: "12px", fontSize: "13px", color: "var(--text-disabled)",
      }}>
        <span>© {new Date().getFullYear()} Proffy · נבנה לסטודנטים ישראלים</span>
        <div style={{ display: "flex", gap: "20px" }}>
          <a href="mailto:hello@proffy.study" style={{ color: "inherit", textDecoration: "none" }}>צור קשר</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>פרטיות</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>תנאים</a>
        </div>
      </footer>
    </div>
  );
}
