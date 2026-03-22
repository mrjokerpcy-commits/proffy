"use client";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";
import PanelDrawer from "./PanelDrawer";
import TimerButton from "@/components/ui/TimerButton";
import CalcButton from "@/components/ui/CalcButton";
import CalendarButton from "@/components/ui/CalendarButton";
import OpenUploadButton from "@/components/ui/OpenUploadButton";
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
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Tour can request sidebar open (e.g. on mobile before showing sidebar steps)
  useEffect(() => {
    function onOpenSidebar() { setSidebarOpen(true); }
    window.addEventListener("proffy:open-sidebar", onOpenSidebar);
    return () => window.removeEventListener("proffy:open-sidebar", onOpenSidebar);
  }, []);
  const [openPanel, setOpenPanel] = useState<"flashcards" | "notes" | null>(null);

  return (
    <div style={{ display: "flex", height: "100dvh", background: "var(--bg-base)", color: "var(--text-primary)", overflow: "hidden", position: "relative" }}>

      {/* ── Mobile overlay when sidebar open ── */}
      {sidebarOpen && isMobile && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 15, background: "rgba(0,0,0,0.5)" }} />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? "240px" : "0px",
        flexShrink: 0, transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        position: isMobile ? "fixed" : "relative",
        top: 0, left: 0, height: "100%",
        zIndex: isMobile ? 20 : "auto",
      }}>
        <Sidebar
          courses={courses}
          activeCourseId={activeCourse?.id}
          flashcardsDue={flashcardsDue}
          userPlan={userPlan}
          onOpenFlashcards={() => { setOpenPanel("flashcards"); if (isMobile) setSidebarOpen(false); }}
          onOpenNotes={() => { setOpenPanel("notes"); if (isMobile) setSidebarOpen(false); }}
        />
      </div>

      {/* ── Sidebar toggle (desktop only) ── */}
      {!isMobile && (
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
      )}

      {/* ── Main content ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* ── Global tool bar ── */}
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: "6px", padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}>
          {/* Hamburger on mobile */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{
                marginRight: "auto", background: "none", border: "none",
                cursor: "pointer", color: "var(--text-muted)", padding: "4px 2px",
                display: "flex", alignItems: "center",
              }}
            >
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1h16M1 7h16M1 13h16"/>
              </svg>
            </button>
          )}
          <TimerButton />
          <CalcButton />
          <CalendarButton />
          <OpenUploadButton />
        </div>
        {children}
      </main>

      {/* ── Right panel — hidden on mobile ── */}
      {activeCourse && rightOpen && !isMobile && (
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
