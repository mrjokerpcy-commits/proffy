"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Course } from "@/lib/types";
import UpgradeModal from "./UpgradeModal";

// ── Version — update this when releasing Proffy 1.0, 2.0, etc. ──
const PROFFY_VERSION = "beta";

interface Props {
  courses: Course[];
  activeCourseId?: string;
  flashcardsDue?: number;
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
          <stop stopColor="#4f8ef7"/><stop offset="1" stopColor="#a78bfa"/>
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

// TODO: derive from user's plan
const USER_PLAN: "free" | "pro" | "max" = "free"; // TODO: derive from session

export default function Sidebar({ courses, activeCourseId, flashcardsDue: initialFcDue = 0, onOpenFlashcards, onOpenNotes }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? "?";
  const userName = session?.user?.name ?? session?.user?.email ?? "Account";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const router = useRouter();

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
  const fingerprintLocked = USER_PLAN === "free";

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
        <Link
          href="/dashboard"
          title="New chat"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", borderRadius: "7px",
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-muted)", textDecoration: "none", flexShrink: 0,
            transition: "all 0.15s",
          }}
          className="sidebar-item"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </Link>
      </div>

      {/* ── Semester tabs ── */}
      <div style={{ padding: "0.875rem 0.875rem 0.5rem", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "3px", padding: "3px", borderRadius: "10px", background: "var(--bg-elevated)" }}>
          {SEMESTERS.map((s, i) => (
            <button key={s.key} style={{
              fontSize: "12px", padding: "6px 0", borderRadius: "7px", fontWeight: 600, transition: "all 0.15s",
              background: i === 0 ? "var(--blue)" : "transparent",
              color: i === 0 ? "#fff" : "var(--text-muted)",
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Courses list ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0.75rem 0.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.25rem 0.5rem 0.625rem" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
            Courses
          </span>
          <Link href="/courses/new" style={{ fontSize: "12px", fontWeight: 700, color: "var(--blue)", textDecoration: "none" }}>
            + Add
          </Link>
        </div>

        <AnimatePresence initial={false}>
          {courses.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "1.5rem 0.5rem", textAlign: "center", fontSize: "13px", lineHeight: 1.7, color: "var(--text-muted)" }}>
              No courses yet.<br/>
              <Link href="/courses/new" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 600 }}>Add your first →</Link>
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {courses.map((course, i) => {
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
        </AnimatePresence>
      </div>

      {/* ── Feature widget boxes ── */}
      <div style={{ flexShrink: 0, padding: "0.5rem 0.75rem 0.5rem", display: "flex", flexDirection: "column", gap: "8px" }}>

        {/* Flashcards */}
        <button
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

        {/* Fingerprint by Proffy */}
        {fingerprintLocked ? (
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "13px 14px", borderRadius: "10px",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            opacity: 0.6,
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconFingerprint />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", lineHeight: 1.25, display: "flex", alignItems: "center", gap: "6px" }}>
                Fingerprint
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", padding: "2px 6px", borderRadius: "5px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontWeight: 700 }}>
                  <IconLock /> Pro
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Professor patterns & exam intel
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => window.dispatchEvent(new Event("proffy:open-upload"))}
            className="sidebar-item"
            style={{
              display: "flex", alignItems: "center", gap: "12px", width: "100%",
              padding: "13px 14px", borderRadius: "10px", textAlign: "left",
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)",
            }}>
              <IconFingerprint />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)", lineHeight: 1.25 }}>Fingerprint</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Professor patterns & exam intel</div>
            </div>
          </button>
        )}
      </div>

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

              {USER_PLAN !== "max" && (
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
            background: "linear-gradient(135deg,#4f8ef7,#a78bfa)",
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
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} currentPlan={USER_PLAN} />
    </div>
  );
}
