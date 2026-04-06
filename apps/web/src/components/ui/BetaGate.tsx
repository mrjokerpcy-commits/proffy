"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BETA_ACCESS_CODES, BETA_UNLOCK_KEY } from "@/lib/constants";

// ─── Typewriter ───────────────────────────────────────────────────────────────
const PHRASES = [
  "ACADEMIC INTELLIGENCE.",
  "AI STUDY COMPANION.",
  "PRIVATE BETA.",
  "YOUR EDGE IN ACADEMIA.",
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
        const t = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 65);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setDeleting(true), 2200);
      return () => clearTimeout(t);
    }
    if (text.length > 0) {
      const t = setTimeout(() => setText(text.slice(0, -1)), 35);
      return () => clearTimeout(t);
    }
    setDeleting(false);
    setPaused(true);
    setPhraseIdx((i) => (i + 1) % PHRASES.length);
  }, [text, deleting, paused, phraseIdx]);

  return text;
}

// ─── Starfield canvas ────────────────────────────────────────────────────────
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      baseAlpha: Math.random() * 0.5 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.25 + 0.05,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() / 1000;
      for (const s of stars) {
        const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }}
    />
  );
}

// ─── Duck mascot ─────────────────────────────────────────────────────────────
function DuckMascot() {
  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cap board */}
      <polygon points="36,8 55,16 36,24 17,16" fill="#111827" />
      {/* Cap top */}
      <rect x="22" y="14" width="28" height="5" rx="1.5" fill="#1f2937" />
      {/* Tassel line */}
      <line x1="55" y1="16" x2="58" y2="26" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
      {/* Tassel ball */}
      <circle cx="58" cy="28" r="2.5" fill="#f59e0b" />
      {/* Body */}
      <ellipse cx="36" cy="50" rx="17" ry="15" fill="#fcd34d" />
      {/* Head */}
      <circle cx="36" cy="31" r="12" fill="#fcd34d" />
      {/* Eye white */}
      <circle cx="40" cy="29" r="3" fill="white" />
      {/* Eye pupil */}
      <circle cx="41" cy="29.5" r="1.8" fill="#111827" />
      {/* Eye shine */}
      <circle cx="41.8" cy="28.5" r="0.7" fill="white" />
      {/* Beak */}
      <path d="M44 33 L52 32 L44 36 Z" fill="#f97316" />
      {/* Wing */}
      <ellipse
        cx="24"
        cy="50"
        rx="9"
        ry="6"
        fill="#fbbf24"
        transform="rotate(-18 24 50)"
      />
      {/* Feet */}
      <path d="M29 63 L25 68 M29 63 L33 68" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <path d="M43 63 L39 68 M43 63 L47 68" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = code.trim().toUpperCase();
      if (BETA_ACCESS_CODES.includes(trimmed)) {
        setUnlocking(true);
        localStorage.setItem(BETA_UNLOCK_KEY, "true");
        setTimeout(() => setStatus("unlocked"), 700);
      } else {
        setError("Invalid access code.");
        setShaking(true);
        setTimeout(() => setShaking(false), 550);
        inputRef.current?.select();
      }
    },
    [code]
  );

  if (status === "loading") return null;
  if (status === "unlocked") return <>{children}</>;

  return (
    <>
      {/* Render children hidden behind gate so layout hydrates */}
      <div aria-hidden="true" style={{ visibility: "hidden", position: "absolute", inset: 0, pointerEvents: "none" }}>
        {children}
      </div>

      <AnimatePresence>
        {status === "locked" && (
          <motion.div
            key="gate"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "var(--bg-base)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <StarField />

            {/* Ambient glow */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "10%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "700px",
                height: "400px",
                background:
                  "radial-gradient(ellipse at center, rgba(79,142,247,0.07) 0%, transparent 68%)",
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: "5%",
                right: "20%",
                width: "400px",
                height: "300px",
                background:
                  "radial-gradient(ellipse at center, rgba(167,139,250,0.05) 0%, transparent 68%)",
                pointerEvents: "none",
              }}
            />

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "relative",
                zIndex: 1,
                textAlign: "center",
                maxWidth: "500px",
                width: "100%",
                padding: "0 28px",
              }}
            >
              {/* Private Beta badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  background: "rgba(79,142,247,0.1)",
                  border: "1px solid rgba(79,142,247,0.22)",
                  borderRadius: "99px",
                  padding: "5px 16px",
                  marginBottom: "26px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--blue)",
                    boxShadow: "0 0 8px var(--blue)",
                    animation: "fc-pulse 2.4s ease-in-out infinite",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: "var(--blue)",
                    textTransform: "uppercase",
                  }}
                >
                  Private Beta
                </span>
              </div>

              {/* Typewriter */}
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  color: "var(--text-muted)",
                  marginBottom: "18px",
                  height: "16px",
                  textTransform: "uppercase",
                  userSelect: "none",
                }}
              >
                {typewriter}
                <span className="cursor-blink" style={{ borderRight: "2px solid var(--text-muted)", marginLeft: "2px" }} />
              </div>

              {/* Brand + Duck */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "14px",
                  marginBottom: "18px",
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(52px, 10vw, 76px)",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    background:
                      "linear-gradient(135deg, #fff 0%, var(--blue-hover) 50%, var(--purple) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  Proffy.
                </span>
                <DuckMascot />
              </div>

              {/* Tagline */}
              <p
                style={{
                  fontSize: "16px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.65,
                  maxWidth: "380px",
                  margin: "0 auto 8px",
                }}
              >
                An academic decision engine. Converting skills, classes, and interests into actionable intelligence.
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  marginBottom: "36px",
                }}
              >
                Access is invite-only while we finalize the experience.
              </p>

              {/* Code form */}
              <motion.form
                onSubmit={handleSubmit}
                animate={
                  shaking
                    ? { x: [-10, 10, -7, 7, -4, 4, 0], transition: { duration: 0.5 } }
                    : { x: 0 }
                }
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your access code"
                  maxLength={32}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: "14px",
                    background: "var(--bg-elevated)",
                    border: `1px solid ${error ? "rgba(248,113,113,0.6)" : "var(--border)"}`,
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textAlign: "center",
                    outline: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  className="input-ring"
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        fontSize: "12.5px",
                        color: "var(--red)",
                        textAlign: "center",
                        margin: "0",
                      }}
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
                      flex: 1,
                      padding: "14px",
                      borderRadius: "14px",
                      fontSize: "15px",
                      fontWeight: 600,
                      border: "none",
                      cursor: code.trim() && !unlocking ? "pointer" : "default",
                    }}
                  >
                    {unlocking ? "Unlocking…" : "Enter"}
                  </button>
                  <a
                    href="mailto:hello@proffy.study"
                    className="btn-ghost"
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "14px",
                      fontSize: "15px",
                      fontWeight: 500,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Request Access
                  </a>
                </div>
              </motion.form>

              {/* "new!" pill badge — proffy.ai style */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{
                  marginTop: "32px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
                  borderRadius: "99px",
                  padding: "7px 7px 7px 7px",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    background: "#f59e0b",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    borderRadius: "99px",
                    padding: "3px 10px",
                    marginRight: "10px",
                    textTransform: "lowercase",
                  }}
                >
                  new!
                </span>
                <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", paddingRight: "8px" }}>
                  Take the quiz, get{" "}
                  <span
                    style={{
                      background: "linear-gradient(90deg, #f59e0b, #f97316)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      fontWeight: 600,
                    }}
                  >
                    personalized
                  </span>{" "}
                  insights!
                </span>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <div
              style={{
                position: "absolute",
                bottom: "24px",
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: "12px",
                color: "var(--text-disabled)",
              }}
            >
              © {new Date().getFullYear()} Proffy · proffy.study
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
