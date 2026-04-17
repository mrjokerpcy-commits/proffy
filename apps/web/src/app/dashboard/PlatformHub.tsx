"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LangToggle from "@/components/ui/LangToggle";

const PLATFORMS = [
  {
    id: "uni",
    name: "Uni by Proffy",
    nameHe: "אוניברסיטה",
    tagline: "Your AI study companion",
    description: "Chat with an AI that knows your course material, professor style, and exam patterns.",
    icon: "🎓",
    color: "#4f8ef7",
    colorRgb: "79,142,247",
    gradient: "linear-gradient(135deg, #4f8ef7 0%, #6366f1 100%)",
    url: process.env.NODE_ENV === "production" ? "https://uni.proffy.study/dashboard" : "/dashboard",
  },
  {
    id: "psycho",
    name: "Psycho by Proffy",
    nameHe: "פסיכומטרי",
    tagline: "Ace the psychometric",
    description: "Adaptive practice, score prediction, full verbal and quantitative coverage.",
    icon: "🧠",
    color: "#a78bfa",
    colorRgb: "167,139,250",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)",
    url: process.env.NODE_ENV === "production" ? "https://psycho.proffy.study/dashboard" : "/dashboard",
  },
  {
    id: "yael",
    name: "Yael by Proffy",
    nameHe: 'יע"ל',
    tagline: "Prepare for Yael",
    description: "Hebrew reading comprehension, vocabulary, and proven exam strategies.",
    icon: "📖",
    color: "#34d399",
    colorRgb: "52,211,153",
    gradient: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
    url: process.env.NODE_ENV === "production" ? "https://yael.proffy.study/dashboard" : "/dashboard",
  },
  {
    id: "bagrut",
    name: "Bagrut by Proffy",
    nameHe: "בגרות",
    tagline: "Matriculation prep",
    description: "Every bagrut subject. Practice, revise, and walk into your exam ready.",
    icon: "📝",
    color: "#fbbf24",
    colorRgb: "251,191,36",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
    url: process.env.NODE_ENV === "production" ? "https://bagrut.proffy.study/dashboard" : "/dashboard",
  },
] as const;

interface Props {
  firstName: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  platformPlans: Record<string, string>;
  uniStats: { courses: number; fc_due: number; messages: number } | null;
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    free: { bg: "rgba(255,255,255,0.06)", color: "var(--text-muted)", label: "Free" },
    pro:  { bg: "rgba(79,142,247,0.15)",  color: "#4f8ef7",           label: "Pro"  },
    max:  { bg: "rgba(167,139,250,0.15)", color: "#a78bfa",           label: "Max"  },
  };
  const s = map[plan] ?? map.free;
  return (
    <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: s.bg, color: s.color, borderRadius: "99px", padding: "3px 9px", border: `1px solid ${s.color}33` }}>
      {s.label}
    </span>
  );
}

