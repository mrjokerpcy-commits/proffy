"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BETA_UNLOCK_KEY } from "@/lib/constants";
import Mascot from "@/components/ui/Mascot";

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
          background: "radial-gradient(circle, var(--blue-dim) 0%, transparent 65%)",
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
          background: "radial-gradient(circle, var(--blue-glow) 0%, transparent 65%)",
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
          background: "radial-gradient(circle, var(--purple-glow, var(--blue-dim)) 0%, transparent 65%)",
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

// ─── Mascot — floating owl ────────────────────────────────────────────────────
function FloatingMascot() {
  return (
    <motion.div
      aria-hidden="true"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <Mascot variant="avatar" size={88} priority />
    </motion.div>
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
    const gated = host.startsWith("uni.") || host === "localhost" || host === "127.0.0.1";
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
                backgroundImage: "linear-gradient(var(--blue-dim) 1px, transparent 1px), linear-gradient(90deg, var(--blue-dim) 1px, transparent 1px)",
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
                background: "var(--blue-dim)",
                border: "1px solid var(--blue-glow)",
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
                  background: "linear-gradient(135deg, #fff 0%, var(--blue-hover) 45%, var(--purple) 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text", lineHeight: 1, flexShrink: 0,
                  paddingBottom: "0.18em",
                }}>
                  Proffy.
                </span>
                <FloatingMascot />
              </div>

              {/* Tagline */}
              <p dir="rtl" style={{
                fontSize: "17px", color: "var(--text-secondary)",
                lineHeight: 1.6, maxWidth: "400px",
                margin: "0 auto 8px",
                fontWeight: 400,
                unicodeBidi: "plaintext",
              }}>
                ה‑AI שמכיר את הקורסים שלך, את המרצה, ואת מה שבאמת יוצא בבחינה.
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
