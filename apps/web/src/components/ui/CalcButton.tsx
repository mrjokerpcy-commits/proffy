"use client";
import { useState } from "react";
import MathCalc from "./MathCalc";

export default function CalcButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        title="Scientific calculator"
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 12px", borderRadius: "9px",
          background: open ? "rgba(52,211,153,0.15)" : "var(--bg-elevated)",
          border: `1px solid ${open ? "rgba(52,211,153,0.4)" : "var(--border-light)"}`,
          cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
          color: open ? "#34d399" : "var(--text-secondary)",
          fontSize: "12px", fontWeight: 600,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/>
          <line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
          <line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
        </svg>
        Calc
      </button>
      <MathCalc isOpen={open} onOpenChange={setOpen} topBar />
    </>
  );
}
