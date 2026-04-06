"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BETA_UNLOCK_KEY } from "@/lib/constants";

// ─── Typewriter ───────────────────────────────────────────────────────────────
const PHRASES = [
  "למד חכם יותר בכל שיעור.",
  "ה-AI שלך לכל קורס.",
  "העלה. שאל. עבור את הבחינה.",
  "נבנה לסטודנטים ישראלים.",
];

function useTypewriter() {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const phrase = PHRASES[phraseIdx];
    if (paused) {
      const t = setTimeout(() => setPaused(false), 900);
      return () => clearTimeout(t);
    }
    if (!deleting) {
      if (text.length < phrase.length) {
        const t = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 60);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setDeleting(true), 2400);
      return () => clearTimeout(t);
    }
    if (text.length > 0) {
      const t = setTimeout(() => setText(text.slice(0, -1)), 30);
      return () => clearTimeout(t);
    }
    setDeleting(false);
    setPaused(true);
    setPhraseIdx((i) => (i + 1) % PHRASES.length);
  }, [text, deleting, paused, phraseIdx]);

  return text;
}

// ─── Ambient orbs background ─────────────────────────────────────────────────
function AmbientBg() {
  return (
    <>
      <motion.div
        aria-hidden="true"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", pointerEvents: "none",
          width: "600px", height: "600px",
          borderRadius: "50%",
          top: "-180px", left: "50%", transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)",
        }}
      />
      <motion.div
        aria-hidden="true"
        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute", pointerEvents: "none",
          width: "400px", height: "400px",
          borderRadius: "50%",
          bottom: "0px", right: "10%",
          background: "radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 65%)",
        }}
      />
      <motion.div
        aria-hidden="true"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        style={{
          position: "absolute", pointerEvents: "none",
          width: "320px", height: "320px",
          borderRadius: "50%",
          bottom: "10%", left: "5%",
          background: "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 65%)",
        }}
      />
    </>
  );
}

// ─── Floating stat chips ─────────────────────────────────────────────────────
function StatChips() {
  const stats = [
    { label: "שיפור ממוצע בציון", value: "+18%" },
    { label: "שעות שנחסכות בשבוע", value: "4.5h" },
    { label: "קורסים באינדקס", value: "800+" },
  ];
  return (
    <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: "99px",
            padding: "5px 14px",
            fontSize: "12px",
          }}
        >
          <span style={{ fontWeight: 800, color: "var(--blue)" }}>{s.value}</span>
          <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Professor mascot ────────────────────────────────────────────────────────
