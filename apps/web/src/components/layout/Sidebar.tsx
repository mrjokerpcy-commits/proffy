"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Course } from "@/lib/types";
import { SUBDOMAIN_SITES } from "@/lib/constants";
import UpgradeModal from "./UpgradeModal";

function detectSubdomain(): string {
  if (typeof window === "undefined") return "root";
  const host = window.location.hostname;
  if (host.startsWith("app.")) return "app";
  if (host.startsWith("psycho.")) return "psycho";
  if (host.startsWith("yael.")) return "yael";
  if (host.startsWith("bagrut.")) return "bagrut";
  return "root";
}

// ── Version — update this when releasing Proffy 1.0, 2.0, etc. ──
const PROFFY_VERSION = "beta";

interface Props {
  courses: Course[];
  activeCourseId?: string;
  flashcardsDue?: number;
  userPlan?: "free" | "pro" | "max";
  onOpenFlashcards?: () => void;
  onOpenNotes?: () => void;
}

function ExamBadge({ examDate }: { examDate: string | null }) {
  if (!examDate) return null;
  const days = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return null;
  const style =
    days <= 7  ? { color: "var(--red)",   background: "rgba(248,113,113,0.1)" } :
    days <= 14 ? { color: "var(--amber)", background: "rgba(251,191,36,0.1)" }  :
                 { color: "var(--green)", background: "rgba(52,211,153,0.1)" };
  return (
    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "5px", flexShrink: 0, fontVariantNumeric: "tabular-nums",...style }}>
      {days}d
    </span>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconFingerprint() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10"/>
      <path d="M5 12a7 7 0 0 1 7-7"/>
      <path d="M8 12a4 4 0 0 1 8 0"/>
      <path d="M12 12v.01"/>
      <path d="M17 12c0 2.761-2.239 5-5 5s-5-2.239-5-5"/>
      <path d="M20 12c0 4.418-3.582 8-8 8s-8-3.582-8-8"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function SidebarLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="sb-logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1"/><stop offset="1" stopColor="#a78bfa"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#sb-logo-g)"/>
      <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white"/>
      <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8"/>
      <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
      <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
      <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6"/>
    </svg>
  );
}

const SEMESTERS = [
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "s", label: "Summer" },
];


