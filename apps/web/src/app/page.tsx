import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import HubPage from "@/components/pages/HubPage";

// ─── Inline SVG illustrations ──────────────────────────────────────────────

function UploadIllustration() {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Background glow */}
      <ellipse cx="60" cy="80" rx="50" ry="16" fill="rgba(79,142,247,0.08)" />
      {/* Document stack */}
      <rect x="28" y="22" width="44" height="56" rx="5" fill="rgba(21,21,32,1)" stroke="rgba(79,142,247,0.3)" strokeWidth="1" />
      <rect x="23" y="26" width="44" height="56" rx="5" fill="rgba(15,15,22,1)" stroke="rgba(79,142,247,0.2)" strokeWidth="1" />
      {/* Main document */}
      <rect x="18" y="14" width="44" height="56" rx="5" fill="#151520" stroke="rgba(79,142,247,0.5)" strokeWidth="1.5" />
      {/* PDF badge */}
      <rect x="24" y="20" width="18" height="9" rx="2.5" fill="#4f8ef7" />
      <text x="33" y="27.5" textAnchor="middle" fill="white" fontSize="5.5" fontWeight="700" fontFamily="system-ui">PDF</text>
      {/* Text lines */}
      <rect x="24" y="36" width="30" height="2.5" rx="1" fill="rgba(255,255,255,0.12)" />
      <rect x="24" y="42" width="26" height="2.5" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="24" y="48" width="22" height="2.5" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="24" y="54" width="28" height="2.5" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="24" y="60" width="18" height="2.5" rx="1" fill="rgba(255,255,255,0.05)" />
      {/* Upload arrow */}
      <circle cx="80" cy="38" r="14" fill="rgba(79,142,247,0.1)" stroke="rgba(79,142,247,0.3)" strokeWidth="1.5" />
      <path d="M80 44 L80 33" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" />
      <path d="M76 37 L80 33 L84 37" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkle */}
      <path d="M96 22 L97 25 L100 26 L97 27 L96 30 L95 27 L92 26 L95 25 Z" fill="#a78bfa" opacity="0.7" />
    </svg>
  );
}

function AskIllustration() {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="60" cy="85" rx="48" ry="12" fill="rgba(167,139,250,0.07)" />
      {/* Chat bubbles */}
      {/* User bubble right */}
      <rect x="52" y="14" width="54" height="22" rx="8" fill="#4f8ef7" />
      <path d="M97 36 L100 43 L90 36" fill="#4f8ef7" />
      <rect x="59" y="21" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.7)" />
      <rect x="59" y="27" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
      {/* AI bubble left */}
      <rect x="14" y="48" width="64" height="32" rx="8" fill="#151520" stroke="rgba(79,142,247,0.3)" strokeWidth="1.5" />
      <path d="M23 80 L17 88 L30 80" fill="#151520" stroke="rgba(79,142,247,0.3)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* AI logo in bubble */}
      <rect x="20" y="54" width="12" height="12" rx="3" fill="url(#ai-grad)" />
      <path d="M26 57 L27.1 60.9 L31 62 L27.1 63.1 L26 67 L24.9 63.1 L21 62 L24.9 60.9 Z" fill="white" />
      <defs>
        <linearGradient id="ai-grad" x1="20" y1="54" x2="32" y2="66" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f8ef7" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="37" y="55" width="32" height="2.5" rx="1" fill="rgba(255,255,255,0.15)" />
      <rect x="37" y="61" width="26" height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />
      {/* Source chip */}
      <rect x="37" y="67" width="34" height="8" rx="3" fill="rgba(79,142,247,0.12)" stroke="rgba(79,142,247,0.25)" strokeWidth="1" />
      <text x="54" y="73" textAnchor="middle" fill="#4f8ef7" fontSize="4.5" fontFamily="system-ui">📄 Slide 14 · 94% match</text>
    </svg>
  );
}

