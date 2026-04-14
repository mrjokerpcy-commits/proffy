"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ChatWindow from "@/components/chat/ChatWindow";
import type { Course, ChatMessage } from "@/lib/types";

interface Props {
  course: Course;
  sessionId: string;
  initialMessages: ChatMessage[];
  userPlan: "free" | "pro" | "max";
  flashcardsDue: number;
  professorPatterns: { topic: string; pct: number }[];
  chunksCount: number;
  docs: { id: string; filename: string; type?: string }[];
}

export default function CourseWorkspace({
  course,
  sessionId,
  initialMessages,
  userPlan,
  flashcardsDue,
  professorPatterns,
  chunksCount,
  docs,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div style={{ display: "grid", gridTemplateColumns: panelOpen ? "60% 40%" : "1fr auto", height: "100%", minHeight: 0 }}>
      <div style={{ minHeight: 0, borderRight: "1px solid var(--border)" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-secondary)" }}>
          Proffy knows <strong style={{ color: "var(--text-primary)" }}>{chunksCount}</strong> chunks from your slides
        </div>
        <ChatWindow course={course} sessionId={sessionId} initialMessages={initialMessages} userPlan={userPlan} hasCourses />
      </div>

      <aside style={{ width: panelOpen ? "100%" : 44, background: "var(--bg-surface)", overflow: "hidden", borderLeft: "1px solid var(--border)" }}>
        <button
          onClick={() => setPanelOpen((v) => !v)}
          style={{ width: "100%", border: "none", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-secondary)", padding: "10px 12px", cursor: "pointer", textAlign: panelOpen ? "right" : "center" }}
        >
          {panelOpen ? "Hide" : "Info"}
        </button>

        {panelOpen && (
          <div style={{ padding: 14, display: "grid", gap: 12, overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--bg-base)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Exam countdown</div>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#c8f135" }}>
                {course.exam_date ? `${Math.max(0, Math.ceil((new Date(course.exam_date).getTime() - Date.now()) / 86400000))}d` : "N/A"}
              </div>
            </motion.div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--bg-base)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Professor patterns</div>
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                {professorPatterns.slice(0, 5).map((p) => (
                  <div key={p.topic}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                      <span>{p.topic}</span>
                      <span>{p.pct}%</span>
                    </div>
                    <div style={{ marginTop: 4, height: 4, borderRadius: 999, background: "var(--border)" }}>
                      <div style={{ width: `${p.pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(135deg, #4f8ef7, #a78bfa)" }} />
                    </div>
                  </div>
                ))}
                {professorPatterns.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No patterns yet. Upload past exams.</div>}
              </div>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--bg-base)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Uploaded documents</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {docs.slice(0, 8).map((d) => (
                  <div key={d.id} style={{ fontSize: 12, color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px" }}>
                    {d.filename}
                  </div>
                ))}
                {docs.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No documents uploaded.</div>}
              </div>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--bg-base)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Flashcards due</div>
              <div style={{ marginTop: 6, fontSize: 24, color: "#a78bfa", fontWeight: 800 }}>{flashcardsDue}</div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