export default function PlatformHub({ firstName, userName, userEmail, userImage, platformPlans, uniStats }: Props) {
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activating, setActivating] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  async function activate(platformId: string) {
    const code = codeInputs[platformId] ?? "";
    if (!code.trim()) { setErrors(e => ({ ...e, [platformId]: "Enter your access code" })); return; }
    setActivating(platformId);
    setErrors(e => ({ ...e, [platformId]: "" }));
    try {
      const res = await fetch("/api/platform/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platformId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setErrors(e => ({ ...e, [platformId]: data.error ?? "Invalid code" }));
      else window.location.reload();
    } finally { setActivating(null); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Still up?" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", fontFamily: "system-ui, sans-serif", position: "relative", overflow: "hidden" }}>

      {/* Ambient glow */}
      <div aria-hidden="true" style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "800px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.09) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Header ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, height: "60px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 clamp(16px,4vw,40px)", justifyContent: "space-between", background: "var(--nav-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-owl.png" alt="Proffy" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Proffy</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LangToggle />
          <ThemeToggle />
          <div style={{ width: "1px", height: "20px", background: "var(--border)", margin: "0 4px" }} />
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName} style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--border)" }} />
          ) : (
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "5px 11px", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "clamp(32px,5vw,60px) clamp(16px,4vw,40px)", position: "relative", zIndex: 1 }}>

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: "48px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--blue)", marginBottom: "8px" }}>
            {greeting}
          </div>
          <h1 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "8px", lineHeight: 1.1 }}>
            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
          </h1>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
            Which platform are you studying with today?
          </p>
        </motion.div>

        {/* Platform grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(440px,100%),1fr))", gap: "16px" }}>
          {PLATFORMS.map((p, i) => {
            const plan = platformPlans[p.id];
            const isActivated = !!plan;
            const isExpanded = expandedCode === p.id;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                style={{
                  position: "relative",
                  background: "var(--bg-surface)",
                  border: `1px solid ${isActivated ? `rgba(${p.colorRgb},0.3)` : "var(--border)"}`,
                  borderRadius: "18px",
                  overflow: "hidden",
                  transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
                  boxShadow: isActivated ? `0 0 0 0 rgba(${p.colorRgb},0)` : "none",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 12px 40px rgba(${p.colorRgb},0.15)`;
                  if (isActivated) e.currentTarget.style.borderColor = `rgba(${p.colorRgb},0.55)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "none";
                  if (isActivated) e.currentTarget.style.borderColor = `rgba(${p.colorRgb},0.3)`;
                  else e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {/* Ambient glow inside card */}
                <div aria-hidden="true" style={{ position: "absolute", top: "-30px", left: "-30px", width: "160px", height: "160px", borderRadius: "50%", background: `radial-gradient(circle, rgba(${p.colorRgb},${isActivated ? "0.12" : "0.05"}) 0%, transparent 70%)`, pointerEvents: "none" }} />

                {/* Locked overlay tint */}
                {!isActivated && (
                  <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.03)", pointerEvents: "none", zIndex: 1, borderRadius: "18px" }} />
                )}

                <div style={{ padding: "26px 26px 22px", position: "relative", zIndex: 2 }}>

                  {/* Top row: icon + name + plan badge */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0, boxShadow: `0 4px 16px rgba(${p.colorRgb},0.3)` }}>
                        {p.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{p.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>{p.nameHe} · {p.tagline}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      {isActivated && <PlanBadge plan={plan} />}
                      {!isActivated && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, color: "var(--text-disabled)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "18px" }}>
                    {p.description}
                  </p>

                  {/* Stats — Uni only */}
                  {isActivated && p.id === "uni" && uniStats && (
                    <div style={{ display: "flex", gap: "0", marginBottom: "18px", background: "var(--bg-elevated)", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)" }}>
                      {[
                        { value: uniStats.courses, label: "Courses" },
                        { value: uniStats.fc_due, label: "Cards due", highlight: uniStats.fc_due > 0 },
                        { value: uniStats.messages, label: "Messages" },
                      ].map((stat, si) => (
                        <div key={si} style={{ flex: 1, padding: "10px 0", textAlign: "center", borderRight: si < 2 ? "1px solid var(--border)" : "none" }}>
                          <div style={{ fontSize: "18px", fontWeight: 800, color: stat.highlight ? "#fbbf24" : "var(--text-primary)", lineHeight: 1 }}>{stat.value}</div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", fontWeight: 500 }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA */}
                  {isActivated ? (
                    <a
                      href={p.url}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "11px 20px", borderRadius: "10px", background: p.gradient, color: "#fff", fontWeight: 700, fontSize: "14px", textDecoration: "none", boxShadow: `0 4px 18px rgba(${p.colorRgb},0.3)`, transition: "opacity 0.15s, transform 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
                    >
                      Open {p.name}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                  ) : (
                    <div>
                      <button
                        onClick={() => setExpandedCode(isExpanded ? null : p.id)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "11px 20px", borderRadius: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${p.colorRgb},0.4)`; e.currentTarget.style.background = `rgba(${p.colorRgb},0.05)`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Unlock with access code
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ paddingTop: "10px", display: "flex", gap: "8px" }}>
                              <input
                                type="text"
                                value={codeInputs[p.id] ?? ""}
                                onChange={e => setCodeInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                onKeyDown={e => e.key === "Enter" && activate(p.id)}
                                placeholder="Access code"
                                autoFocus
                                style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", fontSize: "13px", background: "var(--bg-elevated)", border: `1px solid ${errors[p.id] ? "var(--red)" : "var(--border)"}`, color: "var(--text-primary)", outline: "none", letterSpacing: "0.04em" }}
                              />
                              <button
                                onClick={() => activate(p.id)}
                                disabled={activating === p.id}
                                style={{ padding: "9px 16px", borderRadius: "8px", background: p.gradient, color: "#fff", fontWeight: 700, fontSize: "13px", border: "none", cursor: activating === p.id ? "not-allowed" : "pointer", opacity: activating === p.id ? 0.7 : 1, flexShrink: 0 }}
                              >
                                {activating === p.id ? "…" : "Unlock"}
                              </button>
                            </div>
                            {errors[p.id] && (
                              <p style={{ fontSize: "12px", color: "var(--red)", margin: "6px 0 0", paddingLeft: "2px" }}>{errors[p.id]}</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-disabled)", marginTop: "48px" }}>
          More platforms coming soon · <a href="https://proffy.study" style={{ color: "var(--text-muted)", textDecoration: "none" }}>proffy.study</a>
        </p>
      </main>
    </div>
  );
}
