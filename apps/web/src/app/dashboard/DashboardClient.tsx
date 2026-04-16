"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const COURSE_COLORS = ["#4f8ef7","#a78bfa","#34d399","#f59e0b","#f87171","#38bdf8","#fb923c","#e879f9"];
const courseColor = (c: any, idx: number) => c.color || COURSE_COLORS[idx % COURSE_COLORS.length];

interface Props {
  firstName: string;
  courses: any[];
  courseStats: any[];
  recentSessions: any[];
  monthTokens: number;
  tokenLimit: number;
  userPlan: string;
  fcDue: number;
  notesCount: number;
  nextExam: { name: string; days: number } | null;
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(ease * value));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Chat: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  File: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Cards: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  Note: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Arrow: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
  Clock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Bolt: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
};

function formatTimeAgo(date: string | null) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, color, icon, delay = 0,
}: {
  label: string; value: number; color: string; icon: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: `0 8px 32px ${color}20` }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-light)",
        borderRadius: "16px",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* Glow accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: `linear-gradient(90deg, transparent, ${color}88, transparent)`,
      }} />

      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "36px", height: "36px", borderRadius: "10px",
        background: color + "18", color, marginBottom: "14px",
      }}>
        {icon}
      </div>

      <div style={{
        fontSize: "28px", fontWeight: 800, letterSpacing: "-0.04em",
        color: "var(--text-primary)", lineHeight: 1, marginBottom: "4px",
      }}>
        <Counter value={value} />
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </div>
    </motion.div>
  );
}

