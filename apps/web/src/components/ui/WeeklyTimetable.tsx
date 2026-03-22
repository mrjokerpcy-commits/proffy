"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 29 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}); // 08:00 → 22:00 in 30min steps

const SLOT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  lecture:  { bg: "rgba(79,142,247,0.18)",  border: "rgba(79,142,247,0.5)",  text: "#4f8ef7" },
  tutorial: { bg: "rgba(52,211,153,0.15)",  border: "rgba(52,211,153,0.45)", text: "#34d399" },
  lab:      { bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.45)",text: "#a78bfa" },
  other:    { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.4)",  text: "#fbbf24" },
};

function timeToIndex(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h - 8) * 2 + (m >= 30 ? 1 : 0);
}

interface Slot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_name: string | null;
  course_number: string | null;
  slot_type: string;
  room: string | null;
  professor: string | null;
  notifications_enabled: boolean;
}

interface Course { id: string; name: string; course_number?: string; professor?: string; }

interface AddFormState {
  day: number;
  startIdx: number;
  course_name: string;
  course_number: string;
  slot_type: string;
  room: string;
  professor: string;
  duration: number; // in 30min slots
}

interface Props {
  compact?: boolean; // for onboarding: simplified view, no notifications toggle
  courses?: Course[]; // optional pre-fetched courses for autocomplete
}

