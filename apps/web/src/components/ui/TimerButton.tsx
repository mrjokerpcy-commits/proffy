"use client";
import { useState } from "react";
import TimerWidget from "./TimerWidget";

export default function TimerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        title="Study timer"
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 12px", borderRadius: "9px",
          background: open ? "rgba(245,158,11,0.15)" : "var(--bg-elevated)",
          border: `1px solid ${open ? "rgba(245,158,11,0.4)" : "var(--border-light)"}`,
          cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
          color: open ? "#f59e0b" : "var(--text-secondary)",
          fontSize: "12px", fontWeight: 600,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Timer
      </button>
      <TimerWidget isOpen={open} onOpenChange={setOpen} />
    </>
  );
}
