"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LangToggle, { useLang } from "@/components/ui/LangToggle";

// ─── Constellation canvas — fixed perf: resize only on actual resize ──────────
function ConstellationBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener("resize", resize, { passive: true });

    const N = 45;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.14,
      r: Math.random() * 1.2 + 0.5,
    }));

    const draw = () => {
      const isLight = document.documentElement.classList.contains("light");
      const lineAlpha = isLight ? 0.1 : 0.15;
      const dotAlpha  = isLight ? 0.3  : 0.45;
      const color     = isLight ? "79,70,229" : "99,102,241";

      ctx.clearRect(0, 0, W, H);

      if (!prefersReduced) {
        for (const n of nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
      }

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130) {
            const a = lineAlpha * (1 - Math.sqrt(d2) / 130);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${color},${a.toFixed(3)})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${dotAlpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 0,
    }} />
  );
}

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    badge: "The Proffy Network",
    h1a: "One platform.",
    h1b: "Every Israeli student.",
    sub: "From bagrut to university — Proffy powers your prep with AI that knows your exact course, exam, and professor.",
    cta: "Start with Proffy App",
    getAccess: "Get Access",
    footer: `© ${new Date().getFullYear()} Proffy · Built for Israeli students`,
    contact: "Contact", privacy: "Privacy", terms: "Terms",
  },
  he: {
    badge: "רשת Proffy",
    h1a: "פלטפורמה אחת.",
    h1b: "לכל סטודנט ישראלי.",
    sub: "מבגרות ועד האוניברסיטה — Proffy מניע את ההכנה שלך עם AI שמכיר את הקורס, הבחינה והמרצה שלך.",
    cta: "התחל עם Proffy App",
    getAccess: "קבל גישה",
    footer: `© ${new Date().getFullYear()} Proffy · נבנה לסטודנטים ישראלים`,
    contact: "צור קשר", privacy: "פרטיות", terms: "תנאים",
  },
};

// ─── Product cards — ordered Bagrut → Yael → Psycho → App ────────────────────
const PRODUCTS = (lang: "en" | "he") => [
  {
    key: "bagrut",
    label: "Proffy Bagrut",
    sub: lang === "he" ? "בגרות" : "Bagrut",
    href: "https://bagrut.proffy.study",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.13)",
    border: "rgba(139,92,246,0.22)",
    description: lang === "he"
      ? "נבנה לבני 16-18. נושאים כקלפים, רצפים, ו-AI שמדבר בשפה שלך."
      : "Built for ages 16-18. Subjects as cards, streaks, and an AI that speaks your language.",
    cta: lang === "he" ? "בקרוב" : "Coming soon", live: false,
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(139,92,246,0.12)" />
        <rect x="6" y="8" width="9" height="9" rx="2.5" fill="#8b5cf6" fillOpacity="0.7" />
        <rect x="17" y="8" width="9" height="9" rx="2.5" fill="#06b6d4" fillOpacity="0.7" />
        <rect x="6" y="20" width="9" height="5" rx="2" fill="#8b5cf6" fillOpacity="0.35" />
        <rect x="17" y="20" width="9" height="5" rx="2" fill="#06b6d4" fillOpacity="0.35" />
      </svg>
    ),
  },
  {
    key: "yael",
    label: lang === "he" ? 'Proffy × יע"ל' : "Proffy × Yael",
    sub: lang === "he" ? 'יע"ל' : "Yael",
    href: "https://yael.proffy.study",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.22)",
    description: lang === "he"
      ? 'נעזור לך להצליח. הכנה ליע"ל בעברית — חמה, אנושית ומדויקת.'
      : 'We will help you succeed. Hebrew-first prep for the Yael exam — warm and human.',
    cta: lang === "he" ? "בקרוב" : "Coming soon", live: false,
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(245,158,11,0.1)" />
        <path d="M8 24 Q16 8 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="18" x2="20" y2="18" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "psycho",
    label: "Proffy Psycho",
    sub: lang === "he" ? "פסיכומטרי" : "Psychometric",
    href: "https://psycho.proffy.study",
    color: "#d4a017",
    glow: "rgba(212,160,23,0.12)",
    border: "rgba(212,160,23,0.22)",
    description: lang === "he"
      ? "הכנה רצינית לפסיכומטרי. תרגילים מובנים בכל קטגוריה — לציון שמשנה."
      : "Serious psychometric prep. Structured drills across every category — built to score.",
    cta: lang === "he" ? "בקרוב" : "Coming soon", live: false,
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(212,160,23,0.1)" />
        <circle cx="16" cy="14" r="6" fill="none" stroke="#d4a017" strokeWidth="1.8" />
        <line x1="16" y1="20" x2="16" y2="26" stroke="#d4a017" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="13" y1="24" x2="19" y2="24" stroke="#d4a017" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="14" r="2" fill="#d4a017" />
      </svg>
    ),
  },
  {
    key: "app",
    label: "Proffy App",
    sub: lang === "he" ? "אוניברסיטה" : "University",
    href: "https://app.proffy.study",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.14)",
    border: "rgba(99,102,241,0.24)",
    description: lang === "he"
      ? "העלה שקפים, שאל הכל, עבור את הבחינה. ה-AI שמכיר את הקורס, המרצה והמבחן שלך."
      : "Upload your slides, ask anything, ace the exam. AI that knows your exact course.",
    cta: lang === "he" ? "פתח ←" : "Open →", live: true,
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="rgba(99,102,241,0.12)" />
        <rect x="5" y="10" width="22" height="4" rx="2" fill="#6366f1" />
        <path d="M 9 19 A 7 5 0 0 0 23 19 Z" fill="#6366f1" fillOpacity="0.65" />
        <line x1="16" y1="14" x2="16" y2="19" stroke="#6366f1" strokeWidth="1.4" strokeOpacity="0.5" />
      </svg>
    ),
  },
];