export default function WeeklyTimetable({ compact = false, courses: propCourses }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>(propCourses ?? []);
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/schedule")
      .then(r => r.json())
      .then(d => { if (d.slots) setSlots(d.slots); })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (courses.length === 0) {
      fetch("/api/courses")
        .then(r => r.json())
        .then(d => { if (d.courses) setCourses(d.courses); })
        .catch(() => {});
    }
  }, []);

  async function addSlot() {
    if (!addForm) return;
    setSaving(true);
    const start = HOURS[addForm.startIdx];
    const endIdx = Math.min(HOURS.length - 1, addForm.startIdx + addForm.duration);
    const end = HOURS[endIdx];
    const matchedCourse = courses.find(c =>
      c.name === addForm.course_name ||
      (addForm.course_number && c.course_number === addForm.course_number)
    );
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_of_week: addForm.day,
        start_time: start,
        end_time: end,
        course_id: matchedCourse?.id ?? null,
        course_name: addForm.course_name || null,
        course_number: addForm.course_number || null,
        slot_type: addForm.slot_type,
        room: addForm.room || null,
        professor: addForm.professor || null,
      }),
    });
    const data = await res.json();
    if (data.slot) setSlots(prev => [...prev, data.slot]);
    setAddForm(null);
    setSaving(false);
  }

  async function deleteSlot(id: string) {
    await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
    setSlots(prev => prev.filter(s => s.id !== id));
    setHoveredSlotId(null);
  }

  // Close form on outside click
  useEffect(() => {
    if (!addForm) return;
    function handle(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) setAddForm(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [addForm]);

  const CELL_H = compact ? 22 : 28; // px per 30min slot
  const LABEL_W = compact ? 40 : 52;
  const gridH = HOURS.length * CELL_H;

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      {loading && (
        <div style={{ textAlign: "center", padding: "24px", fontSize: "12px", color: "var(--text-muted)" }}>
          Loading schedule...
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Day headers */}
          <div style={{ display: "flex", marginLeft: `${LABEL_W}px` }}>
            {DAYS.map(d => (
              <div key={d} style={{
                flex: 1, textAlign: "center",
                fontSize: compact ? "10px" : "11px", fontWeight: 700,
                color: "var(--text-muted)", padding: "4px 0",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div style={{ display: "flex" }}>
            {/* Hour labels */}
            <div style={{ width: `${LABEL_W}px`, flexShrink: 0, position: "relative", height: `${gridH}px` }}>
              {HOURS.map((h, i) => (
                i % 2 === 0 ? (
                  <div key={h} style={{
                    position: "absolute", top: `${i * CELL_H}px`, right: "6px",
                    fontSize: compact ? "8px" : "9px", color: "var(--text-disabled)",
                    fontVariantNumeric: "tabular-nums", lineHeight: 1,
                    transform: "translateY(-50%)",
                  }}>
                    {h}
                  </div>
                ) : null
              ))}
            </div>

            {/* Day columns */}
            {DAYS.map((dayLabel, dayIdx) => {
              const daySlots = slots.filter(s => s.day_of_week === dayIdx);
              return (
                <div key={dayLabel} style={{ flex: 1, position: "relative", height: `${gridH}px` }}>
                  {/* Hour grid lines */}
                  {HOURS.map((h, i) => (
                    <div
                      key={h}
                      onClick={() => setAddForm({
                        day: dayIdx, startIdx: i,
                        course_name: "", course_number: "",
                        slot_type: "lecture", room: "", professor: "", duration: 2,
                      })}
                      style={{
                        position: "absolute", top: `${i * CELL_H}px`, left: 0, right: 0, height: `${CELL_H}px`,
                        borderTop: i % 2 === 0 ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.03)",
                        borderLeft: "1px solid rgba(255,255,255,0.05)",
                        cursor: "cell",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    />
                  ))}

                  {/* Slots */}
                  {daySlots.map(slot => {
                    const startIdx = timeToIndex(slot.start_time);
                    const endIdx = timeToIndex(slot.end_time);
                    const span = Math.max(1, endIdx - startIdx);
                    const colors = SLOT_COLORS[slot.slot_type] ?? SLOT_COLORS.other;
                    return (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          position: "absolute",
                          top: `${startIdx * CELL_H + 1}px`,
                          left: "2px", right: "2px",
                          height: `${span * CELL_H - 2}px`,
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "5px",
                          overflow: "hidden",
                          zIndex: 1,
                          cursor: "pointer",
                          padding: "2px 4px",
                        }}
                        onMouseEnter={() => setHoveredSlotId(slot.id)}
                        onMouseLeave={() => setHoveredSlotId(null)}
                      >
                        <div style={{ fontSize: compact ? "8px" : "9px", fontWeight: 700, color: colors.text, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {slot.course_number ? `#${slot.course_number}` : slot.course_name ?? slot.slot_type}
                        </div>
                        {!compact && slot.course_name && slot.course_number && (
                          <div style={{ fontSize: "8px", color: colors.text, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {slot.course_name}
                          </div>
                        )}
                        {slot.room && span >= 3 && (
                          <div style={{ fontSize: "8px", color: "var(--text-muted)", marginTop: "1px" }}>{slot.room}</div>
                        )}
                        {/* Delete button on hover */}
                        {hoveredSlotId === slot.id && (
                          <button
                            onClick={e => { e.stopPropagation(); deleteSlot(slot.id); }}
                            style={{
                              position: "absolute", top: "2px", right: "2px",
                              background: "rgba(248,113,113,0.2)", border: "1px solid rgba(248,113,113,0.4)",
                              borderRadius: "4px", cursor: "pointer", padding: "1px 3px",
                              color: "#f87171", fontSize: "8px", lineHeight: 1, zIndex: 2,
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add slot form */}
      <AnimatePresence>
        {addForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 500,
              background: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
            }}
          >
            <motion.div
              ref={formRef}
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              style={{
                width: "100%", maxWidth: "380px",
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                Add {DAYS[addForm.day]} slot
              </div>

              {/* Course name + number */}
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder="Course name"
                  value={addForm.course_name}
                  onChange={e => setAddForm(f => f ? { ...f, course_name: e.target.value } : null)}
                  list="timetable-courses"
                  style={inputStyle}
                />
                <datalist id="timetable-courses">
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </datalist>
                <input
                  placeholder="#Course #"
                  value={addForm.course_number}
                  onChange={e => setAddForm(f => f ? { ...f, course_number: e.target.value } : null)}
                  style={{ ...inputStyle, width: "90px", flexShrink: 0 }}
                />
              </div>

              {/* Type + Duration */}
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={addForm.slot_type}
                  onChange={e => setAddForm(f => f ? { ...f, slot_type: e.target.value } : null)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="lecture">Lecture</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="lab">Lab</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={addForm.duration}
                  onChange={e => setAddForm(f => f ? { ...f, duration: Number(e.target.value) } : null)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>{n * 0.5}h</option>
                  ))}
                </select>
              </div>

              {/* Start time */}
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={addForm.startIdx}
                  onChange={e => setAddForm(f => f ? { ...f, startIdx: Number(e.target.value) } : null)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  {HOURS.map((h, i) => <option key={h} value={i}>{h}</option>)}
                </select>
              </div>

              {/* Room + professor */}
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder="Room (optional)"
                  value={addForm.room}
                  onChange={e => setAddForm(f => f ? { ...f, room: e.target.value } : null)}
                  style={inputStyle}
                />
                <input
                  placeholder="Professor (optional)"
                  value={addForm.professor}
                  onChange={e => setAddForm(f => f ? { ...f, professor: e.target.value } : null)}
                  style={inputStyle}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setAddForm(null)} style={{
                  flex: 1, padding: "9px", borderRadius: "8px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", fontWeight: 600,
                }}>Cancel</button>
                <button onClick={addSlot} disabled={saving} style={{
                  flex: 2, padding: "9px", borderRadius: "8px",
                  background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", border: "none",
                  color: "#fff", cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "13px", fontWeight: 700, opacity: saving ? 0.7 : 1,
                }}>
                  {saving ? "Saving..." : "Add slot"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: "8px 10px", borderRadius: "8px",
  background: "var(--bg-elevated)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontSize: "13px", outline: "none",
  fontFamily: "inherit",
};
