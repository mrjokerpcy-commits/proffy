import Link from "next/link";
import Image from "next/image";
import { InfiniteGrid } from "@/components/ui/the-infinite-grid";

interface Course {
  id: string;
  name: string;
  exam_date: string | null;
  color: string | null;
  created_at: string;
}

interface Props {
  firstName: string;
  courses: Course[];
  fcDue: number;
  notesCount: number;
  plan: string;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const d = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return d >= 0 ? d : null;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function CourseCard({ course }: { course: Course }) {
  const days = daysUntil(course.exam_date);
  const color = course.color ?? "#6366f1";
  const urgency = days !== null ? (days <= 7 ? "#f87171" : days <= 14 ? "#fbbf24" : "#34d399") : null;

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "18px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      position: "relative",
      overflow: "hidden",
      transition: "border-color 0.15s, box-shadow 0.15s",
    }}
      onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.boxShadow = `0 8px 32px ${color}18`; }}
      onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Color strip */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: color, borderRadius: "18px 18px 0 0" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${color}18`, border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        {days !== null && (
          <span style={{ fontSize: "11px", fontWeight: 700, color: urgency!, background: `${urgency}14`, border: `1px solid ${urgency}30`, borderRadius: "99px", padding: "3px 9px", whiteSpace: "nowrap", flexShrink: 0 }}>
            {days === 0 ? "Exam today" : `${days}d to exam`}
          </span>
        )}
      </div>

      {/* Course name */}
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "4px" }}>{course.name}</h3>
        {course.exam_date && days === null && (
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Exam passed</p>
        )}
        {!course.exam_date && (
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No exam date set</p>
        )}
      </div>

      {/* Open chat button */}
      <Link
        href={`/course/${course.id}`}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
          padding: "10px 0", borderRadius: "10px",
          background: `${color}14`, border: `1px solid ${color}30`,
          color: color, fontSize: "13px", fontWeight: 700,
          textDecoration: "none", transition: "background 0.12s, border-color 0.12s",
          marginTop: "auto",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Open Chat
      </Link>
    </div>
  );
}

export default function UniHome({ firstName, courses, fcDue, notesCount, plan }: Props) {
  const nextExam = courses
    .map(c => ({ name: c.name, days: daysUntil(c.exam_date) }))
    .filter(c => c.days !== null)
    .sort((a, b) => a.days! - b.days!)[0] ?? null;

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", position: "relative", overflow: "hidden" }}>

      <InfiniteGrid revealRadius={380} speed={0.3} />

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 max(28px,3vw)",
        background: "var(--nav-bg, rgba(11,11,30,0.88))",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "8px", overflow: "hidden", background: "linear-gradient(135deg,#6366f1,#a78bfa)", flexShrink: 0 }}>
            <Image src="/mascot/avatar.png" alt="Proffy" width={30} height={30} style={{ objectFit: "cover", width: "100%", height: "100%" }} draggable={false} priority />
          </div>
          <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.02em" }}>Proffy</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/settings" style={{ color: "var(--text-muted)", fontSize: "13px", textDecoration: "none" }}>Settings</Link>
          <Link href="/dashboard" style={{
            padding: "7px 16px", borderRadius: "9px", fontSize: "13px", fontWeight: 600,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", textDecoration: "none",
          }}>Open Chat</Link>
        </div>
      </nav>

      {/* ── Main ── */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "88px max(28px,3vw) 80px", position: "relative", zIndex: 1 }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px" }}>{today}</p>
          <h1 style={{ fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            {greeting()}, {firstName}.
          </h1>
          {nextExam && (
            <p style={{ marginTop: "8px", fontSize: "15px", color: "var(--text-secondary)" }}>
              Next up:{" "}
              <span style={{ color: nextExam.days! <= 7 ? "#f87171" : nextExam.days! <= 14 ? "#fbbf24" : "#34d399", fontWeight: 700 }}>
                {nextExam.name}
              </span>
              {" "}in {nextExam.days} day{nextExam.days !== 1 ? "s" : ""}.
            </p>
          )}
          {!nextExam && courses.length === 0 && (
            <p style={{ marginTop: "8px", fontSize: "15px", color: "var(--text-secondary)" }}>
              Add your first course to get started.
            </p>
          )}
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "40px" }}>
          {[
            { label: "Courses", value: courses.length, icon: "📚" },
            { label: "Flashcards due", value: fcDue, icon: "🃏", highlight: fcDue > 0 },
            { label: "Notes saved", value: notesCount, icon: "📝" },
            { label: "Plan", value: plan.charAt(0).toUpperCase() + plan.slice(1), icon: "⚡" },
          ].map(s => (
            <div key={s.label} style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "var(--bg-surface)", border: `1px solid ${s.highlight ? "rgba(248,113,113,0.3)" : "var(--border)"}`,
              borderRadius: "12px", padding: "12px 18px",
            }}>
              <span style={{ fontSize: "18px" }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: s.highlight ? "#f87171" : "var(--text-primary)" }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick actions ── */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "48px" }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "12px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: 700,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", textDecoration: "none",
            boxShadow: "0 4px 20px rgba(99,102,241,0.28)", transition: "transform 0.12s",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            General Chat
          </Link>
          {fcDue > 0 && (
            <Link href="/flashcards" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "12px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: 700,
              background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa",
              textDecoration: "none", transition: "background 0.12s",
            }}>
              🃏 Review {fcDue} flashcard{fcDue !== 1 ? "s" : ""}
            </Link>
          )}
          <Link href="/courses/new" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "12px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: 600,
            background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)",
            textDecoration: "none",
          }}>
            + Add course
          </Link>
        </div>

        {/* ── Courses ── */}
        {courses.length > 0 ? (
          <>
            <h2 style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "18px" }}>
              Your courses
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "16px" }}>
              {courses.map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "20px" }}>
            <Image src="/mascot/sleeping.png" alt="No courses yet" width={120} height={120} style={{ objectFit: "contain", margin: "0 auto 20px" }} draggable={false} />
            <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "10px" }}>No courses yet</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px", maxWidth: "360px", margin: "0 auto 24px" }}>
              Add a course to start uploading material and chatting with Proffy about your specific classes.
            </p>
            <Link href="/courses/new" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "12px 28px", borderRadius: "12px", fontSize: "14px", fontWeight: 700,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", textDecoration: "none",
            }}>
              + Add your first course
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
