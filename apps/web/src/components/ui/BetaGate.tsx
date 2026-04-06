"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BETA_UNLOCK_KEY } from "@/lib/constants";

// ─── Typewriter ───────────────────────────────────────────────────────────────
const PHRASES = [
  "STUDY SMARTER EVERY SESSION.",
  "YOUR AI FOR EVERY COURSE.",
  "UPLOAD. ASK. ACE THE EXAM.",
  "BUILT FOR ISRAELI STUDENTS.",
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
    { label: "Avg exam score boost", value: "+18%" },
    { label: "Hours saved per week", value: "4.5h" },
    { label: "Courses indexed", value: "800+" },
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
      width="64" height="64" viewBox="0 0 72 72"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Cap crown */}
      <rect x="29" y="7" width="14" height="7" rx="2" fill="#1e1b4b" />
      {/* Cap board */}
      <rect x="18" y="13" width="36" height="5" rx="1.5" fill="#1e1b4b" />
      {/* Tassel string */}
      <line x1="54" y1="15.5" x2="58" y2="26" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
      {/* Tassel bob */}
      <circle cx="58" cy="28" r="2.8" fill="#f59e0b" />

      {/* Head */}
      <circle cx="36" cy="31" r="13" fill="#ffd9a0" />

      {/* Glasses — left lens */}
      <circle cx="30" cy="30" r="4.5" fill="rgba(180,220,255,0.12)" stroke="#374151" strokeWidth="1.7" />
      {/* Glasses — right lens */}
      <circle cx="42" cy="30" r="4.5" fill="rgba(180,220,255,0.12)" stroke="#374151" strokeWidth="1.7" />
      {/* Bridge */}
      <line x1="34.5" y1="30" x2="37.5" y2="30" stroke="#374151" strokeWidth="1.6" />
      {/* Left temple */}
      <line x1="25.5" y1="28.5" x2="22" y2="30" stroke="#374151" strokeWidth="1.4" />
      {/* Right temple */}
      <line x1="46.5" y1="28.5" x2="50" y2="30" stroke="#374151" strokeWidth="1.4" />

      {/* Eyes */}
      <circle cx="30" cy="30" r="2.2" fill="#1a1a2e" />
      <circle cx="42" cy="30" r="2.2" fill="#1a1a2e" />
      <circle cx="30.9" cy="29.1" r="0.8" fill="white" />
      <circle cx="42.9" cy="29.1" r="0.8" fill="white" />

      {/* Smile */}
      <path d="M 32.5 36 Q 36 39.5 39.5 36" fill="none" stroke="#b07845" strokeWidth="1.4" strokeLinecap="round" />

      {/* Neck */}
      <rect x="33" y="43" width="6" height="5" rx="1.5" fill="#ffd9a0" />
      {/* Robe body */}
      <path d="M 14 72 L 13 50 Q 23 43 36 43 Q 49 43 59 50 L 58 72 Z" fill="#1e1b4b" />
      {/* Lapels */}
      <path d="M 27 48 L 36 57 L 45 48" fill="none" stroke="#312e81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Folded arms — right arm (bottom layer) */}
      <path d="M 57 59 C 46 55, 26 55, 15 58 C 26 61, 46 62, 57 63 Z" fill="#27247a" />
      {/* Folded arms — left arm (top layer) */}
      <path d="M 15 55 C 28 52, 46 51, 57 54 C 46 58, 28 58, 15 60 Z" fill="#38359a" />
      {/* Right elbow */}
      <ellipse cx="57" cy="60.5" rx="3.5" ry="5.5" fill="#27247a" />
      {/* Left elbow */}
      <ellipse cx="15" cy="57" rx="3.5" ry="5.5" fill="#38359a" />
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
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--blue)", textTransform: "uppercase" }}>
                  Early Access
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
                Your AI study partner that knows your courses, your professor, and what actually shows up on the exam.
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "32px" }}>
                Currently invite-only. Enter your access code to continue.
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
                  placeholder="Access code"
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
                    {unlocking ? "Verifying…" : "Enter"}
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
                    Request Access
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
