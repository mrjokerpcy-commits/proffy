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
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "34px", height: "34px", borderRadius: "9px",
          background: open ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.1)"}`,
          cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke={open ? "#a78bfa" : "rgba(255,255,255,0.5)"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
      <MonthlyCalendar isOpen={open} onOpenChange={setOpen} />
    </>
  );
}