// ─── Hub page ─────────────────────────────────────────────────────────────────
export default function HubPage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useLang();
  useEffect(() => setMounted(true), []);

  const t = T[lang];
  const isRtl = lang === "he";
  const products = PRODUCTS(lang);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      position: "relative", overflowX: "hidden",
      fontFamily: isRtl
        ? "var(--font-noto-hebrew), system-ui, sans-serif"
        : "var(--font-inter), system-ui, sans-serif",
      direction: isRtl ? "rtl" : "ltr",
    }}>
      <ConstellationBg />

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 max(24px, 5vw)", height: "62px",
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--nav-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="hub-lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" /><stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#hub-lg)" />
            <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
            <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8" />
            <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
            <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
            <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6" />
          </svg>
          <span style={{ fontWeight: 800, fontSize: "17px", letterSpacing: "-0.02em" }}>Proffy</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {mounted && <ThemeToggle />}
          {mounted && <LangToggle />}
          <a
            href="https://app.proffy.study"
            style={{
              padding: "8px 18px", borderRadius: "10px",
              fontSize: "13px", fontWeight: 600,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white", textDecoration: "none",
              boxShadow: "0 2px 12px rgba(99,102,241,0.28)",
              transition: "opacity 0.12s, transform 0.12s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
          >
            {t.getAccess}
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "158px max(24px, 5vw) 72px",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "99px", padding: "5px 16px", marginBottom: "26px",
          }}
        >
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1",
            boxShadow: "0 0 10px #6366f1", animation: "fc-pulse 2s ease-in-out infinite", flexShrink: 0,
          }} />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#6366f1", textTransform: "uppercase" }}>
            {t.badge}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.07 }}
          className="hub-hero-text"
          style={{ fontSize: "clamp(38px, 6.5vw, 78px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08, marginBottom: "20px" }}
        >
          {t.h1a}<br />{t.h1b}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.14 }}
          style={{ fontSize: "clamp(15px, 1.8vw, 18px)", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "520px", marginBottom: "40px" }}
        >
          {t.sub}
        </motion.p>

        <motion.a
          href="https://app.proffy.study"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "13px 34px", borderRadius: "13px",
            fontSize: "15px", fontWeight: 700,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6 60%, #a855f7 100%)",
            color: "white", textDecoration: "none",
            boxShadow: "0 6px 28px rgba(99,102,241,0.32)",
            transition: "transform 0.12s, box-shadow 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(99,102,241,0.42)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 28px rgba(99,102,241,0.32)"; }}
        >
          {t.cta}
        </motion.a>
      </section>

      {/* ── Cards ── */}
      <section style={{
        position: "relative", zIndex: 1,
        padding: "0 max(24px, 5vw) 110px",
        maxWidth: "1080px", margin: "0 auto",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {products.map((p, i) => (
            <motion.a
              key={p.key}
              href={p.live ? p.href : undefined}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 + i * 0.06 }}
              className="hub-card"
              style={{
                display: "block", textDecoration: "none", color: "inherit",
                border: `1px solid ${p.border}`, borderRadius: "18px", padding: "22px",
                position: "relative", overflow: "hidden",
                cursor: p.live ? "pointer" : "default",
                transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => {
                if (!p.live) return;
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = p.color;
                e.currentTarget.style.boxShadow = `0 16px 40px ${p.glow}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.borderColor = p.border;
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: "180px", height: "180px", borderRadius: "50%",
                background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)`,
                transform: "translate(-40%, -40%)", pointerEvents: "none",
              }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                {p.icon}
                <span style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em",
                  padding: "3px 9px", borderRadius: "99px",
                  background: p.live ? `${p.color}18` : "rgba(128,128,128,0.07)",
                  color: p.live ? p.color : "var(--text-disabled)",
                  border: `1px solid ${p.live ? p.border : "var(--border)"}`,
                }}>
                  {p.live ? (lang === "he" ? "זמין" : "Live") : (lang === "he" ? "בקרוב" : "Soon")}
                </span>
              </div>

              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: p.color, marginBottom: "5px" }}>
                {p.sub}
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "9px" }}>{p.label}</h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "16px" }}>{p.description}</p>
              <div style={{ fontSize: "13px", fontWeight: 600, color: p.live ? p.color : "var(--text-disabled)" }}>{p.cta}</div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid var(--border)",
        padding: "22px max(24px, 5vw)",
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
        gap: "12px", fontSize: "13px", color: "var(--text-disabled)",
      }}>
        <span>{t.footer}</span>
        <div style={{ display: "flex", gap: "18px" }}>
          <a href="mailto:hello@proffy.study" style={{ color: "inherit", textDecoration: "none" }}>{t.contact}</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>{t.privacy}</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>{t.terms}</a>
        </div>
      </footer>
    </div>
  );
}