// ── Activity bar ──────────────────────────────────────────────────────────────
function ActivityBar({ courseStats }: { courseStats: any[] }) {
  const active = courseStats.filter((c: any) => c.message_count > 0);
  const total  = active.reduce((s: number, c: any) => s + c.message_count, 0);
  if (total === 0) return null;

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Activity by course
      </div>
      <div style={{ display: "flex", height: "8px", borderRadius: "99px", overflow: "hidden", gap: "2px", marginBottom: "12px" }}>
        {active.map((c: any, i: number) => (
          <div key={c.id} title={`${c.name}: ${Math.round(c.message_count / total * 100)}%`}
            style={{ flex: c.message_count, background: courseColor(c, i), minWidth: "4px",
              borderRadius: i === 0 ? "99px 0 0 99px" : i === active.length - 1 ? "0 99px 99px 0" : "0" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
        {active.map((c: any, i: number) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: courseColor(c, i), flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.name}</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{Math.round(c.message_count / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardClient({
  firstName, courses, courseStats, recentSessions,
  monthTokens, tokenLimit, userPlan, fcDue, notesCount, nextExam,
}: Props) {
  const router = useRouter();
  const totalMessages  = courseStats.reduce((s: number, c: any) => s + (c.message_count  || 0), 0);
  const totalMaterials = courseStats.reduce((s: number, c: any) => s + (c.material_count || 0), 0);
  const usagePct = tokenLimit > 0 ? Math.min(100, Math.round(monthTokens / tokenLimit * 100)) : 0;

  const stats = [
    { label: "Conversations",  value: totalMessages,  color: "#4f8ef7", icon: <Icons.Chat  /> },
    { label: "Materials",      value: totalMaterials, color: "#34d399", icon: <Icons.File  /> },
    { label: "Flashcards due", value: fcDue,          color: "#a78bfa", icon: <Icons.Cards /> },
    { label: "Notes",          value: notesCount,     color: "#f59e0b", icon: <Icons.Note  /> },
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 36px", maxWidth: "1120px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "32px" }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.035em" }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "5px 0 0", fontWeight: 400 }}>
            {nextExam
              ? <>Next exam: <span style={{ color: nextExam.days <= 7 ? "#f87171" : nextExam.days <= 14 ? "#fbbf24" : "var(--text-secondary)", fontWeight: 600 }}>{nextExam.name}</span> in {nextExam.days} day{nextExam.days !== 1 ? "s" : ""}</>
              : courses.length === 0
              ? "Set up your first course to get started"
              : `${courses.length} course${courses.length !== 1 ? "s" : ""} active this semester`}
          </p>
        </div>
        <button
          onClick={() => router.push("/chat")}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 20px", borderRadius: "12px",
            background: "var(--blue)", border: "none",
            color: "#fff", fontSize: "13px", fontWeight: 700,
            cursor: "pointer", flexShrink: 0,
            boxShadow: "0 0 0 1px rgba(79,142,247,0.3), 0 4px 16px rgba(79,142,247,0.25)",
          }}
        >
          <Icons.Bolt />
          Start studying
          <Icons.Arrow />
        </button>
      </motion.div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.06} />
        ))}
      </div>

      {/* ── Usage + Activity row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "12px", marginBottom: "24px" }}>

        {/* Usage */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: "16px", padding: "20px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "2px" }}>
                Monthly usage
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {(monthTokens / 1000).toFixed(0)}K / {(tokenLimit / 1000).toFixed(0)}K tokens
              </div>
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.04em",
              color: usagePct > 85 ? "#f87171" : usagePct > 60 ? "#fbbf24" : "var(--text-primary)" }}>
              {usagePct}%
            </div>
          </div>

          {/* Track */}
          <div style={{ height: "6px", borderRadius: "99px", background: "var(--border)", overflow: "hidden", marginBottom: "12px" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${usagePct}%` }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              style={{ height: "100%", borderRadius: "99px",
                background: usagePct > 85 ? "#f87171" : usagePct > 60 ? "#fbbf24" :
                  "linear-gradient(90deg, #4f8ef7, #a78bfa)" }}
            />
          </div>

          {userPlan === "free" ? (
            <Link href="/checkout" style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: "12px", fontWeight: 700, color: "#4f8ef7", textDecoration: "none",
            }}>
              Upgrade plan <Icons.Arrow />
            </Link>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
              {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan
            </div>
          )}
        </motion.div>

        {/* Activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: "16px", padding: "20px" }}
        >
          {totalMessages > 0
            ? <ActivityBar courseStats={courseStats} />
            : <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: "4px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>No activity yet</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Start a conversation to see your study breakdown</div>
              </div>
          }
        </motion.div>
      </div>

      {/* ── Empty state ── */}
      {courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: "18px", padding: "48px 32px", textAlign: "center", marginBottom: "24px" }}
        >
          <div style={{
            width: "56px", height: "56px", borderRadius: "16px",
            background: "rgba(79,142,247,0.12)", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px", color: "#4f8ef7",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Add your first course</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px", maxWidth: "320px", margin: "0 auto 24px" }}>
            Upload your slides, PDFs, or lecture notes and start studying with AI.
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={() => router.push("/courses/new")}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "10px", background: "var(--blue)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              <Icons.Plus /> Add course
            </button>
            <button onClick={() => router.push("/chat")}
              style={{ padding: "10px 20px", borderRadius: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Open chat
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Course cards ── */}
      {courses.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Your courses
            </span>
            <button onClick={() => router.push("/courses/new")}
              style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <Icons.Plus /> Add course
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
            {courseStats.map((c: any, i: number) => {
              const col      = courseColor(c, i);
              const examDays = c.exam_date ? Math.ceil((new Date(c.exam_date).getTime() - Date.now()) / 86400000) : null;
              const lastChat = formatTimeAgo(c.last_chat);
              const urgency  = examDays !== null && examDays >= 0 ? (examDays <= 7 ? "#f87171" : examDays <= 14 ? "#fbbf24" : "#34d399") : null;

              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -3, boxShadow: `0 12px 40px ${col}18, 0 0 0 1px ${col}30` }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: "16px", overflow: "hidden", cursor: "default" }}
                >
                  {/* Color bar */}
                  <div style={{ height: "3px", background: `linear-gradient(90deg, ${col}, ${col}88)` }} />

                  <div style={{ padding: "18px" }}>
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "16px" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{c.name}</div>
                        {c.professor && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>{c.professor}</div>}
                      </div>
                      {urgency && examDays !== null && examDays >= 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: urgency + "15", border: `1px solid ${urgency}40`, borderRadius: "8px", padding: "3px 8px", flexShrink: 0 }}>
                          <Icons.Calendar />
                          <span style={{ fontSize: "11px", fontWeight: 700, color: urgency }}>{examDays}d</span>
                        </div>
                      )}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                      <div style={{ background: "var(--bg-base)", borderRadius: "10px", padding: "10px 12px" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: col, letterSpacing: "-0.03em" }}>{c.message_count}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginTop: "1px" }}>MESSAGES</div>
                      </div>
                      <div style={{ background: "var(--bg-base)", borderRadius: "10px", padding: "10px 12px" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "-0.03em" }}>{c.material_count}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginTop: "1px" }}>MATERIALS</div>
                      </div>
                    </div>

                    {lastChat && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>
                        <Icons.Clock /> Last studied {lastChat}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => router.push(`/chat?courseId=${c.id}`)}
                        style={{ flex: 1, padding: "9px 0", borderRadius: "9px", fontSize: "12px", fontWeight: 700,
                          background: col + "18", border: `1px solid ${col}33`, color: col, cursor: "pointer" }}>
                        Open chat
                      </button>
                      <button onClick={() => router.push(`/course/${c.id}`)}
                        style={{ padding: "9px 14px", borderRadius: "9px", fontSize: "12px", fontWeight: 600,
                          background: "var(--bg-base)", border: "1px solid var(--border)",
                          color: "var(--text-muted)", cursor: "pointer" }}>
                        Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent sessions ── */}
      {recentSessions.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            Recent conversations
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {recentSessions.map((s: any, i: number) => (
              <motion.button key={s.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => router.push(s.course_id ? `/chat?courseId=${s.course_id}` : "/chat")}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "11px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                  cursor: "pointer", textAlign: "left", width: "100%" }}
                className="sidebar-item"
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                  background: s.color || COURSE_COLORS[i % COURSE_COLORS.length] }} />
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {s.course_name ?? "General chat"}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                  {s.message_count} msg
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {formatTimeAgo(s.created_at)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
