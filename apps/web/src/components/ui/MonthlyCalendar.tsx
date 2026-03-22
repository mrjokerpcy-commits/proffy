"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Slot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_name: string | null;
  course_number: string | null;
  slot_type: string;
  room: string | null;
}

interface Course {
  id: string;
  name: string;
  exam_date: string | null;
  course_number: string | null;
}

const SLOT_COLOR: Record<string, string> = {
  lecture:  "#4f8ef7",
  tutorial: "#34d399",
  lab:      "#a78bfa",
  other:    "#fbbf24",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

interface DayPopup {
  date: Date;
  slots: Slot[];
  exams: Course[];
}

interface Props {
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export default function MonthlyCalendar({ isOpen, onOpenChange }: Props) {
  const controlled = isOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ? isOpen : internalOpen;
  function setOpen(v: boolean) { controlled ? onOpenChange?.(v) : setInternalOpen(v); }

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [popup, setPopup] = useState<DayPopup | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    Promise.all([
      fetch("/api/schedule").then(r => r.json()).catch(() => ({ slots: [] })),
      fetch("/api/courses").then(r => r.json()).catch(() => ({ courses: [] })),
    ]).then(([sd, cd]) => {
      if (sd.slots) setSlots(sd.slots);
      if (cd.courses) setCourses(cd.courses);
      setLoaded(true);
    });
  }, [open, loaded]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Build calendar cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Exam dates in this month
  const examsThisMonth = courses.filter(c => {
    if (!c.exam_date) return false;
    const d = new Date(c.exam_date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  function getSlotsForDay(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    const dow = date.getDay();
    return slots.filter(s => s.day_of_week === dow);
  }

  function getExamsForDay(day: number) {
    return examsThisMonth.filter(c => {
      const d = new Date(c.exam_date!);
      return d.getDate() === day;
    });
  }

  function openPopup(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    setPopup({ date, slots: getSlotsForDay(day), exams: getExamsForDay(day) });
  }

  const isToday = (day: number) =>
    day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  const cardStyle: React.CSSProperties = {
    position: "fixed", top: "58px", right: "20px", zIndex: 9001,
    width: "320px",
    background: "rgba(14,16,28,0.98)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "18px",
    boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
    backdropFilter: "blur(18px)",
    overflow: "hidden",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="calendar"
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={cardStyle}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px" }}>
            <button onClick={prevMonth} style={navBtn}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={nextMonth} style={navBtn}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button onClick={() => setOpen(false)} style={{ ...navBtn, marginLeft: "4px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "0 8px" }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.3)", padding: "2px 0", letterSpacing: "0.05em" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", padding: "4px 8px 10px" }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const daySlots = getSlotsForDay(day);
              const dayExams = getExamsForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={i}
                  onClick={() => (daySlots.length > 0 || dayExams.length > 0) ? openPopup(day) : undefined}
                  style={{
                    borderRadius: "6px", padding: "3px 2px",
                    background: today ? "rgba(79,142,247,0.2)" : "transparent",
                    border: today ? "1px solid rgba(79,142,247,0.4)" : "1px solid transparent",
                    cursor: (daySlots.length > 0 || dayExams.length > 0) ? "pointer" : "default",
                    minHeight: "32px",
                    transition: "all 0.1s",
                  }}
                  onMouseEnter={e => { if (daySlots.length > 0 || dayExams.length > 0) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = today ? "rgba(79,142,247,0.2)" : "transparent"; }}
                >
                  <div style={{ textAlign: "center", fontSize: "11px", fontWeight: today ? 800 : 500, color: today ? "#4f8ef7" : "rgba(255,255,255,0.6)" }}>
                    {day}
                  </div>
                  {/* Exam dot */}
                  {dayExams.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "2px", marginTop: "1px" }}>
                      <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f87171" }} />
                    </div>
                  )}
                  {/* Slot dots */}
                  {daySlots.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "1px", marginTop: dayExams.length ? "1px" : "2px", flexWrap: "wrap" }}>
                      {daySlots.slice(0, 3).map((s, si) => (
                        <div key={si} style={{ width: "4px", height: "4px", borderRadius: "50%", background: SLOT_COLOR[s.slot_type] ?? "#fff" }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "10px", padding: "6px 12px 10px", flexWrap: "wrap" }}>
            {[["#f87171","Exam"], ["#4f8ef7","Lecture"], ["#34d399","Tutorial"], ["#a78bfa","Lab"]].map(([col, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: col }} />
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Day popup */}
      {popup && (
        <motion.div
          key="day-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setPopup(null)}
          style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "320px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "16px", maxHeight: "60vh", overflowY: "auto" }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
              {popup.date.toLocaleDateString("en-IL", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            {popup.exams.map(c => (
              <div key={c.id} style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.05em" }}>EXAM</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{c.name}</div>
                {c.course_number && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>#{c.course_number}</div>}
              </div>
            ))}
            {popup.slots.map(s => (
              <div key={s.id} style={{ padding: "8px 10px", borderRadius: "8px", background: `${SLOT_COLOR[s.slot_type]}18`, border: `1px solid ${SLOT_COLOR[s.slot_type]}44`, marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: SLOT_COLOR[s.slot_type], textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.slot_type}</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{s.course_name ?? s.slot_type}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                  {s.room ? ` · ${s.room}` : ""}
                </div>
              </div>
            ))}
            {popup.slots.length === 0 && popup.exams.length === 0 && (
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Nothing scheduled</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const navBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "rgba(255,255,255,0.45)", padding: "4px",
  display: "flex", alignItems: "center",
};