export default function Sidebar({ courses, activeCourseId, flashcardsDue: initialFcDue = 0, userPlan = "free", onOpenFlashcards, onOpenNotes }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? "?";
  const userName = session?.user?.name ?? session?.user?.email ?? "Account";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string>("root");
  useEffect(() => { setSubdomain(detectSubdomain()); }, []);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [mainTab, setMainTab] = useState<"courses" | "history">("courses");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDetail, setHistoryDetail] = useState<{ session: any; messages: any[] } | null>(null);
  const router = useRouter();

  // Semester filter: derive default from courses (most common semester letter), fallback "a"
  function defaultSemester(): string {
    if (courses.length === 0) return "a";
    const counts: Record<string, number> = {};
    for (const c of courses) {
      const key = c.semester?.slice(-1).toLowerCase() ?? "";
      if (key === "a" || key === "b" || key === "s") counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "a";
  }
  // Sync selected semester with URL params on dashboard
  function getSemesterFromUrl(): string | null {
    if (typeof window === "undefined") return null;
    const s = new URLSearchParams(window.location.search).get("semester");
    return s && ["a","b","s"].includes(s) ? s : null;
  }
  const [selectedSemester, setSelectedSemester] = useState<string>(() => getSemesterFromUrl() ?? defaultSemester());

  // Keep semester in sync when navigating
  useEffect(() => {
    const fromUrl = getSemesterFromUrl();
    if (fromUrl) setSelectedSemester(fromUrl);
  }, [pathname]);

  // Filter courses to current semester (courses with no semester set always show)
  const filteredCourses = courses.filter(c => {
    if (!c.semester) return true;
    return c.semester.slice(-1).toLowerCase() === selectedSemester;
  });

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const [stats, setStats] = useState({ fcDue: initialFcDue, fcTotal: 0, notesTotal: 0 });

  useEffect(() => {
    fetch("/api/sidebar-stats")
      .then(r => r.json())
      .then(d => { if (d.fcDue !== undefined) setStats(d); })
      .catch(() => {});
  }, [pathname]);

  const { fcDue, fcTotal, notesTotal } = stats;
  const fingerprintLocked = userPlan === "free";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}>

      {/* ── Brand ── */}
      <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
        <SidebarLogo />
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em", color: "var(--text-primary)", flex: 1, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          Proffy
          <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(99,102,241,0.13)", border: "1px solid rgba(99,102,241,0.28)", borderRadius: "4px", padding: "1px 5px", lineHeight: 1.5 }}>
            {PROFFY_VERSION}
          </span>
        </span>
        <button
          onClick={() => router.push(`/dashboard?new=${Date.now()}&semester=${selectedSemester}`)}
          title="New chat"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", borderRadius: "7px",
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-muted)", flexShrink: 0, cursor: "pointer",
            transition: "all 0.15s",
          }}
          className="sidebar-item"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* ── Semester tabs ── */}
      <div style={{ padding: "0.875rem 0.875rem 0.5rem", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "3px", padding: "3px", borderRadius: "10px", background: "var(--bg-elevated)" }}>
          {SEMESTERS.map((s) => (
            <button key={s.key} onClick={() => {
              setSelectedSemester(s.key);
              // On dashboard, navigate to ?semester=X to load a separate chat session
              if (pathname === "/dashboard") {
                router.push(`/dashboard?semester=${s.key}`);
              }
            }} style={{
              fontSize: "12px", padding: "6px 0", borderRadius: "7px", fontWeight: 600, transition: "all 0.15s",
              background: selectedSemester === s.key ? "var(--blue)" : "transparent",
              color: selectedSemester === s.key ? "#fff" : "var(--text-muted)",
              cursor: "pointer", border: "none",
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Courses / History tab ── */}
      <div data-tour="sidebar-courses" style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0.75rem 0.25rem", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
          {(["courses", "history"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setMainTab(tab);
                if (tab === "history" && historySessions.length === 0) {
                  setHistoryLoading(true);
                  fetch("/api/chat-history")
                    .then(r => r.json())
                    .then(d => { if (d.sessions) setHistorySessions(d.sessions); })
                    .catch(() => {})
                    .finally(() => setHistoryLoading(false));
                }
              }}
              style={{
                flex: 1, padding: "5px 0", borderRadius: "7px", fontSize: "11px", fontWeight: 700,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: mainTab === tab ? "var(--blue)" : "transparent",
                color: mainTab === tab ? "#fff" : "var(--text-muted)",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}
            >
              {tab === "courses" ? "Courses" : "History"}
            </button>
          ))}
          {mainTab === "courses" && (
            <Link href="/courses/new" style={{ fontSize: "12px", fontWeight: 700, color: "var(--blue)", textDecoration: "none", paddingLeft: "4px" }}>
              + Add
            </Link>
          )}
        </div>

        {/* ── History panel ── */}
        {mainTab === "history" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", overflow: "hidden" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                style={{
                  width: "100%", padding: "6px 8px 6px 28px", borderRadius: "7px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontSize: "12px", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {historyLoading ? (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>Loading...</div>
              ) : historySessions.length === 0 ? (
                <div style={{ padding: "20px 8px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                  No chat history yet.<br/>Start a conversation in any course.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {historySessions
                    .filter((s: any) => {
                      if (!historySearch.trim()) return true;
                      const q = historySearch.toLowerCase();
                      return (s.course_name ?? "").toLowerCase().includes(q)
                        || (s.course_number ?? "").toLowerCase().includes(q)
                        || (s.semester ?? "").toLowerCase().includes(q);
                    })
                    .map((s: any) => (
                    <button
                      key={s.id}
                      onClick={async () => {
                        const res = await fetch(`/api/chat-history?sessionId=${s.id}`);
                        const data = await res.json();
                        setHistoryDetail({ session: s, messages: data.messages ?? [] });
                      }}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "flex-start",
                        gap: "4px", padding: "8px 10px", borderRadius: "7px",
                        background: "transparent", border: "1px solid transparent",
                        cursor: "pointer", textAlign: "left", width: "100%",
                        transition: "all 0.15s",
                      }}
                      className="sidebar-item"
                    >
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                        {s.course_name ?? "General chat"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                        {s.course_number && (
                          <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "rgba(79,142,247,0.1)", color: "var(--blue)", border: "1px solid rgba(79,142,247,0.2)" }}>
                            #{s.course_number}
                          </span>
                        )}
                        {s.semester && (
                          <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "rgba(167,139,250,0.1)", color: "var(--purple)", border: "1px solid rgba(167,139,250,0.2)" }}>
                            {s.semester.toUpperCase()}
                          </span>
                        )}
                        <span style={{ fontSize: "10px", color: "var(--text-disabled)" }}>
                          {new Date(s.last_message_at ?? s.created_at).toLocaleDateString("en-IL", { day: "numeric", month: "short" })}
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--text-disabled)" }}>·</span>
                        <span style={{ fontSize: "10px", color: "var(--text-disabled)" }}>{s.message_count} msgs</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── History detail popup ── */}
        <AnimatePresence>
          {historyDetail && (
            <motion.div
              key="history-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryDetail(null)}
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,0.7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "20px",
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: "100%", maxWidth: "600px", maxHeight: "80vh",
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: "16px", display: "flex", flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
                }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {historyDetail.session.course_name ?? "General chat"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {new Date(historyDetail.session.created_at).toLocaleDateString("en-IL", { day: "numeric", month: "short", year: "numeric" })} · {historyDetail.messages.length} messages
                    </div>
                  </div>
                  <button
                    onClick={() => setHistoryDetail(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {historyDetail.messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        padding: "10px 14px", borderRadius: "12px",
                        fontSize: "13px", lineHeight: 1.6,
                        background: msg.role === "user" ? "var(--blue)" : "var(--bg-elevated)",
                        color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                        border: msg.role === "user" ? "none" : "1px solid var(--border)",
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>
                {/* Footer with link to course */}
                {historyDetail.session.course_id && (
                  <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                    <a
                      href={`/course/${historyDetail.session.course_id}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        fontSize: "12px", fontWeight: 600, color: "var(--blue)",
                        textDecoration: "none",
                      }}
                    >
                      Continue in {historyDetail.session.course_name} →
                    </a>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Courses list (hidden when history tab active) ── */}
        {mainTab === "courses" && <AnimatePresence initial={false}>
          {courses.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "1.5rem 0.5rem", textAlign: "center", fontSize: "13px", lineHeight: 1.7, color: "var(--text-muted)" }}>
              No courses yet.<br/>
              <Link href="/courses/new" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 600 }}>Add your first →</Link>
            </motion.div>
          ) : filteredCourses.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "1.5rem 0.5rem", textAlign: "center", fontSize: "12px", lineHeight: 1.7, color: "var(--text-muted)" }}>
              No courses in semester {selectedSemester.toUpperCase()}.
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {filteredCourses.map((course, i) => {
                const isActive = activeCourseId === course.id;
                const isHovered = hoveredId === course.id;
                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                    style={{ position: "relative" }}
                    onMouseEnter={() => setHoveredId(course.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <Link
                      href={`/course/${course.id}`}
                      className="sidebar-item-course"
                      style={{
                        display: "flex", alignItems: "center", gap: "9px",
                        padding: "7px 10px", borderRadius: "7px", textDecoration: "none",
                        background: isActive ? "rgba(79,142,247,0.1)" : "transparent",
                        border: `1px solid ${isActive ? "rgba(79,142,247,0.2)" : "transparent"}`,
                        transition: "all 0.15s", paddingRight: isHovered ? "32px" : "10px",
                      }}
                    >
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, background: isActive ? "var(--blue)" : "var(--text-muted)", opacity: isActive ? 1 : 0.5 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: isActive ? "var(--blue-hover)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {course.name}
                        </div>
                        {course.professor && (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {course.professor}
                          </div>
                        )}
                      </div>
                      <ExamBadge examDate={course.exam_date} />
                    </Link>

                    {/* Trash button — shows on hover */}
                    {isHovered && (
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!confirm(`Delete "${course.name}"?`)) return;
                          setDeletingId(course.id);
                          await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
                          setDeletingId(null);
                          setHoveredId(null);
                          router.refresh();
                          if (isActive) router.push("/dashboard");
                        }}
                        title="Delete course"
                        style={{
                          position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer", padding: "4px",
                          color: deletingId === course.id ? "var(--text-muted)" : "#f87171",
                          display: "flex", alignItems: "center", borderRadius: "5px",
                          opacity: 0.8,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>}
      </div>

      {/* ── Feature widget boxes ── */}
      <div style={{ flexShrink: 0, padding: "0.5rem 0.75rem 0.5rem", display: "flex", flexDirection: "column", gap: "8px" }}>

        {/* Study Groups */}
        <a
          href="/groups"
          className="sidebar-item"
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 14px", borderRadius: "10px",
            background: "rgba(79,142,247,0.06)",
            border: "1px solid rgba(79,142,247,0.18)",
            width: "100%", cursor: "pointer", transition: "all 0.15s",
            textDecoration: "none",
          }}
        >
          <div style={{
            width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
            background: "rgba(79,142,247,0.12)",
            border: "1px solid rgba(79,142,247,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#4f8ef7", lineHeight: 1.25, display: "flex", alignItems: "center", gap: "6px" }}>
              Study Groups
              <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "4px", padding: "1px 5px" }}>Soon</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
              Chat with your coursemates
            </div>
          </div>
        </a>

        {/* Professor Fingerprint */}
        <button
          data-tour="sidebar-fingerprint"
          onClick={() => window.dispatchEvent(new Event("proffy:open-fingerprint"))}
          className="sidebar-item"
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 14px", borderRadius: "10px",
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.18)",
            width: "100%", cursor: "pointer", transition: "all 0.15s",
          }}
        >
          <div style={{
            width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "15px",
          }}>🧬</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#f87171", lineHeight: 1.25 }}>
              Prof. Fingerprint
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
              Map exam patterns · Max
            </div>
          </div>
        </button>

        {/* Flashcards */}
        <button
          data-tour="sidebar-flashcards"
          onClick={onOpenFlashcards}
          className={fcDue > 0 ? "fc-due-widget" : "sidebar-item"}
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "13px 14px", borderRadius: "10px", textDecoration: "none",
            background: fcDue > 0 ? "rgba(167,139,250,0.09)" : "var(--bg-elevated)",
            border: `1px solid ${fcDue > 0 ? "rgba(167,139,250,0.3)" : "var(--border)"}`,
            width: "100%", cursor: "pointer",
          }}
        >
          <div style={{
            width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
            background: fcDue > 0 ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${fcDue > 0 ? "rgba(167,139,250,0.38)" : "var(--border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={fcDue > 0 ? "#a78bfa" : "var(--text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: fcDue > 0 ? "#a78bfa" : "var(--text-secondary)", lineHeight: 1.25, display: "flex", alignItems: "center", gap: "6px" }}>
              Flashcards
              {fcDue > 0 && (
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#f87171" }}>{fcDue}</span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              {fcDue > 0 ? "due for review" : fcTotal > 0 ? `${fcTotal} cards total` : "Spaced repetition"}
            </div>
          </div>
        </button>

        {/* Notes */}
        <button
          data-tour="sidebar-notes"
          onClick={onOpenNotes}
          className="sidebar-item"
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "13px 14px", borderRadius: "10px", textDecoration: "none",
            background: "var(--bg-elevated)",
            border: `1px solid var(--border)`,
            width: "100%", cursor: "pointer",
          }}
        >
          <div style={{
            width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)", lineHeight: 1.25, display: "flex", alignItems: "center", gap: "6px" }}>
              Course Notes
              {notesTotal > 0 && (
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#f87171" }}>{notesTotal}</span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              {notesTotal > 0 ? "saved by Proffy" : "Saved by Proffy AI"}
            </div>
          </div>
        </button>

      </div>

      {/* ── Other Proffy sites — only shown on app.proffy.study ── */}
      {subdomain === "app" && (
        <div style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          padding: "12px 12px 10px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-disabled)", marginBottom: "8px", paddingLeft: "2px" }}>
            Proffy Network
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {(Object.entries(SUBDOMAIN_SITES) as [string, typeof SUBDOMAIN_SITES[keyof typeof SUBDOMAIN_SITES]][])
              .filter(([key]) => key !== "app")
              .map(([key, site]) => (
                <a
                  key={key}
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "7px 10px", borderRadius: "8px",
                    textDecoration: "none", fontSize: "12.5px",
                    color: "var(--text-secondary)",
                    transition: "background 0.1s, color 0.1s",
                  }}
                  className="sidebar-item"
                >
                  <span style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: site.color, flexShrink: 0,
                    boxShadow: `0 0 6px ${site.color}88`,
                  }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {site.label}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, flexShrink: 0 }}>
                    <path d="M7 17L17 7M17 7H7M17 7v10"/>
                  </svg>
                </a>
              ))}
          </div>
        </div>
      )}

      {/* ── Bottom user menu ── */}
      <div ref={menuRef} style={{ flexShrink: 0, borderTop: "1px solid var(--border)", position: "relative" }}>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: "10px", right: "10px",
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: "12px", overflow: "hidden", zIndex: 100,
                boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              {/* Email header */}
              <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session?.user?.email ?? ""}
                </div>
              </div>

              {/* Menu items */}
              {[
                { label: "Settings", icon: "⚙️", href: "/settings" },
                { label: "Get help", icon: "❓", href: "/help" },
              ].map(item => (
                <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px",
                  fontSize: "13px", color: "var(--text-secondary)", textDecoration: "none",
                  transition: "background 0.1s",
                }}
                  className="sidebar-item"
                >
                  <span style={{ fontSize: "14px" }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              {userPlan !== "max" && (
                <button onClick={() => { setMenuOpen(false); setUpgradeOpen(true); }} style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px",
                  fontSize: "13px", fontWeight: 600, color: "#a78bfa", width: "100%",
                  background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  transition: "background 0.1s",
                }} className="sidebar-item">
                  <span style={{ fontSize: "14px" }}>⭐</span>
                  Upgrade plan
                </button>
              )}

              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />

              <button onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/login" }); }} style={{
                display: "flex", alignItems: "center", gap: "10px", width: "100%",
                padding: "9px 14px", fontSize: "13px", color: "var(--text-muted)",
                background: "none", border: "none", cursor: "pointer", textAlign: "left",
                transition: "background 0.1s",
              }} className="sidebar-item">
                <span style={{ fontSize: "14px" }}>↪</span>
                Log out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User row trigger */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: "10px", width: "100%",
            padding: "10px 12px", fontSize: "13px",
            cursor: "pointer", background: menuOpen ? "rgba(255,255,255,0.04)" : "transparent",
            border: "none", color: "var(--text-secondary)", transition: "background 0.15s",
          }}
        >
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#6366f1,#a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontWeight: 700, color: "white",
          }}>
            {userInitial}
          </div>
          <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px", fontWeight: 500 }}>
            {userName}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>

        {/* Powered by Claude */}
        <div style={{ padding: "4px 12px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: "10px", color: "var(--text-disabled)", letterSpacing: "0.02em" }}>
            Powered by Claude
          </span>
        </div>
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} currentPlan={userPlan} />
    </div>
  );
}
