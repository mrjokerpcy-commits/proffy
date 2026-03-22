"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Pomodoro config ───────────────────────────────────────────────────────────
const MODES = {
  focus:  { label: "Focus",       secs: 25 * 60, color: "#4f8ef7" },
  short:  { label: "Short break", secs:  5 * 60, color: "#34d399" },
  long:   { label: "Long break",  secs: 15 * 60, color: "#a78bfa" },
} as const;
type Mode = keyof typeof MODES;

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n: number) { return n.toString().padStart(2, "0"); }

function fmtTimer(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000)  / 60000),
    s: Math.floor((ms % 60000)    / 1000),
  };
}

function CircleProgress({ pct, size, stroke, color }: { pct: number; size: number; stroke: number; color: string }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, pct)))}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

interface Course { id: string; name: string; exam_date: string | null; }

// ── Component ─────────────────────────────────────────────────────────────────
export default function TimerWidget() {
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState<"focus" | "exam">("focus");

  // Pomodoro
  const [mode, setMode]         = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODES.focus.secs);
  const [running, setRunning]   = useState(false);
  const [rounds, setRounds]     = useState(0);   // completed focus rounds
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSecs               = MODES[mode].secs;

  // Exam countdown
  const [courses, setCourses]   = useState<Course[]>([]);
  const [now, setNow]           = useState(Date.now());

  // ── Pomodoro tick ──
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            // cycle: after focus, suggest break
            setRounds(r => {
              const next = mode === "focus" ? r + 1 : r;
              if (mode === "focus") {
                const breakMode = next % 4 === 0 ? "long" : "short";
                setMode(breakMode);
                setTimeLeft(MODES[breakMode].secs);
              } else {
                setMode("focus");
                setTimeLeft(MODES.focus.secs);
              }
              return next;
            });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode]);

  function switchMode(m: Mode) {
    setRunning(false);
    setMode(m);
    setTimeLeft(MODES[m].secs);
  }

  function reset() { setRunning(false); setTimeLeft(MODES[mode].secs); }

  // ── Exam countdown tick (every second) ──
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch courses for exam tab ──
  useEffect(() => {
    if (!open || tab !== "exam") return;
    fetch("/api/courses")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.courses)) setCourses(d.courses); })
      .catch(() => {});
  }, [open, tab]);

  const upcoming = courses
    .filter(c => c.exam_date)
    .map(c => ({ ...c, ms: new Date(c.exam_date!).getTime() - now }))
    .filter(c => c.ms > 0)
    .sort((a, b) => a.ms - b.ms);

  const nextExam = upcoming[0] ?? null;

  const cfg = MODES[mode];
  const pct = timeLeft / totalSecs;

  return (
    <>
      {/* ── Collapsed pill ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="pill"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setOpen(true)}
            title="Study timer"
            style={{
              position: "fixed", bottom: "20px", right: "20px",
              zIndex: 9000,
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 14px 8px 10px",
              borderRadius: "99px",
              background: "rgba(20,22,36,0.92)",
              border: "1px solid rgba(79,142,247,0.25)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              cursor: "pointer", color: "#fff",
              fontSize: "12px", fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={running ? cfg.color : "rgba(255,255,255,0.5)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ color: running ? cfg.color : "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>
              {running ? fmtTimer(timeLeft) : "Timer"}
            </span>
            {nextExam && (
              <>
                <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.12)" }} />
                <span style={{ color: nextExam.ms < 86400000 * 2 ? "#f87171" : "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>
                  {fmtCountdown(nextExam.ms).d}d {pad(fmtCountdown(nextExam.ms).h)}h
                </span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Expanded card ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed", bottom: "20px", right: "20px",
              zIndex: 9000,
              width: "280px",
              background: "rgba(16,18,30,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
              backdropFilter: "blur(16px)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px 0",
            }}>
              {/* Tab switcher */}
              <div style={{
                display: "flex", gap: "2px", padding: "2px",
                background: "rgba(255,255,255,0.05)", borderRadius: "8px",
              }}>
                {(["focus", "exam"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: tab === t ? "rgba(255,255,255,0.1)" : "transparent",
                    color: tab === t ? "#fff" : "rgba(255,255,255,0.35)",
                  }}>
                    {t === "focus" ? "Timer" : "Exam"}
                  </button>
                ))}
              </div>

              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.3)", padding: "4px",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* ── Focus tab ── */}
            <AnimatePresence mode="wait">
              {tab === "focus" && (
                <motion.div key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>

                  {/* Mode selector */}
                  <div style={{ display: "flex", gap: "4px", padding: "12px 16px 0" }}>
                    {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([k, v]) => (
                      <button key={k} onClick={() => switchMode(k)} style={{
                        flex: 1, padding: "4px 0", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
                        border: `1px solid ${mode === k ? v.color + "55" : "rgba(255,255,255,0.07)"}`,
                        background: mode === k ? v.color + "18" : "transparent",
                        color: mode === k ? v.color : "rgba(255,255,255,0.3)",
                        cursor: "pointer", transition: "all 0.15s",
                      }}>
                        {v.label}
                      </button>
                    ))}
                  </div>

                  {/* Circle + time */}
                  <div style={{ position: "relative", width: "120px", height: "120px", margin: "18px auto 0" }}>
                    <CircleProgress pct={pct} size={120} stroke={6} color={cfg.color} />
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: "26px", fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                        {fmtTimer(timeLeft)}
                      </span>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Rounds */}
                  <div style={{ display: "flex", justifyContent: "center", gap: "5px", marginTop: "10px" }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{
                        width: "7px", height: "7px", borderRadius: "50%",
                        background: i < (rounds % 4) ? cfg.color : "rgba(255,255,255,0.08)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginLeft: "4px" }}>
                      {rounds} done
                    </span>
                  </div>

                  {/* Controls */}
                  <div style={{ display: "flex", gap: "8px", padding: "14px 16px 16px" }}>
                    <button onClick={reset} style={{
                      flex: 0, padding: "8px 12px", borderRadius: "8px", fontSize: "12px",
                      border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.4)", cursor: "pointer",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.93"/>
                      </svg>
                    </button>
                    <button onClick={() => setRunning(r => !r)} style={{
                      flex: 1, padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: 700,
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                      background: running
                        ? "rgba(255,255,255,0.08)"
                        : `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
                      color: running ? "rgba(255,255,255,0.6)" : "#fff",
                      boxShadow: running ? "none" : `0 2px 12px ${cfg.color}44`,
                    }}>
                      {running ? "Pause" : "Start"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Exam tab ── */}
              {tab === "exam" && (
                <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <div style={{ padding: "14px 16px 16px" }}>
                    {upcoming.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "24px 0" }}>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                          No upcoming exams.<br/>Set an exam date in your course.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {upcoming.slice(0, 3).map((c, i) => {
                          const { d, h, m, s } = fmtCountdown(c.ms);
                          const urgent = d < 3;
                          const color  = d <= 1 ? "#f87171" : d <= 7 ? "#fbbf24" : "#34d399";
                          return (
                            <div key={c.id} style={{
                              borderRadius: "10px", padding: "12px 14px",
                              background: i === 0 ? "rgba(255,255,255,0.04)" : "transparent",
                              border: `1px solid ${i === 0 ? "rgba(255,255,255,0.08)" : "transparent"}`,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                                  {c.name}
                                </span>
                                {urgent && (
                                  <span style={{ fontSize: "9px", fontWeight: 700, color, background: color + "18", border: `1px solid ${color}44`, borderRadius: "5px", padding: "2px 6px" }}>
                                    SOON
                                  </span>
                                )}
                              </div>

                              {/* Full countdown */}
                              <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
                                {[
                                  { n: d,  label: "days"  },
                                  { n: h,  label: "hrs"   },
                                  { n: m,  label: "min"   },
                                  { n: s,  label: "sec"   },
                                ].map(({ n, label }) => (
                                  <div key={label} style={{ textAlign: "center", minWidth: "36px" }}>
                                    <div style={{
                                      fontSize: label === "days" ? "28px" : "20px",
                                      fontWeight: 800, color,
                                      fontVariantNumeric: "tabular-nums",
                                      letterSpacing: "-0.02em", lineHeight: 1,
                                    }}>
                                      {pad(n)}
                                    </div>
                                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", marginTop: "2px" }}>
                                      {label}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