function StudyIllustration() {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="60" cy="85" rx="46" ry="12" fill="rgba(52,211,153,0.06)" />
      {/* Calendar / study plan grid */}
      <rect x="10" y="10" width="50" height="58" rx="6" fill="#151520" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      {/* Month header */}
      <rect x="10" y="10" width="50" height="14" rx="5" fill="rgba(79,142,247,0.15)" />
      <rect x="10" y="20" width="50" height="4" fill="rgba(79,142,247,0.15)" />
      <text x="35" y="20.5" textAnchor="middle" fill="#4f8ef7" fontSize="5.5" fontWeight="600" fontFamily="system-ui">March</text>
      {/* Day grid */}
      {[0, 1, 2, 3, 4, 5, 6].map((col) =>
        [0, 1, 2, 3].map((row) => (
          <rect
            key={`${col}-${row}`}
            x={14 + col * 7}
            y={28 + row * 9}
            width="5"
            height="5"
            rx="1.5"
            fill={
              (col === 2 && row === 1) || (col === 4 && row === 2)
                ? "rgba(79,142,247,0.6)"
                : col === 6 && row === 3
                ? "#f87171"
                : "rgba(255,255,255,0.05)"
            }
          />
        ))
      )}
      {/* Exam day red dot */}
      <circle cx="56" cy="62" r="4" fill="rgba(248,113,113,0.2)" stroke="#f87171" strokeWidth="1.5" />
      <text x="56" y="64.5" textAnchor="middle" fill="#f87171" fontSize="4" fontWeight="700" fontFamily="system-ui">!</text>

      {/* Flashcard on right */}
      <rect x="70" y="12" width="40" height="28" rx="5" fill="#151520" stroke="rgba(167,139,250,0.4)" strokeWidth="1.5" />
      <text x="90" y="24" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="5" fontFamily="system-ui">AVL Rotation?</text>
      <rect x="76" y="27" width="28" height="2.5" rx="1" fill="rgba(167,139,250,0.2)" />
      <rect x="78" y="31" width="24" height="2" rx="1" fill="rgba(167,139,250,0.15)" />

      {/* Progress bar */}
      <rect x="70" y="48" width="40" height="8" rx="3" fill="#151520" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <rect x="70" y="48" width="26" height="8" rx="3" fill="url(#prog-grad)" />
      <defs>
        <linearGradient id="prog-grad" x1="70" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f8ef7" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <text x="90" y="60" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="4.5" fontFamily="system-ui">65% complete</text>

      {/* Sparkle */}
      <path d="M18 80 L18.8 82.8 L21.5 83.5 L18.8 84.2 L18 87 L17.2 84.2 L14.5 83.5 L17.2 82.8 Z" fill="#34d399" opacity="0.6" />
    </svg>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default async function HomePage() {
  // proffy.study root domain → hub landing page
  const host = (await headers()).get("host") ?? "";
  // uni.proffy.study = chat app, everything else (including app.) = hub
  const isApp = host.startsWith("uni.") || host.includes("localhost") || host.startsWith("127.");
  if (!isApp) return <HubPage />;

  let session = null;
  try { session = await getServerSession(authOptions); } catch {}
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

      {/* ── Background: grid + ambient glow ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 0%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 0%, black 30%, transparent 100%)",
        }} />
        {/* Blue glow top-center */}
        <div style={{
          position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: "1200px", height: "800px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(79,142,247,0.22) 0%, transparent 65%)",
          filter: "blur(40px)",
        }} />
        {/* Purple glow right */}
        <div style={{
          position: "absolute", top: "30%", right: "-10%",
          width: "700px", height: "700px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(167,139,250,0.14) 0%, transparent 65%)",
          filter: "blur(60px)",
        }} />
        {/* Blue glow bottom-left */}
        <div style={{
          position: "absolute", bottom: "5%", left: "-5%",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(79,142,247,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        {/* Subtle top gradient line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(79,142,247,0.5), rgba(167,139,250,0.5), transparent)",
        }} />
      </div>

      {/* ── Nav ── */}
      <nav
        className="landing-nav"
        style={{
          position: "relative", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
          background: "rgba(5,5,10,0.75)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="nav-lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4f8ef7" /><stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#nav-lg)" />
            <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
            <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8" />
            <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
            <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
            <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6" />
          </svg>
          <span className="nav-logo-text" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>Proffy <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--accent)", background: "rgba(99,102,241,0.13)", border: "1px solid rgba(99,102,241,0.28)", borderRadius: "4px", padding: "1px 5px", lineHeight: 1.5 }}>BETA</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/login" className="btn-ghost nav-btn" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", borderRadius: "0.65rem", whiteSpace: "nowrap" }}>Sign in</Link>
          <Link href="/register" className="btn-primary nav-btn" style={{ fontSize: "0.875rem", padding: "0.5rem 1.1rem", borderRadius: "0.65rem", whiteSpace: "nowrap" }}>Get started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero" style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>

        {/* University badges */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "2.5rem" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-muted)" }}>
            Trusted by students at
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { name: "TAU", full: "Tel Aviv University", color: "#4f8ef7" },
              { name: "Technion", full: "Israel Institute of Technology", color: "#a78bfa" },
              { name: "HUJI", full: "Hebrew University", color: "#f87171" },
              { name: "BGU", full: "Ben-Gurion University", color: "#34d399" },
              { name: "Bar Ilan", full: "Bar-Ilan University", color: "#fbbf24" },
              { name: "Ariel", full: "Ariel University", color: "#fb923c" },
            ].map(u => (
              <div key={u.name} title={u.full} style={{
                padding: "5px 13px", borderRadius: "8px",
                background: u.color + "0f", border: `1px solid ${u.color}28`,
                fontSize: "12px", fontWeight: 700, color: u.color,
                letterSpacing: "0.01em", cursor: "default",
              }}>{u.name}</div>
            ))}
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: "56rem", fontSize: "clamp(3.2rem, 7vw, 5.5rem)", margin: "0" }}>
          The AI tutor that{" "}
          <span className="gradient-text-blue">knows your professor</span>
        </h1>

        <p style={{ marginTop: "1.75rem", fontSize: "1.2rem", maxWidth: "36rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
          Chat with an AI that understands your course, your professor, and your exam.
          Get direct answers that actually match what shows up — no guesswork.
        </p>

        {/* CTA row */}
        <div className="landing-hero-cta" style={{ marginTop: "2.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/register"
            className="btn-primary"
            style={{ fontSize: "1.05rem", padding: "0.9rem 2.5rem", borderRadius: "1rem", fontWeight: 700 }}
          >
            Start studying free →
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: "1rem", padding: "0.875rem 1.75rem", borderRadius: "1rem", fontWeight: 600,
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", textDecoration: "none", transition: "all 0.15s",
            }}
          >
            Sign in
          </Link>
        </div>

        {/* Quick feature chips */}
        <div style={{ marginTop: "1.75rem", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "Upload slides", icon: "↑" },
            { label: "Ask questions", icon: "?" },
            { label: "Flashcards", icon: "▤" },
            { label: "Exam countdown", icon: "◷" },
            { label: "Study groups", icon: "⊞" },
          ].map(c => (
            <div key={c.label} style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", borderRadius: "999px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              fontSize: "12px", fontWeight: 600, color: "var(--text-muted)",
            }}>
              <span style={{ fontSize: "11px", opacity: 0.6 }}>{c.icon}</span>
              {c.label}
            </div>
          ))}
        </div>

        {/* ── Product mockup ── */}
        <div className="landing-mockup" style={{ marginTop: "5rem", width: "100%", maxWidth: "960px", textAlign: "left" }}>
          <div style={{
            borderRadius: "16px", overflow: "hidden",
            background: "var(--bg-surface)", border: "1px solid var(--border-light)",
            boxShadow: "0 48px 96px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)",
          }}>
            {/* Chrome bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#28c840" }} />
              </div>
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <div style={{ padding: "4px 16px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)", maxWidth: "280px", width: "100%" }}>
                  <svg width="10" height="10" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 11l3 3m-7-3a4 4 0 100-8 4 4 0 000 8z" />
                  </svg>
                  proffy.co.il/course/data-structures
                </div>
              </div>
            </div>

            {/* 2-column app layout: sidebar + chat */}
            <div style={{ display: "flex", height: "400px" }}>

              {/* Left sidebar */}
              <div style={{ width: "210px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px", padding: "12px", borderRight: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                {/* Brand */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", marginBottom: "4px" }}>
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                    <defs><linearGradient id="sb-lg2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#4f8ef7" /><stop offset="1" stopColor="#a78bfa" /></linearGradient></defs>
                    <rect width="32" height="32" rx="9" fill="url(#sb-lg2)" />
                    <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
                    <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8" />
                    <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
                    <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
                    <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6" />
                  </svg>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "3px" }}>Proffy <span style={{ fontSize: "7px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--accent)", background: "rgba(99,102,241,0.13)", border: "1px solid rgba(99,102,241,0.28)", borderRadius: "3px", padding: "1px 3px" }}>BETA</span></span>
                </div>
                {/* Label */}
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", padding: "0 12px 4px" }}>Courses</div>
                {/* Course items */}
                {[
                  { name: "Data Structures", days: 12, active: true },
                  { name: "Algorithms", days: 28, active: false },
                  { name: "Operating Systems", days: 45, active: false },
                ].map(c => (
                  <div key={c.name} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: "10px", fontSize: "11px",
                    background: c.active ? "var(--blue-dim)" : "transparent",
                    border: c.active ? "1px solid rgba(79,142,247,0.2)" : "1px solid transparent",
                    color: c.active ? "var(--blue-hover)" : "var(--text-secondary)",
                  }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{c.name}</span>
                    <span style={{
                      fontSize: "9px", fontWeight: 700, padding: "2px 5px", borderRadius: "5px", marginLeft: "6px", flexShrink: 0,
                      color: c.days <= 14 ? "var(--amber)" : "var(--green)",
                      background: c.days <= 14 ? "rgba(251,191,36,0.1)" : "rgba(52,211,153,0.1)",
                    }}>{c.days}d</span>
                  </div>
                ))}
                {/* Upload CTA */}
                <div style={{ marginTop: "auto", padding: "0 8px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "10px", fontSize: "11px", border: "1px dashed rgba(79,142,247,0.3)", color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--blue)", fontWeight: 700 }}>+</span> Upload slides
                  </div>
                </div>
              </div>

              {/* Chat area */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {/* Chat header */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Data Structures</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Prof. Cohen · TAU</span>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflow: "hidden", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* User message */}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ maxWidth: "260px", padding: "10px 14px", borderRadius: "16px 16px 4px 16px", fontSize: "12px", lineHeight: 1.5, background: "var(--blue)", color: "#fff" }}>
                      What will Cohen ask about trees on the exam?
                    </div>
                    <div style={{ width: "26px", height: "26px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0, background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }}>Y</div>
                  </div>

                  {/* AI message */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "linear-gradient(135deg, #4f8ef7, #a78bfa)", boxShadow: "0 2px 10px rgba(79,142,247,0.4)" }}>
                      <svg width="11" height="11" viewBox="0 0 32 32" fill="none">
                        <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
                        <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8" />
                        <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
                        <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
                        <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, padding: "12px 14px", borderRadius: "4px 16px 16px 16px", fontSize: "12px", lineHeight: 1.6, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <p style={{ color: "var(--text-primary)", margin: 0 }}>
                        Based on Cohen&apos;s <strong>last 4 exams</strong>, he asks about{" "}
                        <strong style={{ color: "var(--blue-hover)" }}>AVL rotations</strong> and{" "}
                        <strong style={{ color: "var(--blue-hover)" }}>amortized analysis</strong> every year — 20 pts each.
                      </p>
                      <p style={{ marginTop: "6px", fontStyle: "italic", fontSize: "11px", color: "var(--text-muted)" }}>
                        &ldquo;Prove the time complexity of...&rdquo; — 2021, 2022, 2023.
                      </p>
                      <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 500, background: "var(--blue-dim)", color: "var(--blue-hover)", border: "1px solid rgba(79,142,247,0.2)" }}>
                        📄 Cohen_exam_2023.pdf · Slide 14
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 16px", borderRadius: "14px", background: "var(--bg-elevated)", border: "1px solid var(--border-light)" }}>
                    <span style={{ flex: 1, fontSize: "12px", color: "var(--text-muted)" }}>Ask about Data Structures…</span>
                    <div style={{ width: "30px", height: "30px", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--blue)", boxShadow: "0 2px 10px rgba(79,142,247,0.4)" }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                  <p style={{ textAlign: "center", fontSize: "9px", marginTop: "8px", color: "var(--text-muted)" }}>Enter to send · Sources cited inline</p>
                </div>
              </div>

              {/* ── Right panel ── */}
              <div style={{ width: "172px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", padding: "12px", borderLeft: "1px solid var(--border)", background: "var(--bg-surface)", overflowY: "auto" }}>

                {/* Exam countdown */}
                <div style={{ borderRadius: "12px", padding: "12px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Exam countdown</div>
                  <div style={{ fontSize: "36px", fontWeight: 800, lineHeight: 1, color: "var(--amber)" }}>12</div>
                  <div style={{ fontSize: "10px", marginTop: "3px", color: "var(--text-muted)" }}>days remaining</div>
                  <div style={{ marginTop: "10px", height: "3px", borderRadius: "4px", background: "var(--border)" }}>
                    <div style={{ height: "3px", borderRadius: "4px", width: "72%", background: "linear-gradient(90deg, #4f8ef7, #a78bfa)" }} />
                  </div>
                  <div style={{ fontSize: "9px", marginTop: "4px", textAlign: "right", color: "var(--text-muted)" }}>72% prepared</div>
                </div>

                {/* Cohen always asks */}
                <div style={{ borderRadius: "12px", padding: "12px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>Cohen always asks</div>
                  {[
                    { topic: "AVL Trees", pct: 90 },
                    { topic: "Heaps", pct: 75 },
                    { topic: "Amortized", pct: 60 },
                  ].map(t => (
                    <div key={t.topic} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{t.topic}</span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t.pct}%</span>
                      </div>
                      <div style={{ height: "3px", borderRadius: "3px", background: "var(--border)" }}>
                        <div style={{ height: "3px", borderRadius: "3px", width: `${t.pct}%`, background: "var(--blue)" }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Flashcards */}
                <div style={{ borderRadius: "12px", padding: "12px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>Flashcards due</div>
                  <div style={{ fontSize: "32px", fontWeight: 800, lineHeight: 1, color: "var(--purple)" }}>14</div>
                  <div style={{ fontSize: "10px", marginTop: "3px", color: "var(--text-muted)" }}>review today</div>
                  <div style={{ marginTop: "10px", display: "flex", gap: "4px" }}>
                    {[1,1,1,1,1,0,0,0].map((done, i) => (
                      <div key={i} style={{ flex: 1, height: "3px", borderRadius: "3px", background: done ? "var(--purple)" : "var(--border)" }} />
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Glow reflection */}
          <div style={{ height: "40px", margin: "0 24px", opacity: 0.12, borderRadius: "0 0 16px 16px", background: "linear-gradient(to bottom, rgba(79,142,247,0.3), transparent)" }} />
        </div>
      </section>

      {/* ── Social proof bar ── */}
      <div style={{
        position: "relative", zIndex: 10, overflow: "hidden",
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        background: "rgba(13,13,20,0.7)",
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "stretch",
          justifyContent: "center", maxWidth: "72rem", margin: "0 auto",
        }}>
          {[
            { label: "6 Israeli universities", sub: "TAU · Technion · HUJI · BGU · Bar Ilan · Ariel", color: "#4f8ef7",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              )
            },
            { label: "Real-time answers", sub: "Streamed directly from your slides", color: "#a78bfa",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              )
            },
            { label: "Built for Israeli exams", sub: "Moed A, Moed B, Moed C patterns", color: "#34d399",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
              )
            },
            { label: "Your data stays private", sub: "Never shared with other students", color: "#fbbf24",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              )
            },
          ].map((s, i) => (
            <div key={s.label} style={{
              flex: "1 1 200px", display: "flex", alignItems: "center", gap: "14px",
              padding: "1.5rem 2rem",
              borderRight: i < 3 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
                background: s.color + "14", border: `1px solid ${s.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: s.color,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>{s.label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="relative z-10" style={{ padding: "6rem 1.5rem" }}>
        <div style={{ maxWidth: "76rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "5rem" }}>
            <div style={{
              display: "inline-block", fontSize: "0.75rem", fontWeight: 700,
              padding: "0.35rem 1rem", borderRadius: "999px", marginBottom: "1.25rem",
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              background: "rgba(79,142,247,0.08)", color: "var(--blue-hover)", border: "1px solid rgba(79,142,247,0.18)",
            }}>
              How it works
            </div>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              From slides to exam-ready{" "}
              <span className="gradient-text-blue">in minutes</span>
            </h2>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              {
                step: "01", num: 1,
                title: "Upload your material",
                desc: "Drag in lecture slides, PDFs, past exams, or a Google Drive link. Proffy processes and indexes everything so it knows your course inside out.",
                color: "#4f8ef7", glow: "rgba(79,142,247,0.12)",
                tag: "Your slides. Your language.",
                illustration: <UploadIllustration />,
              },
              {
                step: "02", num: 2,
                title: "Ask anything, get sourced answers",
                desc: "Ask questions in plain language and get answers grounded in your specific slides. Every response cites the exact slide or page, no hallucinated facts.",
                color: "#a78bfa", glow: "rgba(167,139,250,0.12)",
                tag: "Zero hallucinations.",
                illustration: <AskIllustration />,
              },
              {
                step: "03", num: 3,
                title: "Ace your exam",
                desc: "Flashcards auto-scheduled with spaced repetition, a countdown to exam day, and professor pattern analysis that tells you exactly what to expect.",
                color: "#34d399", glow: "rgba(52,211,153,0.1)",
                tag: "Spaced repetition built in.",
                illustration: <StudyIllustration />,
              },
            ].map((s, i) => {
              const isEven = i % 2 === 1;
              return (
                <div key={s.step} style={{ position: "relative" }}>
                  {/* Connector line to next step */}
                  {i < 2 && (
                    <div style={{
                      position: "absolute", bottom: 0, left: "50%",
                      transform: "translateX(-50%)",
                      width: "1px", height: "48px",
                      background: `linear-gradient(to bottom, ${s.color}44, transparent)`,
                      zIndex: 2,
                    }} />
                  )}

                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    gap: "0", alignItems: "stretch",
                    marginBottom: i < 2 ? "48px" : 0,
                  }} className="how-it-works-row">
                    {/* Illustration side */}
                    <div style={{
                      order: isEven ? 2 : 1,
                      background: `radial-gradient(ellipse at ${isEven ? "30%" : "70%"} 50%, ${s.glow} 0%, transparent 65%)`,
                      borderRadius: isEven ? "0 20px 20px 0" : "20px 0 0 20px",
                      border: `1px solid ${s.color}20`,
                      borderRight: isEven ? `1px solid ${s.color}20` : "none",
                      borderLeft: isEven ? "none" : `1px solid ${s.color}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "3rem 2rem",
                      minHeight: "280px",
                      position: "relative", overflow: "hidden",
                    }}>
                      {/* Step number as large background */}
                      <div style={{
                        position: "absolute",
                        top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: "9rem", fontWeight: 900,
                        color: s.color, opacity: 0.04,
                        fontFamily: "monospace",
                        lineHeight: 1, userSelect: "none",
                        letterSpacing: "-0.04em",
                      }}>{s.num}</div>
                      <div style={{ width: "180px", height: "150px", position: "relative", zIndex: 1 }}>
                        {s.illustration}
                      </div>
                    </div>

                    {/* Content side */}
                    <div style={{
                      order: isEven ? 1 : 2,
                      background: "var(--bg-surface)",
                      borderRadius: isEven ? "20px 0 0 20px" : "0 20px 20px 0",
                      border: `1px solid ${s.color}20`,
                      borderRight: isEven ? "none" : `1px solid ${s.color}20`,
                      borderLeft: isEven ? `1px solid ${s.color}20` : "none",
                      padding: "3rem 3rem",
                      display: "flex", flexDirection: "column", justifyContent: "center",
                    }}>
                      {/* Step badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.5rem" }}>
                        <div style={{
                          width: "42px", height: "42px", borderRadius: "12px",
                          background: s.color + "18",
                          border: `1px solid ${s.color}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "monospace", fontWeight: 800, fontSize: "13px", color: s.color,
                          flexShrink: 0,
                        }}>{s.step}</div>
                        <div style={{
                          fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase" as const, color: s.color,
                          background: s.color + "12", border: `1px solid ${s.color}25`,
                          borderRadius: "6px", padding: "3px 10px",
                        }}>{s.tag}</div>
                      </div>

                      <h3 style={{
                        fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)",
                        fontWeight: 800, letterSpacing: "-0.025em",
                        color: "var(--text-primary)", lineHeight: 1.2,
                        marginBottom: "1rem",
                      }}>{s.title}</h3>

                      <p style={{
                        fontSize: "1rem", lineHeight: 1.7,
                        color: "var(--text-muted)", maxWidth: "38ch",
                      }}>{s.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10" style={{ borderTop: "1px solid var(--border)", padding: "6rem 1.5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "1rem" }}>
            Not another chatbot.{" "}
            <span className="gradient-text-blue">A tutor that knows your course.</span>
          </h2>
          <p style={{ fontSize: "1.15rem", maxWidth: "36rem", margin: "0 auto", color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Built specifically for Israeli university students.
          </p>
        </div>

        <div className="landing-grid-3-2">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              ),
              title: "Answers from your actual slides",
              desc: "Upload your professor's material. Every answer cites the exact slide and page number, not generic internet knowledge.",
              tag: null,
              accent: "var(--blue)",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              ),
              title: "Knows your professor's exam style",
              desc: "Feed it past exams. It learns what Prof. Cohen always asks, how he phrases trick questions, what appears every year.",
              tag: "Key differentiator",
              accent: "var(--purple)",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              ),
              title: "Personalized study plan",
              desc: "Tell it your exam date, level, and hours available. It builds a week-by-week plan and intensifies as the exam approaches.",
              tag: null,
              accent: "var(--green)",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
                </svg>
              ),
              title: "Smart flashcards",
              desc: "Auto-generated from your material. SM-2 spaced repetition schedules reviews at exactly the right time so nothing is forgotten.",
              tag: null,
              accent: "var(--amber)",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              ),
              title: "Hebrew handwriting recognition",
              desc: "Snap a photo of handwritten Hebrew notes. The AI reads, explains, and quizzes you on them. Works with cursive and print.",
              tag: null,
              accent: "var(--blue)",
            },
          ].map(f => (
            <div
              key={f.title}
              style={{
                position: "relative", borderRadius: "1.25rem", padding: "2.25rem",
                background: "var(--bg-surface)", border: "1px solid var(--border)",
              }}
            >
              {f.tag && (
                <div
                  style={{
                    position: "absolute", top: "1.5rem", right: "1.5rem",
                    fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    background: "rgba(79,142,247,0.12)", color: "var(--blue-hover)", border: "1px solid rgba(79,142,247,0.22)",
                  }}
                >
                  {f.tag}
                </div>
              )}
              <div
                style={{
                  width: "3.25rem", height: "3.25rem", borderRadius: "0.875rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1.75rem",
                  background: `${f.accent}18`, color: f.accent, border: `1px solid ${f.accent}28`,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>{f.title}</h3>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative z-10" style={{ borderTop: "1px solid var(--border)", padding: "6rem 1.5rem" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>Start free. Upgrade when ready.</h2>
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>Cancel anytime. No contracts.</p>
        </div>

        <div className="landing-grid-3" style={{ gap: "1rem" }}>
          {[
            {
              name: "Free",
              price: null,
              features: ["10 questions per day", "PDF upload (3 courses)", "Basic flashcards"],
              cta: "Start free",
              highlight: false,
            },
            {
              name: "Pro",
              price: "79",
              features: ["Unlimited questions", "Unlimited courses", "Smart flashcards + plan", "Exam prep mode", "Professor fingerprinting"],
              cta: "Get Pro",
              highlight: true,
            },
            {
              name: "Max",
              price: "149",
              features: ["Everything in Pro", "Study groups", "Exam predictions", "Telegram bot access", "Priority support"],
              cta: "Get Max",
              highlight: false,
            },
          ].map(plan => (
            <div
              key={plan.name}
              style={{
                position: "relative", borderRadius: "1.25rem", padding: "2.25rem",
                display: "flex", flexDirection: "column",
                background: plan.highlight
                  ? "linear-gradient(135deg, rgba(79,142,247,0.1), rgba(167,139,250,0.07))"
                  : "var(--bg-surface)",
                border: plan.highlight ? "1px solid rgba(79,142,247,0.32)" : "1px solid var(--border)",
                boxShadow: plan.highlight ? "0 0 48px rgba(79,142,247,0.1)" : "none",
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)",
                    padding: "0.25rem 1rem", borderRadius: "0 0 0.75rem 0.75rem",
                    fontSize: "0.7rem", fontWeight: 700,
                    background: "var(--blue)", color: "#fff",
                  }}
                >
                  Most popular
                </div>
              )}
              <div style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 800, fontSize: "2rem", color: "var(--text-primary)" }}>
                  {plan.price ? `₪${plan.price}` : "Free"}
                </span>
                {plan.price && <span style={{ fontSize: "0.875rem", marginLeft: "0.375rem", color: "var(--text-muted)" }}>/month</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "1.75rem", color: "var(--text-secondary)" }}>{plan.name}</div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "2rem" }}>
                {plan.features.map(line => (
                  <div key={line} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.925rem" }}>
                    <span style={{ marginTop: "1px", flexShrink: 0, color: "var(--green)", fontWeight: 700 }}>✓</span>
                    <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{line}</span>
                  </div>
                ))}
              </div>

              <Link
                href={plan.price ? `/register?plan=${plan.name.toLowerCase()}` : "/register"}
                className={plan.highlight ? "pricing-btn-primary" : "pricing-btn-ghost"}
                style={{
                  display: "block", width: "100%", textAlign: "center",
                  padding: "0.75rem 1.5rem", borderRadius: "0.875rem",
                  fontSize: "0.925rem", fontWeight: 600, textDecoration: "none",
                  ...(plan.highlight
                    ? { background: "var(--blue)", color: "#fff", boxShadow: "0 2px 16px var(--blue-glow)" }
                    : { background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                  ),
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.875rem", marginTop: "2rem", color: "var(--text-muted)" }}>
          All plans include Hebrew + English · Secure · Runs on Israeli infrastructure
        </p>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <div style={{ padding: "0 1.5rem 4rem" }}>
        <div
          className="relative z-10 rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(79,142,247,0.25)", maxWidth: "80rem", margin: "0 auto" }}
        >
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, rgba(79,142,247,0.1) 0%, rgba(167,139,250,0.08) 100%)"
            }}
          />
          <div style={{ position: "relative", zIndex: 10, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", padding: "2.5rem 2rem" }}>
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready to stop guessing what&apos;s on the exam?</h3>
              <p style={{ color: "var(--text-secondary)" }}>Join students from TAU, Technion, HUJI, BGU, Bar Ilan and Ariel.</p>
            </div>
            <Link href="/register" className="btn-primary" style={{ whiteSpace: "nowrap", flexShrink: 0, fontSize: "1.05rem", padding: "0.9rem 2.5rem", borderRadius: "1rem", fontWeight: 700 }}>
              Start free today →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="foot-lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4f8ef7" /><stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="9" fill="url(#foot-lg)" />
              <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
              <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8" />
              <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
              <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
              <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6" />
            </svg>
            <span className="font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>Proffy</span>
          </div>
          <p className="text-sm text-center">© 2025 Proffy · Built for Israeli students · All universities</p>
          <div className="flex gap-5 text-sm">
            <a href="#" className="transition hover:opacity-80">Privacy</a>
            <a href="#" className="transition hover:opacity-80">Terms</a>
            <a href="#" className="transition hover:opacity-80">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
