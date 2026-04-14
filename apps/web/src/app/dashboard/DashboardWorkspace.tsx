"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ChatWindow from "@/components/chat/ChatWindow";
import type { Course } from "@/lib/types";

interface Props {
  firstName: string;
  courses: Course[];
  monthTokens: number;
  tokenLimit: number;
  userPlan: string;
  fcDue: number;
  notesCount: number;
  nextExam: { name: string; days: number } | null;
}

const COURSE_COLORS = ["#4f8ef7", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#38bdf8"];

export default function DashboardWorkspace({
  firstName,
  courses,
  monthTokens,
  tokenLimit,
  userPlan,
  fcDue,
  notesCount,
  nextExam,
}: Props) {
  const router = useRouter();
  const usagePct = tokenLimit > 0 ? Math.min(100, Math.round((monthTokens / tokenLimit) * 100)) : 0;

  const stats = [
    { label: "Flashcards due", value: fcDue, color: "#a78bfa" },
    { label: "Questions used", value: `${usagePct}%`, color: "#4f8ef7" },
    { label: "Active courses", value: courses.length, color: "#34d399" },
    { label: "Saved notes", value: notesCount, color: "#c8f135" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>
          Hey, {firstName}
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "6px 0 0" }}>
          {nextExam ? `Next exam: ${nextExam.name} in ${nextExam.days} days` : "Your calm workspace for exam prep."}
        </p>
      </div>

      <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-base)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "10px" }}>
          {stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px" }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</div>
              <div style={{ marginTop: "6px", fontSize: "24px", fontWeight: 800, color: s.color }}>{s.value}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {courses.length > 0 && (
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
          <div style={{ display: "flex", gap: "10px", minWidth: "max-content" }}>
            {courses.map((course, i) => {
              const days = course.exam_date ? Math.ceil((new Date(course.exam_date).getTime() - Date.now()) / 86400000) : null;
              return (
                <button
                  key={course.id}
                  onClick={() => router.push(`/course/${course.id}`)}
                  style={{
                    width: 220,
                    textAlign: "left",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    padding: "12px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: course.color || COURSE_COLORS[i % COURSE_COLORS.length] }} />
                    {days !== null && days >= 0 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{days}d</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{course.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{course.professor || "No professor yet"}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: "center", border: "1px solid var(--border)", background: "var(--bg-surface)", borderRadius: 12, padding: 28 }}>
            <h2 style={{ margin: 0, fontSize: 24, color: "var(--text-primary)", fontWeight: 800 }}>Start your first course</h2>
            <p style={{ marginTop: 10, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
              Upload slides and past exams. Proffy will answer with citations from your material.
            </p>
            <button
              onClick={() => router.push("/courses/new")}
              style={{ marginTop: 14, border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", background: "#c8f135", color: "#111827", fontWeight: 800 }}
            >
              Add your first course
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", flex: 1, minHeight: 0 }}>
          <div style={{ borderRight: "1px solid var(--border)", minHeight: 0 }}>
            <ChatWindow hasCourses userPlan={userPlan as "free" | "pro" | "max"} initialUsedTokens={monthTokens} tokenLimit={tokenLimit} />
          </div>
          <aside style={{ padding: 16, background: "var(--bg-surface)", overflowY: "auto" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
              What to study today
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {courses.slice(0, 4).map((course, i) => (
                <div key={course.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--bg-base)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: course.color || COURSE_COLORS[i % COURSE_COLORS.length] }} />
                    <strong style={{ fontSize: 13 }}>{course.name}</strong>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                    Focus: summarize lecture 1-3, then quiz yourself on core definitions.
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
