"use client";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  target: string;           // data-tour selector value
  title: string;
  description: string;
  side: "top" | "bottom" | "left" | "right";
  padding?: number;
}

const STEPS: Step[] = [
  {
    target: "chat-input",
    title: "Talk to Proffy",
    description: "Type any question here. Ask Proffy to explain a concept, quiz you, create flashcards, or set up your first course.",
    side: "top",
    padding: 8,
  },
  {
    target: "upload-btn",
    title: "Upload your material",
    description: "Add your slides, PDFs, and past exams. Proffy will answer questions directly from your own course material (Pro+).",
    side: "bottom",
    padding: 8,
  },
  {
    target: "sidebar-courses",
    title: "Your courses",
    description: "Each course has its own chat history, flashcards, and study context. Switch semester tabs to filter by A / B / Summer.",
    side: "right",
    padding: 6,
  },
  {
    target: "sidebar-flashcards",
    title: "Auto-saved flashcards",
    description: "When Proffy spots a concept you're struggling with, it saves a flashcard automatically. Spaced repetition keeps them fresh.",
    side: "right",
    padding: 6,
  },
  {
    target: "sidebar-notes",
    title: "Smart notes",
    description: "Key formulas, tricks, and professor insights are saved as notes from your chat. You can also add your own.",
    side: "right",
    padding: 6,
  },
];

const TOUR_KEY = "proffy_tour_done";
const GAP = 16;      // gap between spotlight and tooltip
const ARROW = 10;    // arrow size

function getRect(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function Arrow({ side }: { side: Step["side"] }) {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 0, height: 0,
    borderStyle: "solid",
  };
  if (side === "right") return (
    <div style={{
      ...base,
      right: "100%", top: "50%", transform: "translateY(-50%)",
      borderWidth: `${ARROW}px ${ARROW}px ${ARROW}px 0`,
      borderColor: `transparent rgba(30,32,50,0.98) transparent transparent`,
    }} />
  );
  if (side === "left") return (
    <div style={{
      ...base,
      left: "100%", top: "50%", transform: "translateY(-50%)",
      borderWidth: `${ARROW}px 0 ${ARROW}px ${ARROW}px`,
      borderColor: `transparent transparent transparent rgba(30,32,50,0.98)`,
    }} />
  );
  if (side === "bottom") return (
    <div style={{
      ...base,
      bottom: "100%", left: "50%", transform: "translateX(-50%)",
      borderWidth: `0 ${ARROW}px ${ARROW}px ${ARROW}px`,
      borderColor: `transparent transparent rgba(30,32,50,0.98) transparent`,
    }} />
  );
  // top
  return (
    <div style={{
      ...base,
      top: "100%", left: "50%", transform: "translateX(-50%)",
      borderWidth: `${ARROW}px ${ARROW}px 0 ${ARROW}px`,
      borderColor: `rgba(30,32,50,0.98) transparent transparent transparent`,
    }} />
  );
}

function tooltipPosition(rect: DOMRect, side: Step["side"], pad: number) {
  const TW = 280; // tooltip width
  const TH = 140; // estimated tooltip height

  if (side === "right") return {
    left: rect.right + pad + GAP,
    top: rect.top + rect.height / 2 - TH / 2,
  };
  if (side === "left") return {
    left: rect.left - pad - GAP - TW,
    top: rect.top + rect.height / 2 - TH / 2,
  };
  if (side === "bottom") return {
    left: rect.left + rect.width / 2 - TW / 2,
    top: rect.bottom + pad + GAP,
  };
  // top
  return {
    left: rect.left + rect.width / 2 - TW / 2,
    top: rect.top - pad - GAP - TH,
  };
}

