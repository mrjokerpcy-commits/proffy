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
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "34px", height: "34px", borderRadius: "9px",
          background: open ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
          cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke={open ? "#34d399" : "rgba(255,255,255,0.5)"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/>
          <line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
          <line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
        </svg>
      </button>
      <MathCalc isOpen={open} onOpenChange={setOpen} topBar />
    </>
  );
}
