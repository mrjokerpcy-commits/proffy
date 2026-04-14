"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Course } from "@/lib/types";

interface Note {
  id: string;
  title: string | null;
  content: string;
  note_type: string;
  created_at: string;
}

interface Props {
  courses: Course[];
  initialNotes: Note[];
  courseId: string | null;
  onCourseChange?: (courseId: string) => void;
}

const NOTE_TYPES = [
  { value: "all",       label: "All",         icon: "📋", color: "var(--text-muted)" },
  { value: "note",      label: "Note",        icon: "📝", color: "var(--text-secondary)" },
  { value: "trick",     label: "Trick",       icon: "💡", color: "var(--amber)" },
  { value: "prof_said", label: "Prof. said",  icon: "🎓", color: "var(--blue)" },
  { value: "formula",   label: "Formula",     icon: "⚡", color: "var(--purple)" },
];

const TYPE_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  note:      { icon: "📝", color: "var(--text-secondary)", bg: "var(--bg-elevated)",       border: "var(--border)" },
  trick:     { icon: "💡", color: "var(--amber)",          bg: "rgba(251,191,36,0.06)",    border: "rgba(251,191,36,0.2)" },
  prof_said: { icon: "🎓", color: "var(--blue)",           bg: "rgba(79,142,247,0.06)",    border: "rgba(79,142,247,0.2)" },
  formula:   { icon: "⚡", color: "var(--purple)",         bg: "rgba(167,139,250,0.06)",   border: "rgba(167,139,250,0.2)" },
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotesClient({ courses, initialNotes, courseId, onCourseChange }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);
  const [filter, setFilter] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState(courseId ?? courses[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", note_type: "note" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = filter === "all" ? notes : notes.filter(n => n.note_type === filter);

  async function addNote() {
    if (!form.content.trim() || !selectedCourse) return;
    setSaving(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: selectedCourse, ...form }),
    });
    const data = await res.json();
    if (data.note) {
      setNotes(prev => [data.note, ...prev]);
      setForm({ title: "", content: "", note_type: "note" });
      setAdding(false);
    }
    setSaving(false);
  }

  async function deleteNote(id: string) {
    setDeletingId(id);
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    setNotes(prev => prev.filter(n => n.id !== id));
    setDeletingId(null);
  }

  function changeCourse(id: string) {
    setSelectedCourse(id);
    if (onCourseChange) {
      onCourseChange(id);
    } else {
      router.push(`/notes?courseId=${id}`);
    }
  }

  const activeCourse = courses.find(c => c.id === selectedCourse);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: "1px solid var(--border)", background: "var(--bg-elevated)",
    color: "var(--text-primary)", fontSize: "14px", outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1.5rem", height: "56px",
        borderBottom: "1px solid var(--border)", background: "var(--bg-surface)",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <h1 style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
            Course Notes
          </h1>
          <select
            value={selectedCourse}
            onChange={e => changeCourse(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-secondary)", fontSize: "13px", maxWidth: "200px" }}
          >
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <button
          onClick={() => setAdding(true)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 14px", borderRadius: "7px", border: "none",
            background: "var(--blue)", color: "#fff", fontSize: "13px", fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          + Add note
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>

        {/* ── Filter tabs ── */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {NOTE_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "5px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: 500,
                border: `1px solid ${filter === t.value ? "rgba(79,142,247,0.4)" : "var(--border)"}`,
                background: filter === t.value ? "rgba(79,142,247,0.08)" : "transparent",
                color: filter === t.value ? "var(--blue)" : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              <span>{t.icon}</span> {t.label}
              {t.value !== "all" && notes.filter(n => n.note_type === t.value).length > 0 && (
                <span style={{ fontSize: "10px", background: "var(--bg-elevated)", padding: "0 5px", borderRadius: "99px" }}>
                  {notes.filter(n => n.note_type === t.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Add note form ── */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginBottom: "1.25rem", overflow: "hidden" }}
            >
              <div style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-light)",
                borderRadius: "10px", padding: "18px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                  {NOTE_TYPES.slice(1).map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, note_type: t.value }))}
                      style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        padding: "4px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 500,
                        border: `1px solid ${form.note_type === t.value ? TYPE_META[t.value].border : "var(--border)"}`,
                        background: form.note_type === t.value ? TYPE_META[t.value].bg : "transparent",
                        color: form.note_type === t.value ? TYPE_META[t.value].color : "var(--text-muted)",
                        cursor: "pointer",
                      }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <input
                  placeholder="Title (optional)"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: "8px", fontSize: "13px" }}
                />
                <textarea
                  placeholder={
                    form.note_type === "trick"     ? "What was the trick? e.g. For AVL rotation, remember: Left-Left = Right rotate, Left-Right = Left then Right..." :
                    form.note_type === "prof_said" ? "What did the professor say? e.g. Cohen always says: 'If you don't understand recursion, you don't understand CS'..." :
                    form.note_type === "formula"   ? "Write the formula or theorem..." :
                    "Write your note..."
                  }
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", justifyContent: "flex-end" }}>
                  <button onClick={() => setAdding(false)}
                    style={{ padding: "7px 14px", borderRadius: "7px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={addNote} disabled={!form.content.trim() || saving}
                    style={{
                      padding: "7px 16px", borderRadius: "7px", border: "none",
                      background: "var(--blue)", color: "#fff", fontSize: "13px", fontWeight: 600,
                      cursor: form.content.trim() ? "pointer" : "not-allowed",
                      opacity: saving ? 0.6 : 1,
                    }}>
                    {saving ? "Saving…" : "Save note"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Notes grid ── */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {filter === "trick" ? "💡" : filter === "prof_said" ? "🎓" : filter === "formula" ? "⚡" : "📝"}
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7 }}>
              {filter === "all"
                ? `No notes yet for ${activeCourse?.name ?? "this course"}.`
                : `No ${NOTE_TYPES.find(t => t.value === filter)?.label.toLowerCase()} notes yet.`}
              <br />Click <strong style={{ color: "var(--text-secondary)" }}>+ Add note</strong> to capture an insight.
            </p>
          </motion.div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            <AnimatePresence>
              {filtered.map((note, i) => {
                const meta = TYPE_META[note.note_type] ?? TYPE_META.note;
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      borderRadius: "10px", padding: "16px 18px",
                      background: meta.bg, border: `1px solid ${meta.border}`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                      position: "relative", display: "flex", flexDirection: "column", gap: "8px",
                    }}
                  >
                    {/* Type badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: meta.color, display: "flex", alignItems: "center", gap: "4px" }}>
                        {meta.icon} {NOTE_TYPES.find(t => t.value === note.note_type)?.label ?? "Note"}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{timeAgo(note.created_at)}</span>
                    </div>

                    {/* Title */}
                    {note.title && (
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
                        {note.title}
                      </p>
                    )}

                    {/* Content */}
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {note.content}
                    </p>

                    {/* Delete */}
                    <button
                      onClick={() => deleteNote(note.id)}
                      disabled={deletingId === note.id}
                      style={{
                        position: "absolute", top: "12px", right: "12px",
                        background: "none", border: "none", padding: "2px", cursor: "pointer",
                        color: "var(--text-muted)", opacity: 0, transition: "opacity 0.15s",
                      }}
                      className="note-delete-btn"
                      aria-label="Delete note"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