export default function TourOverlay() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const current = STEPS[step];
  const pad = current?.padding ?? 8;

  const refresh = useCallback(() => {
    if (!active || !current) return;
    setRect(getRect(current.target));
  }, [active, current]);

  // Auto-show on first visit
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so layout renders first
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Re-trigger from Help page or anywhere
  useEffect(() => {
    function onStart() { setStep(0); setActive(true); }
    window.addEventListener("proffy:start-tour", onStart);
    return () => window.removeEventListener("proffy:start-tour", onStart);
  }, []);

  // Get target rect whenever step or active changes
  useLayoutEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setRect(getRect(current.target)), 60);
    return () => clearTimeout(t);
  }, [active, step, current?.target]);

  // Keep rect fresh on resize/scroll
  useEffect(() => {
    if (!active) return;
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [active, refresh]);

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  }

  function finish() {
    setActive(false);
    localStorage.setItem(TOUR_KEY, "1");
  }

  if (!active) return null;

  const spotTop  = rect ? rect.top  - pad : 0;
  const spotLeft = rect ? rect.left - pad : 0;
  const spotW    = rect ? rect.width  + pad * 2 : 0;
  const spotH    = rect ? rect.height + pad * 2 : 0;

  const tipPos = rect ? tooltipPosition(rect, current.side, pad) : { left: 0, top: 0 };

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Dark click-blocker backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={next}
            style={{
              position: "fixed", inset: 0,
              zIndex: 9995,
              cursor: "pointer",
            }}
          />

          {/* Spotlight — box-shadow creates the dark surround */}
          <AnimatePresence mode="wait">
            {rect && (
              <motion.div
                key={`spot-${step}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  top: spotTop,
                  left: spotLeft,
                  width: spotW,
                  height: spotH,
                  borderRadius: "10px",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
                  outline: "2px solid rgba(79,142,247,0.6)",
                  outlineOffset: "0px",
                  zIndex: 9996,
                  pointerEvents: "none",
                }}
              />
            )}
          </AnimatePresence>

          {/* Tooltip */}
          <AnimatePresence mode="wait">
            {rect && (
              <motion.div
                key={`tip-${step}`}
                initial={{ opacity: 0, y: current.side === "bottom" ? -8 : current.side === "top" ? 8 : 0, x: current.side === "right" ? -8 : current.side === "left" ? 8 : 0 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.08 }}
                style={{
                  position: "fixed",
                  left: Math.max(12, Math.min(tipPos.left, window.innerWidth - 296)),
                  top: Math.max(12, tipPos.top),
                  width: "280px",
                  zIndex: 9998,
                  background: "rgba(30,32,50,0.98)",
                  border: "1px solid rgba(79,142,247,0.25)",
                  borderRadius: "12px",
                  padding: "18px 18px 14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,142,247,0.08)",
                  pointerEvents: "all",
                }}
              >
                <Arrow side={current.side} />

                {/* Step dots */}
                <div style={{ display: "flex", gap: "5px", marginBottom: "12px" }}>
                  {STEPS.map((_, i) => (
                    <div key={i} style={{
                      width: i === step ? "16px" : "6px",
                      height: "6px", borderRadius: "3px",
                      background: i === step ? "#4f8ef7" : "rgba(255,255,255,0.15)",
                      transition: "all 0.2s",
                    }} />
                  ))}
                </div>

                <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>
                  {current.title}
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: "14px" }}>
                  {current.description}
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button
                    onClick={finish}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "11px", color: "rgba(255,255,255,0.35)",
                      padding: "4px 0",
                    }}
                  >
                    Skip tour
                  </button>
                  <button
                    onClick={next}
                    style={{
                      padding: "7px 16px", borderRadius: "8px", border: "none",
                      background: "linear-gradient(135deg,#4f8ef7,#a78bfa)",
                      color: "#fff", fontSize: "12px", fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {step === STEPS.length - 1 ? "Done ✓" : "Next →"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* "Click anywhere to advance" hint */}
          {rect && (
            <div style={{
              position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
              fontSize: "11px", color: "rgba(255,255,255,0.3)",
              zIndex: 9998, pointerEvents: "none",
            }}>
              Click anywhere to continue
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