function ProfessorMascot() {
  return (
    <motion.svg
      width="72" height="72" viewBox="0 0 72 80"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* ── Mortarboard ── */}
      <rect x="29" y="6" width="14" height="8" rx="2.5" fill="#111827" />
      <rect x="14" y="13" width="44" height="5.5" rx="1.5" fill="#111827" />
      {/* Tassel — curves from right corner and splits into fringe */}
      <path d="M 58 15 C 63 19 63 25 60 30" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="58" y1="30" x2="56" y2="36" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="60" y1="30" x2="60" y2="36" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="62" y1="30" x2="64" y2="36" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />

      {/* ── Head ── */}
      <circle cx="36" cy="29" r="13" fill="#ffe0b2" />

      {/* ── Eyebrows — distinguished, slightly arched ── */}
      <path d="M 26 22.5 Q 30 21 34 22.5" fill="none" stroke="#7c5c30" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 38 22.5 Q 42 21 46 22.5" fill="none" stroke="#7c5c30" strokeWidth="1.6" strokeLinecap="round" />

      {/* ── Glasses — thick frames, round, very professor ── */}
      <circle cx="30" cy="28" r="5.2" fill="rgba(220,235,255,0.14)" stroke="#1f2937" strokeWidth="2.2" />
      <circle cx="42" cy="28" r="5.2" fill="rgba(220,235,255,0.14)" stroke="#1f2937" strokeWidth="2.2" />
      <line x1="35.2" y1="28" x2="36.8" y2="28" stroke="#1f2937" strokeWidth="2" />
      <line x1="24.8" y1="26.5" x2="21" y2="27.5" stroke="#1f2937" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="47.2" y1="26.5" x2="51" y2="27.5" stroke="#1f2937" strokeWidth="1.7" strokeLinecap="round" />

      {/* ── Eyes ── */}
      <circle cx="30" cy="28" r="2.5" fill="#1e1b4b" />
      <circle cx="42" cy="28" r="2.5" fill="#1e1b4b" />
      <circle cx="30.9" cy="27" r="1" fill="white" />
      <circle cx="42.9" cy="27" r="1" fill="white" />

      {/* ── Subtle knowing smile ── */}
      <path d="M 33 34.5 Q 36 37 39 34.5" fill="none" stroke="#b07040" strokeWidth="1.5" strokeLinecap="round" />

      {/* ── Neck ── */}
      <rect x="33.5" y="41" width="5" height="6" rx="2" fill="#ffe0b2" />

      {/* ── White academic robe — wide, authoritative ── */}
      <path d="M 6 80 L 5 50 Q 17 41 36 41 Q 55 41 67 50 L 66 80 Z" fill="white" />

      {/* ── Robe inner shadow for depth ── */}
      <path d="M 21 44 L 36 80 L 51 44 Q 44 41 36 41 Q 28 41 21 44 Z" fill="rgba(99,102,241,0.07)" />

      {/* ── Dark collar / V-neck ── */}
      <path d="M 27 46 L 36 58 L 45 46" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* ── Folded arms — off-white against white robe ── */}
      {/* Right arm, bottom layer */}
      <path d="M 66 62 C 52 57 28 57 6 61 C 28 65 52 66 66 66 Z" fill="#dde4f8" stroke="rgba(99,102,241,0.18)" strokeWidth="1" />
      {/* Left arm, top layer */}
      <path d="M 6 57 C 22 53 50 53 66 57 C 50 61 22 61 6 62 Z" fill="#eaeefc" stroke="rgba(99,102,241,0.14)" strokeWidth="1" />
      {/* Elbow bumps */}
      <ellipse cx="66" cy="64" rx="4" ry="6" fill="#dde4f8" stroke="rgba(99,102,241,0.18)" strokeWidth="1" />
      <ellipse cx="6" cy="59.5" rx="4" ry="6" fill="#eaeefc" stroke="rgba(99,102,241,0.14)" strokeWidth="1" />
    </motion.svg>
  );
}

