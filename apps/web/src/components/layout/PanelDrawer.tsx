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

export default function PanelDrawer({ type, activeCourseId, onClose }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState(activeCourseId ?? "");
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses")
      .then(r => r.json())
      .then(d => {
        const list: Course[] = d.courses ?? [];
        setCourses(list);
        if (list.length === 0) {
          setLoading(false);
          return;
        }
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
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 40,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Drawer */}
      <motion.div
        key="drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(580px, 100vw)",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "-16px 0 48px rgba(0,0,0,0.35)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "16px",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            cursor: "pointer", color: "var(--text-muted)",
            padding: "6px", zIndex: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "8px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
            Loading…
          </div>
        ) : courses.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px", gap: "8px" }}>
            <span style={{ fontSize: "2rem" }}>📚</span>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--text-secondary)" }}>No courses yet</p>
            <p style={{ margin: 0, fontSize: "12px" }}>Add a course first to use {type === "flashcards" ? "flashcards" : "notes"}.</p>
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
