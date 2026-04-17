"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FlashcardsClient from "@/app/flashcards/FlashcardsClient";
import NotesClient from "@/app/notes/NotesClient";
import type { Course } from "@/lib/types";

interface Props {
  type: "flashcards" | "notes";
  activeCourseId?: string;
  onClose: () => void;
}

const PANEL_META = {
  flashcards: {
    icon: "🃏",
    title: "Flashcards",
    gradient: "linear-gradient(135deg, #4f8ef7, #6366f1)",
    accentRgb: "79,142,247",
  },
  notes: {
    icon: "📝",
    title: "Course Notes",
    gradient: "linear-gradient(135deg, #fbbf24, #f97316)",
    accentRgb: "251,191,36",
  },
};

function Spinner({ color }: { color: string }) {
  return (
    <svg
      width="28" height="28"
      viewBox="0 0 28 28"
      style={{ animation: "panel-spin 0.75s linear infinite" }}
    >
      <style>{`@keyframes panel-spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="14" cy="14" r="11" fill="none" stroke={`rgba(${color},0.15)`} strokeWidth="2.5" />
      <path
        d="M14 3 A11 11 0 0 1 25 14"
        fill="none" stroke={`rgba(${color},0.9)`} strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PanelDrawer({ type, activeCourseId, onClose }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState(activeCourseId ?? "");
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const meta = PANEL_META[type];

  useEffect(() => {
    fetch("/api/courses")
      .then(r => r.json())
      .then(d => {
        const list: Course[] = d.courses ?? [];
        setCourses(list);
        if (list.length === 0) { setLoading(false); return; }
        const id = activeCourseId ?? list[0].id;
        setCourseId(id);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    if (type === "flashcards") {
      fetch(`/api/flashcards?courseId=${courseId}`)
        .then(r => r.json())
        .then(d => { setFlashcards(d.flashcards ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      fetch(`/api/notes?courseId=${courseId}`)
        .then(r => r.json())
        .then(d => { setNotes(d.notes ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [courseId, type]);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 40,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Drawer */}
      <motion.div
        key="drawer"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 38, mass: 0.85 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(600px, 100vw)",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          borderRadius: "20px 0 0 20px",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: `-24px 0 64px rgba(0,0,0,0.4), -1px 0 0 rgba(${meta.accentRgb},0.3)`,
        }}
      >
        {/* Accent top strip */}
        <div style={{ height: "3px", background: meta.gradient, flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: "12px",
          padding: "0 20px", height: "56px",
          borderBottom: "1px solid var(--border)",
          background: `linear-gradient(to right, rgba(${meta.accentRgb},0.07), transparent 60%)`,
        }}>
          {/* Icon badge */}
          <div style={{
            width: "34px", height: "34px", borderRadius: "9px",
            background: meta.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "17px", flexShrink: 0,
            boxShadow: `0 2px 10px rgba(${meta.accentRgb},0.35)`,
          }}>
            {meta.icon}
          </div>

          <span style={{
            flex: 1,
            fontWeight: 700, fontSize: "15px",
            color: "var(--text-primary)", letterSpacing: "-0.01em",
          }}>
            {meta.title}
          </span>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "32px", height: "32px", borderRadius: "8px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              cursor: "pointer", color: "var(--text-muted)",
              transition: "background 0.12s, color 0.12s",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `rgba(${meta.accentRgb},0.12)`;
              (e.currentTarget as HTMLButtonElement).style.color = `rgb(${meta.accentRgb})`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "14px",
          }}>
            <Spinner color={meta.accentRgb} />
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading…</span>
          </div>
        ) : courses.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "10px", padding: "40px 32px", textAlign: "center",
          }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "16px",
              background: `rgba(${meta.accentRgb},0.08)`,
              border: `1px solid rgba(${meta.accentRgb},0.2)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px", marginBottom: "4px",
            }}>
              📚
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
              No courses yet
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "260px" }}>
              Add a course first to start using {type === "flashcards" ? "flashcards" : "notes"}.
            </p>
          </div>
        ) : type === "flashcards" ? (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <FlashcardsClient
              courses={courses}
              initialCards={flashcards}
              courseId={courseId || null}
              totalCounts={{}}
              onCourseChange={id => setCourseId(id)}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <NotesClient
              courses={courses}
              initialNotes={notes}
              courseId={courseId || null}
              onCourseChange={id => setCourseId(id)}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
