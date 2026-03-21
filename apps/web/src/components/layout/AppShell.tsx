"use client";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";
import PanelDrawer from "./PanelDrawer";
import type { Course } from "@/lib/types";

interface Props {
  children: React.ReactNode;
  courses: Course[];
  activeCourse?: Course;
  flashcardsDue?: number;
  professorPatterns?: { topic: string; pct: number }[];
  studentInsights?: { topic: string; status: string; note: string }[];
  userPlan?: "free" | "pro" | "max";
}

export default function AppShell({ children, courses, activeCourse, flashcardsDue, professorPatterns, studentInsights, userPlan = "free" }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [openPanel, setOpenPanel] = useState<"flashcards" | "notes" | null>(null);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", overflow: "hidden", position: "relative" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? "240px" : "0px",
        flexShrink: 0, transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}>
        <Sidebar
          courses={courses}
          activeCourseId={activeCourse?.id}
          flashcardsDue={flashcardsDue}
          onOpenFlashcards={() => setOpenPanel("flashcards")}
          onOpenNotes={() => setOpenPanel("notes")}
        />
      </div>

      {/* ── Sidebar toggle ── */}
      <button
        onClick={() => setSidebarOpen(v => !v)}
        style={{
          position: "absolute",
          left: sidebarOpen ? "232px" : "0px",
          top: "50%", transform: "translateY(-50%)",
          zIndex: 20, transition: "left 0.2s cubic-bezier(0.4,0,0.2,1)",
          width: "18px", height: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "0 6px 6px 0",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderLeft: sidebarOpen ? "1px solid var(--border)" : "none",
          cursor: "pointer", color: "var(--text-muted)",
        }}
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {sidebarOpen ? (
            <><path d="M5 1L1 6L5 11"/></>
          ) : (
            <><path d="M1 1L5 6L1 11"/></>
          )}
        </svg>
      </button>

      {/* ── Main content ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {children}
      </main>

      {/* ── Right panel ── */}
      {activeCourse && rightOpen && (
        <div style={{
          width: "256px", flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}>
          <RightPanel course={activeCourse} flashcardsDue={flashcardsDue} professorPatterns={professorPatterns} userPlan={userPlan} />
        </div>
      )}

      <AnimatePresence>
        {openPanel && (
          <PanelDrawer
            key={openPanel}
            type={openPanel}
            activeCourseId={activeCourse?.id}
            onClose={() => setOpenPanel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
