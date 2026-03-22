"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n: number) { return n.toString().padStart(2, "0"); }

function fmtTimer(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(sec)}`
    : `${pad(m)}:${pad(sec)}`;
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
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

// ── Presets ───────────────────────────────────────────────────────────────────
const POMODORO_PRESETS = [
  { label: "25m", secs: 25 * 60, color: "#4f8ef7" },
  { label: "5m",  secs:  5 * 60, color: "#34d399" },
  { label: "15m", secs: 15 * 60, color: "#a78bfa" },
];

const EXAM_PRESETS = [
  { label: "1h",   secs:  1 * 3600 },
  { label: "1.5h", secs:  Math.round(1.5 * 3600) },
  { label: "2h",   secs:  2 * 3600 },
  { label: "3h",   secs:  3 * 3600 },
];

interface Course { id: string; name: string; exam_date: string | null; }

// ── Component ─────────────────────────────────────────────────────────────────
interface TimerWidgetProps {
  /** If provided, open state is controlled externally */
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export default function TimerWidget({ isOpen, onOpenChange }: TimerWidgetProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = isOpen !== undefined;
  const open = controlled ? isOpen : internalOpen;
  function setOpen(v: boolean) { controlled ? onOpenChange?.(v) : setInternalOpen(v); }
  const [tab, setTab]           = useState<"timer" | "exam">("timer");
  const [timerMode, setTimerMode] = useState<"pomodoro" | "session">("pomodoro");

  // Shared timer state
  const [totalSecs, setTotalSecs]   = useState(25 * 60);
  const [timeLeft, setTimeLeft]     = useState(25 * 60);
  const [running, setRunning]       = useState(false);
  const [color, setColor]           = useState("#4f8ef7");
  const [rounds, setRounds]         = useState(0);
  const [pomodoroIdx, setPomodoroIdx] = useState(0); // which pomodoro preset is active
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Custom session input
  const [customH, setCustomH] = useState("3");
  const [customM, setCustomM] = useState("00");
  const [customEditing, setCustomEditing] = useState(false);

  // Exam countdown
  const [courses, setCourses]   = useState<Course[]>([]);
  const [now, setNow]           = useState(Date.now());

  // ── Timer tick ──
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            if (timerMode === "pomodoro") {
              // cycle to next pomodoro preset
              const nextIdx = (pomodoroIdx + 1) % POMODORO_PRESETS.length;
              if (pomodoroIdx === 0) setRounds(r => r + 1); // completed a focus round
              setPomodoroIdx(nextIdx);
              setTotalSecs(POMODORO_PRESETS[nextIdx].secs);
              setTimeLeft(POMODORO_PRESETS[nextIdx].secs);
              setColor(POMODORO_PRESETS[nextIdx].color);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, timerMode, pomodoroIdx]);

  function selectPomodoro(idx: number) {
    setRunning(false);
    setPomodoroIdx(idx);
    setTotalSecs(POMODORO_PRESETS[idx].secs);
    setTimeLeft(POMODORO_PRESETS[idx].secs);
    setColor(POMODORO_PRESETS[idx].color);
    setTimerMode("pomodoro");
  }

  function selectExamPreset(secs: number) {
    setRunning(false);
    setTotalSecs(secs);
    setTimeLeft(secs);
    setColor("#f59e0b");
    setTimerMode("session");
  }

  function applyCustom() {
    const h = Math.max(0, Math.min(12, parseInt(customH) || 0));
    const m = Math.max(0, Math.min(59, parseInt(customM) || 0));
    const secs = h * 3600 + m * 60;
    if (secs <= 0) return;
    setRunning(false);
    setTotalSecs(secs);
    setTimeLeft(secs);
    setColor("#f59e0b");
    setTimerMode("session");
    setCustomEditing(false);
  }

  function reset() { setRunning(false); setTimeLeft(totalSecs); }

  // ── Exam countdown tick ──
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
  const pct = totalSecs > 0 ? timeLeft / totalSecs : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
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
              position: "fixed", bottom: "80px", left: "268px", zIndex: 9000,
              width: "292px",
              background: "rgba(14,16,28,0.97)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "18px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              backdropFilter: "blur(18px)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 0" }}>
              <div style={{ display: "flex", gap: "2px", padding: "2px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                {(["timer", "exam"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: "4px 14px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: tab === t ? "rgba(255,255,255,0.1)" : "transparent",
                    color: tab === t ? "#fff" : "rgba(255,255,255,0.3)",
                  }}>
                    {t === "timer" ? "Timer" : "Exam"}
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

            <AnimatePresence mode="wait">

              {/* ════════ TIMER TAB ════════ */}
              {tab === "timer" && (
                <motion.div key="timer-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>

                  {/* Sub-mode tabs */}
                  <div style={{ display: "flex", gap: "6px", padding: "12px 16px 0" }}>
                    <button onClick={() => { setTimerMode("pomodoro"); selectPomodoro(0); }} style={{
                      flex: 1, padding: "5px 0", borderRadius: "7px", fontSize: "11px", fontWeight: 600,
                      border: `1px solid ${timerMode === "pomodoro" ? "rgba(79,142,247,0.4)" : "rgba(255,255,255,0.07)"}`,
                      background: timerMode === "pomodoro" ? "rgba(79,142,247,0.12)" : "transparent",
                      color: timerMode === "pomodoro" ? "#4f8ef7" : "rgba(255,255,255,0.3)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      Pomodoro
                    </button>
                    <button onClick={() => { selectExamPreset(3 * 3600); setTimerMode("session"); }} style={{
                      flex: 1, padding: "5px 0", borderRadius: "7px", fontSize: "11px", fontWeight: 600,
                      border: `1px solid ${timerMode === "session" ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.07)"}`,
                      background: timerMode === "session" ? "rgba(245,158,11,0.1)" : "transparent",
                      color: timerMode === "session" ? "#f59e0b" : "rgba(255,255,255,0.3)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      Session
                    </button>
                  </div>

                  {/* Pomodoro presets */}
                  {timerMode === "pomodoro" && (
                    <div style={{ display: "flex", gap: "4px", padding: "10px 16px 0" }}>
                      {POMODORO_PRESETS.map((p, i) => (
                        <button key={p.label} onClick={() => selectPomodoro(i)} style={{
                          flex: 1, padding: "4px 0", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
                          border: `1px solid ${pomodoroIdx === i ? p.color + "55" : "rgba(255,255,255,0.07)"}`,
                          background: pomodoroIdx === i ? p.color + "18" : "transparent",
                          color: pomodoroIdx === i ? p.color : "rgba(255,255,255,0.3)",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Session presets + custom */}
                  {timerMode === "session" && (
                    <div style={{ padding: "10px 16px 0" }}>
                      <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                        {EXAM_PRESETS.map(p => (
                          <button key={p.label} onClick={() => selectExamPreset(p.secs)} style={{
                            flex: 1, padding: "4px 0", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
                            border: `1px solid ${totalSecs === p.secs ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.07)"}`,
                            background: totalSecs === p.secs ? "rgba(245,158,11,0.12)" : "transparent",
                            color: totalSecs === p.secs ? "#f59e0b" : "rgba(255,255,255,0.3)",
                            cursor: "pointer", transition: "all 0.15s",
                          }}>
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom input */}
                      {customEditing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="number" min="0" max="12" value={customH}
                            onChange={e => setCustomH(e.target.value)}
                            style={{ width: "48px", padding: "5px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "13px", fontWeight: 700, textAlign: "center", outline: "none" }}
                          />
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>h</span>
                          <input
                            type="number" min="0" max="59" value={customM}
                            onChange={e => setCustomM(e.target.value)}
                            style={{ width: "48px", padding: "5px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "13px", fontWeight: 700, textAlign: "center", outline: "none" }}
                          />
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>m</span>
                          <button onClick={applyCustom} style={{
                            flex: 1, padding: "5px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                            background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.3)",
                            color: "#f59e0b", cursor: "pointer",
                          }}>Set</button>
                        </div>
                      ) : (
                        <button onClick={() => setCustomEditing(true)} style={{
                          width: "100%", padding: "4px 0", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
                          border: "1px solid rgba(255,255,255,0.07)", background: "transparent",
                          color: "rgba(255,255,255,0.3)", cursor: "pointer",
                        }}>
                          Custom…
                        </button>
                      )}
                    </div>
                  )}

                  {/* Circle + time */}
                  <div style={{ position: "relative", width: "128px", height: "128px", margin: "16px auto 0" }}>
                    <CircleProgress pct={pct} size={128} stroke={6} color={color} />
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{
                        fontSize: totalSecs >= 3600 ? "22px" : "26px",
                        fontWeight: 800, color: "#fff",
                        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
                      }}>
                        {fmtTimer(timeLeft)}
                      </span>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", marginTop: "2px" }}>
                        {timerMode === "pomodoro" ? POMODORO_PRESETS[pomodoroIdx].label.replace("m","") + " min" : `${(totalSecs/3600).toFixed(1).replace(".0","")}h session`}
                      </span>
                    </div>
                  </div>

                  {/* Round dots (pomodoro only) */}
                  {timerMode === "pomodoro" && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "5px", marginTop: "8px" }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} style={{
                          width: "7px", height: "7px", borderRadius: "50%",
                          background: i < (rounds % 4) ? "#4f8ef7" : "rgba(255,255,255,0.08)",
                          transition: "background 0.2s",
                        }} />
                      ))}
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginLeft: "4px" }}>
                        {rounds} done
                      </span>
                    </div>
                  )}

                  {/* Controls */}
                  <div style={{ display: "flex", gap: "8px", padding: "14px 16px 16px" }}>
                    <button onClick={reset} style={{
                      padding: "9px 12px", borderRadius: "9px",
                      border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.35)", cursor: "pointer",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.93"/>
                      </svg>
                    </button>
                    <button onClick={() => setRunning(r => !r)} style={{
                      flex: 1, padding: "9px", borderRadius: "9px", fontSize: "13px", fontWeight: 700,
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                      background: running ? "rgba(255,255,255,0.07)" : `linear-gradient(135deg, ${color}, ${color}bb)`,
                      color: running ? "rgba(255,255,255,0.55)" : "#fff",
                      boxShadow: running ? "none" : `0 2px 14px ${color}44`,
                    }}>
                      {running ? "Pause" : timeLeft === totalSecs ? "Start" : "Resume"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ════════ EXAM TAB ════════ */}
              {tab === "exam" && (
                <motion.div key="exam-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                  <div style={{ padding: "14px 16px 16px" }}>
                    {upcoming.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "24px 0" }}>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                          No upcoming exams.<br/>Set an exam date in your course.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {upcoming.slice(0, 3).map((c, i) => {
                          const { d, h, m, s } = fmtCountdown(c.ms);
                          const col = d <= 1 ? "#f87171" : d <= 7 ? "#fbbf24" : "#34d399";
                          return (
                            <div key={c.id} style={{
                              borderRadius: "10px", padding: "12px 14px",
                              background: i === 0 ? "rgba(255,255,255,0.04)" : "transparent",
                              border: `1px solid ${i === 0 ? "rgba(255,255,255,0.07)" : "transparent"}`,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                                  {c.name}
                                </span>
                                {d < 3 && (
                                  <span style={{ fontSize: "9px", fontWeight: 700, color: col, background: col + "18", border: `1px solid ${col}44`, borderRadius: "5px", padding: "2px 6px" }}>
                                    SOON
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: "4px", alignItems: "flex-end" }}>
                                {[{ n: d, label: "days" }, { n: h, label: "hrs" }, { n: m, label: "min" }, { n: s, label: "sec" }].map(({ n, label }) => (
                                  <div key={label} style={{ textAlign: "center", flex: 1 }}>
                                    <div style={{
                                      fontSize: label === "days" ? "26px" : "18px",
                                      fontWeight: 800, color: col,
                                      fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1,
                                    }}>
                                      {pad(n)}
                                    </div>
                                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", marginTop: "3px" }}>{label}</div>
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
