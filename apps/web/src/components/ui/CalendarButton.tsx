"use client";
import { useState } from "react";
import MonthlyCalendar from "./MonthlyCalendar";

export default function CalendarButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        title="Monthly planner"
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 12px", borderRadius: "9px",
          background: open ? "rgba(167,139,250,0.15)" : "var(--bg-elevated)",
          border: `1px solid ${open ? "rgba(167,139,250,0.4)" : "var(--border-light)"}`,
          cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
          color: open ? "#a78bfa" : "var(--text-secondary)",
          fontSize: "12px", fontWeight: 600,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Planner
      </button>
      <MonthlyCalendar isOpen={open} onOpenChange={setOpen} />
    </>
  );
}
