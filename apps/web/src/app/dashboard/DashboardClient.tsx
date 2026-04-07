"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

// ── Palette for courses without a color ──────────────────────────────────────
const COURSE_COLORS = ["#4f8ef7","#a78bfa","#34d399","#f59e0b","#f87171","#38bdf8","#fb923c","#e879f9"];
function courseColor(c: any, idx: number) {
  return c.color || COURSE_COLORS[idx % COURSE_COLORS.length];
}

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

function formatTimeAgo(date: string | null) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── GitHub-style activity bar ─────────────────────────────────────────────────
function ActivityBar({ courseStats }: { courseStats: any[] }) {
  const total = courseStats.reduce((s: number, c: any) => s + (c.message_count || 0), 0);
  if (total === 0 || courseStats.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Study activity by course
      </div>
      {/* Bar */}
      <div style={{ display: "flex", height: "10px", borderRadius: "99px", overflow: "hidden", gap: "2px" }}>
        {courseStats
          .filter((c: any) => c.message_count > 0)
          .map((c: any, i: number) => {
            const pct = Math.round((c.message_count / total) * 100);
            return (
              <div
                key={c.id}
                title={`${c.name}: ${pct}%`}
                style={{
                  flex: c.message_count,
                  background: courseColor(c, i),
                  borderRadius: i === 0 ? "99px 0 0 99px" : i === courseStats.filter((x: any) => x.message_count > 0).length - 1 ? "0 99px 99px 0" : "0",
                  transition: "flex 0.4s ease",
                  minWidth: "4px",
                }}
              />
            );
          })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginTop: "10px" }}>
        {courseStats
          .filter((c: any) => c.message_count > 0)
          .map((c: any, i: number) => {
            const pct = Math.round((c.message_count / total) * 100);
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: courseColor(c, i), flexShrink: 0 }} />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.name}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{pct}%</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default function DashboardClient({
  firstName, courses, courseStats, recentSessions,
  monthTokens, tokenLimit, userPlan, fcDue, notesCount, nextExam,
}: Props) {
  const router = useRouter();
  const totalMessages = courseStats.reduce((s: number, c: any) => s + (c.message_count || 0), 0);
  const totalMaterials = courseStats.reduce((s: number, c: any) => s + (c.material_count || 0), 0);
  const usagePct = tokenLimit > 0 ? Math.min(100, Math.round(monthTokens / tokenLimit * 100)) : 0;

  const stats = [
    { label: "Conversations", value: totalMessages, color: "#4f8ef7", icon: "💬" },
    { label: "Materials", value: totalMaterials, color: "#34d399", icon: "📄" },
    { label: "Flashcards due", value: fcDue, color: "#a78bfa", icon: "🗂" },
    { label: "Notes saved", value: notesCount, color: "#f59e0b", icon: "📝" },
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "28px 32px", maxWidth: "1100px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>
          Hey, {firstName}
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
          {nextExam
            ? `Next exam: ${nextExam.name} in ${nextExam.days} day${nextExam.days !== 1 ? "s" : ""}`
            : courses.length === 0
            ? "Add your first course to get started"
            : `${courses.length} course${courses.length !== 1 ? "s" : ""} this semester`}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {stats.map(s => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
              borderRadius: "14px", padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>{s.icon}</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", fontWeight: 600 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Usage bar ── */}
      {usagePct >= 40 && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: "14px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Monthly usage</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: usagePct > 85 ? "#f87171" : usagePct > 60 ? "#fbbf24" : "var(--text-muted)" }}>{usagePct}%</span>
            </div>
            <div style={{ height: "6px", borderRadius: "99px", background: "var(--border)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "99px", width: `${usagePct}%`, background: usagePct > 85 ? "#f87171" : usagePct > 60 ? "#fbbf24" : "#4f8ef7", transition: "width 0.4s" }} />
            </div>
          </div>
          {userPlan === "free" && (
            <Link href="/checkout" style={{ fontSize: "12px", fontWeight: 700, color: "#4f8ef7", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
              Upgrade →
            </Link>
          )}
        </div>
      )}

      {/* ── Activity breakdown bar ── */}
      {totalMessages > 0 && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: "14px", padding: "18px 20px", marginBottom: "20px" }}>
          <ActivityBar courseStats={courseStats} />
        </div>
      )}

      {/* ── Open chat CTA (no courses) ── */}
      {courses.length === 0 && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: "16px", padding: "32px", textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>👋</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Add your first course</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>Upload your slides and start studying with AI.</div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => router.push("/courses/new")}
              style={{ padding: "10px 22px", borderRadius: "10px", background: "var(--blue)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
            >
              + Add course
            </button>
            <button
              onClick={() => router.push("/chat")}
              style={{ padding: "10px 22px", borderRadius: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              Open chat
            </button>
          </div>
        </div>
      )}

      {/* ── Course cards ── */}
      {courses.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            Your courses
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {courseStats.map((c: any, i: number) => {
              const col = courseColor(c, i);
              const examDays = c.exam_date
                ? Math.ceil((new Date(c.exam_date).getTime() - Date.now()) / 86400000)
                : null;
              const lastChat = formatTimeAgo(c.last_chat);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                    borderRadius: "14px", padding: "18px", cursor: "default",
                    borderTop: `3px solid ${col}`,
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "3px" }}>
                      {c.name}
                    </div>
                    {c.professor && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.professor}</div>
                    )}
                  </div>

                  {/* Mini stats */}
                  <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: col }}>{c.message_count}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>messages</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-secondary)" }}>{c.material_count}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>materials</div>
                    </div>
                    {examDays !== null && examDays >= 0 && (
                      <div style={{ marginLeft: "auto" }}>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: examDays <= 7 ? "#f87171" : examDays <= 14 ? "#fbbf24" : "#34d399" }}>{examDays}d</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>to exam</div>
                      </div>
                    )}
                  </div>

                  {lastChat && (
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      Last chat {lastChat}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => router.push(`/chat?courseId=${c.id}`)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
                        background: col + "18", border: `1px solid ${col}44`,
                        color: col, cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      Open chat
                    </button>
                    <button
                      onClick={() => router.push(`/course/${c.id}`)}
                      style={{
                        padding: "8px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                        background: "var(--bg-base)", border: "1px solid var(--border)",
                        color: "var(--text-muted)", cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      Details
                    </button>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {recentSessions.map((s: any, i: number) => (
              <button
                key={s.id}
                onClick={() => router.push(s.course_id ? `/chat?courseId=${s.course_id}` : "/chat")}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 14px", borderRadius: "10px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                  cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s",
                }}
                className="sidebar-item"
              >
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                  background: s.color || COURSE_COLORS[i % COURSE_COLORS.length],
                }} />
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {s.course_name ?? "General chat"}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {s.message_count} messages
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {formatTimeAgo(s.created_at)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
