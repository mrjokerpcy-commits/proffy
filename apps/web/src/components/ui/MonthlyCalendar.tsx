"use client";
import { useState, useEffect, useRef } from "react";
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

interface CalEvent {
  id: string;
  date: string;
  title: string;
  type: "goal" | "task" | "note" | "reminder";
  done: boolean;
}

const SLOT_COLOR: Record<string, string> = {
  lecture:  "#4f8ef7",
  tutorial: "#34d399",
  lab:      "#a78bfa",
  other:    "#fbbf24",
};

const EVENT_COLOR: Record<string, string> = {
  goal:     "#f59e0b",
  task:     "#4f8ef7",
  note:     "#a78bfa",
  reminder: "#f87171",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

interface Props {
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export default function MonthlyCalendar({ isOpen, onOpenChange }: Props) {
  const controlled = isOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ? isOpen! : internalOpen;
  function setOpen(v: boolean) { controlled ? onOpenChange?.(v) : setInternalOpen(v); }

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [loaded, setLoaded] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"goal" | "task" | "note" | "reminder">("task");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    Promise.all([
      fetch("/api/schedule").then(r => r.json()).catch(() => ({ slots: [] })),
      fetch("/api/courses").then(r => r.json()).catch(() => ({ courses: [] })),
      fetchEvents(),
    ]).then(([sd, cd]) => {
      if (sd.slots) setSlots(sd.slots);
      if (cd.courses) setCourses(cd.courses);
      setLoaded(true);
    });
  }, [open]);

  async function fetchEvents() {
    const from = fmtDate(viewYear, viewMonth, 1);
    const to = fmtDate(viewYear, viewMonth, getDaysInMonth(viewYear, viewMonth));
    const res = await fetch(`/api/calendar-events?from=${from}&to=${to}`).catch(() => null);
    if (!res) return;
    const d = await res.json().catch(() => ({}));
    if (d.events) setEvents(d.events);
  }

  async function loadEventsForMonth(y: number, m: number) {
    const from = fmtDate(y, m, 1);
    const to = fmtDate(y, m, getDaysInMonth(y, m));
    const res = await fetch(`/api/calendar-events?from=${from}&to=${to}`).catch(() => null);
    if (!res) return;
    const d = await res.json().catch(() => ({}));
    if (d.events) setEvents(d.events);
  }

  function prevMonth() {
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const newYear  = viewMonth === 0 ? viewYear - 1 : viewYear;
    setViewYear(newYear); setViewMonth(newMonth);
    setSelectedDay(null);
    loadEventsForMonth(newYear, newMonth);
  }
  function nextMonth() {
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const newYear  = viewMonth === 11 ? viewYear + 1 : viewYear;
    setViewYear(newYear); setViewMonth(newMonth);
    setSelectedDay(null);
    loadEventsForMonth(newYear, newMonth);
  }

  async function addEvent() {
    if (!newTitle.trim() || selectedDay === null || adding) return;
    setAdding(true);
    const date = fmtDate(viewYear, viewMonth, selectedDay);
    const res = await fetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, title: newTitle.trim(), type: newType }),
    });
    const d = await res.json();
    if (d.event) setEvents(prev => [...prev, d.event]);
    setNewTitle("");
    setAdding(false);
    inputRef.current?.focus();
  }

  async function toggleEvent(id: string, done: boolean) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, done } : e));
    await fetch(`/api/calendar-events?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
  }

  async function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
    await fetch(`/api/calendar-events?id=${id}`, { method: "DELETE" });
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function getSlotsForDay(day: number): Slot[] {
    const dow = new Date(viewYear, viewMonth, day).getDay();
    return slots.filter(s => s.day_of_week === dow);
  }
  function getExamsForDay(day: number): Course[] {
    const dateStr = fmtDate(viewYear, viewMonth, day);
    return courses.filter(c => c.exam_date && c.exam_date.startsWith(dateStr));
  }
  function getEventsForDay(day: number): CalEvent[] {
    const dateStr = fmtDate(viewYear, viewMonth, day);
    return events.filter(e => e.date === dateStr);
  }

  const isToday = (d: number) =>
    d === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  const selSlots  = selectedDay ? getSlotsForDay(selectedDay) : [];
  const selExams  = selectedDay ? getExamsForDay(selectedDay) : [];
  const selEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selDate   = selectedDay ? new Date(viewYear, viewMonth, selectedDay) : null;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 800,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: "860px", height: "min(90vh, 640px)",
            background: "rgba(12,14,26,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
            backdropFilter: "blur(20px)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={prevMonth} style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#fff", minWidth: "180px", textAlign: "center", letterSpacing: "-0.02em" }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Legend */}
              <div style={{ display: "flex", gap: "10px" }}>
                {[["#f87171","Exam"],["#4f8ef7","Lecture"],["#34d399","Tutorial"],["#f59e0b","Goal"],["#a78bfa","Task"]].map(([c,l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: c }} />
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{l}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setOpen(false)} style={{ ...navBtn, marginLeft: "4px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Body: calendar + day panel */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Month grid */}
            <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", minWidth: 0 }}>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: "4px" }}>
                {DAY_NAMES.map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.28)", padding: "4px 0", letterSpacing: "0.05em" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px", alignContent: "start" }}>
                {cells.map((day, i) => {
                  if (!day) return <div key={`e${i}`} />;
                  const daySlots  = getSlotsForDay(day);
                  const dayExams  = getExamsForDay(day);
                  const dayEvents = getEventsForDay(day);
                  const today     = isToday(day);
                  const selected  = selectedDay === day;
                  const hasSomething = daySlots.length > 0 || dayExams.length > 0 || dayEvents.length > 0;
                  return (
                    <div
                      key={`d${day}`}
                      onClick={() => setSelectedDay(day)}
                      style={{
                        borderRadius: "8px", padding: "4px 3px",
                        background: selected
                          ? "rgba(79,142,247,0.2)"
                          : today
                          ? "rgba(79,142,247,0.1)"
                          : "rgba(255,255,255,0.02)",
                        border: selected
                          ? "1px solid rgba(79,142,247,0.6)"
                          : today
                          ? "1px solid rgba(79,142,247,0.3)"
                          : "1px solid transparent",
                        cursor: "pointer",
                        minHeight: "52px",
                        transition: "all 0.12s",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                      }}
                      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = today ? "rgba(79,142,247,0.1)" : "rgba(255,255,255,0.02)"; }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: today || selected ? 800 : 500, color: selected ? "#4f8ef7" : today ? "#60a5fa" : "rgba(255,255,255,0.65)" }}>
                        {day}
                      </span>
                      {/* Dots */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", justifyContent: "center" }}>
                        {dayExams.slice(0,1).map((_, si) => <div key={`ex${si}`} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f87171" }} />)}
                        {daySlots.slice(0,2).map((s, si) => <div key={`sl${si}`} style={{ width: "5px", height: "5px", borderRadius: "50%", background: SLOT_COLOR[s.slot_type] ?? "#fff" }} />)}
                        {dayEvents.slice(0,2).map((ev, ei) => <div key={`ev${ei}`} style={{ width: "5px", height: "5px", borderRadius: "50%", background: EVENT_COLOR[ev.type] ?? "#fff", opacity: ev.done ? 0.3 : 1 }} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day detail panel */}
            <div style={{
              width: "280px", flexShrink: 0,
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              {selectedDay === null ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: "8px", padding: "20px" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>Click a day to see your schedule and add goals</span>
                </div>
              ) : (
                <>
                  {/* Day header */}
                  <div style={{ padding: "14px 16px 10px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#fff" }}>
                      {selDate?.toLocaleDateString("en-IL", { weekday: "long" })}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                      {selDate?.toLocaleDateString("en-IL", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>

                  {/* Scrollable content */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {/* Exams */}
                    {selExams.map(c => (
                      <div key={c.id} style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>EXAM</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{c.name}</div>
                        {c.course_number && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>#{c.course_number}</div>}
                      </div>
                    ))}

                    {/* Schedule slots */}
                    {selSlots.map(s => (
                      <div key={s.id} style={{ padding: "8px 10px", borderRadius: "8px", background: `${SLOT_COLOR[s.slot_type] ?? "#fff"}18`, border: `1px solid ${SLOT_COLOR[s.slot_type] ?? "#fff"}35` }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: SLOT_COLOR[s.slot_type], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{s.slot_type}</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{s.course_name ?? s.slot_type}</div>
                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                          {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}{s.room ? ` · ${s.room}` : ""}
                        </div>
                      </div>
                    ))}

                    {/* User goals/tasks */}
                    {selEvents.map(ev => (
                      <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "7px 10px", borderRadius: "8px", background: `${EVENT_COLOR[ev.type]}12`, border: `1px solid ${EVENT_COLOR[ev.type]}30` }}>
                        <input
                          type="checkbox"
                          checked={ev.done}
                          onChange={e => toggleEvent(ev.id, e.target.checked)}
                          style={{ marginTop: "2px", cursor: "pointer", accentColor: EVENT_COLOR[ev.type] }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: EVENT_COLOR[ev.type], textTransform: "uppercase", letterSpacing: "0.06em" }}>{ev.type}</div>
                          <div style={{ fontSize: "13px", color: "#fff", textDecoration: ev.done ? "line-through" : "none", opacity: ev.done ? 0.5 : 1 }}>{ev.title}</div>
                        </div>
                        <button onClick={() => deleteEvent(ev.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: "2px", flexShrink: 0, transition: "color 0.1s" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}

                    {selExams.length === 0 && selSlots.length === 0 && selEvents.length === 0 && (
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "16px 0" }}>Nothing scheduled</div>
                    )}
                  </div>

                  {/* Add item form */}
                  <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {(["task","goal","note","reminder"] as const).map(t => (
                        <button key={t} onClick={() => setNewType(t)} style={{
                          flex: 1, padding: "4px 2px", borderRadius: "6px", fontSize: "9px", fontWeight: 700,
                          border: `1px solid ${newType === t ? EVENT_COLOR[t] + "66" : "rgba(255,255,255,0.08)"}`,
                          background: newType === t ? EVENT_COLOR[t] + "18" : "transparent",
                          color: newType === t ? EVENT_COLOR[t] : "rgba(255,255,255,0.3)",
                          cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em",
                          transition: "all 0.1s",
                        }}>{t}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        ref={inputRef}
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addEvent(); }}
                        placeholder={`Add ${newType}...`}
                        style={{
                          flex: 1, padding: "7px 10px", borderRadius: "7px",
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff", fontSize: "12px", outline: "none", fontFamily: "inherit",
                        }}
                      />
                      <button
                        onClick={addEvent}
                        disabled={!newTitle.trim() || adding}
                        style={{
                          padding: "7px 12px", borderRadius: "7px", border: "none",
                          background: newTitle.trim() ? EVENT_COLOR[newType] : "rgba(255,255,255,0.08)",
                          color: newTitle.trim() ? "#fff" : "rgba(255,255,255,0.25)",
                          cursor: newTitle.trim() ? "pointer" : "not-allowed",
                          fontSize: "13px", fontWeight: 700, transition: "all 0.15s",
                        }}
                      >+</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const navBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "7px", cursor: "pointer", color: "rgba(255,255,255,0.55)",
  padding: "6px 8px", display: "flex", alignItems: "center", transition: "all 0.15s",
};