// ─── Main gate ───────────────────────────────────────────────────────────────
export default function BetaGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typewriter = useTypewriter();

  useEffect(() => {
    // Gate only applies on app.proffy.study and localhost (dev)
    const host = window.location.hostname;
    const gated = host.startsWith("app.") || host === "localhost" || host === "127.0.0.1";
    if (!gated) { setStatus("unlocked"); return; }
    const stored = localStorage.getItem(BETA_UNLOCK_KEY);
    setStatus(stored === "true" ? "unlocked" : "locked");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code.trim() || unlocking) return;
      setUnlocking(true);
      setError("");
      try {
        const res = await fetch("/api/beta-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (data.valid) {
          localStorage.setItem(BETA_UNLOCK_KEY, "true");
          setTimeout(() => setStatus("unlocked"), 700);
        } else {
          setUnlocking(false);
          setError(res.status === 429 ? data.error : "That code didn't work.");
          setShaking(true);
          setTimeout(() => setShaking(false), 550);
          inputRef.current?.select();
        }
      } catch {
        setUnlocking(false);
        setError("Connection error. Try again.");
      }
    },
    [code, unlocking]
  );

  if (status === "loading") return null;
  if (status === "unlocked") return <>{children}</>;

  return (
    <>
      <div aria-hidden="true" style={{ visibility: "hidden", position: "absolute", inset: 0, pointerEvents: "none" }}>
        {children}
      </div>

      <AnimatePresence>
        {status === "locked" && (
          <motion.div
            key="gate"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -16, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "var(--bg-base)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <AmbientBg />

            {/* Grid pattern overlay */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
                maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
              }}
            />

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "relative", zIndex: 1,
                textAlign: "center",
                maxWidth: "520px", width: "100%",
                padding: "0 28px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0",
              }}
            >
              {/* Early Access badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "99px", padding: "5px 16px",
                marginBottom: "24px",
              }}>
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "var(--blue)", flexShrink: 0,
                  boxShadow: "0 0 10px var(--blue)",
                  animation: "fc-pulse 2s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--blue)", textTransform: "uppercase" }}>
                  גישה מוקדמת
                </span>
              </div>

              {/* Typewriter */}
              <div style={{
                fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em",
                color: "var(--text-muted)", marginBottom: "20px",
                height: "16px", textTransform: "uppercase", userSelect: "none",
              }}>
                {typewriter}
                <span className="cursor-blink" style={{ borderRight: "2px solid var(--text-muted)", marginLeft: "2px" }} />
              </div>

              {/* Brand + Duck */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "16px", marginBottom: "20px",
              }}>
                <span style={{
                  fontSize: "clamp(54px, 10vw, 78px)",
                  fontWeight: 900, letterSpacing: "-0.04em",
                  background: "linear-gradient(135deg, #fff 0%, #a5b4fc 45%, #c084fc 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text", lineHeight: 1, flexShrink: 0,
                  paddingBottom: "0.18em",
                }}>
                  Proffy.
                </span>
                <ProfessorMascot />
              </div>

              {/* Tagline */}
              <p style={{
                fontSize: "17px", color: "var(--text-secondary)",
                lineHeight: 1.6, maxWidth: "400px",
                margin: "0 auto 8px",
                fontWeight: 400,
              }}>
                ה-AI שמכיר את הקורסים שלך, את המרצה, ואת מה שבאמת יוצא בבחינה.
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "32px" }}>
                גישה בהזמנה בלבד. הזן את קוד הגישה שלך להמשך.
              </p>

              {/* Stat chips */}
              <div style={{ marginBottom: "32px" }}>
                <StatChips />
              </div>

              {/* Code form */}
              <motion.form
                onSubmit={handleSubmit}
                animate={shaking ? { x: [-10, 10, -7, 7, -4, 4, 0], transition: { duration: 0.5 } } : { x: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(""); }}
                  placeholder="קוד גישה"
                  maxLength={32}
                  autoComplete="off"
                  spellCheck={false}
                  className="input-ring"
                  style={{
                    width: "100%", padding: "14px 20px",
                    borderRadius: "14px",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    fontSize: "15px", fontWeight: 500,
                    letterSpacing: "0.08em", textAlign: "center",
                    border: `1px solid ${error ? "rgba(248,113,113,0.5)" : "var(--border)"}`,
                  }}
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ fontSize: "12.5px", color: "var(--red)", textAlign: "center", margin: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    disabled={!code.trim() || unlocking}
                    className="btn-primary"
                    style={{
                      flex: 1, padding: "14px", borderRadius: "14px",
                      fontSize: "15px", fontWeight: 600, border: "none",
                      cursor: code.trim() && !unlocking ? "pointer" : "default",
                    }}
                  >
                    {unlocking ? "מאמת…" : "כניסה"}
                  </button>
                  <a
                    href="mailto:hello@proffy.study"
                    className="btn-ghost"
                    style={{
                      flex: 1, padding: "14px", borderRadius: "14px",
                      fontSize: "15px", fontWeight: 500,
                      textDecoration: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    בקשת גישה
                  </a>
                </div>
              </motion.form>
            </motion.div>

            {/* Footer */}
            <div style={{
              position: "absolute", bottom: "24px", left: 0, right: 0,
              textAlign: "center", fontSize: "12px", color: "var(--text-disabled)",
            }}>
              © {new Date().getFullYear()} Proffy · proffy.study
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
