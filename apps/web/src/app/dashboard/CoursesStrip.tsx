"use client";
import Link from "next/link";

interface Course {
  id: string;
  name: string;
  professor?: string;
  university?: string;
  exam_date?: string | null;
}

interface Badge {
  days: number;
  color: string;
  bg: string;
  border: string;
}

function daysLabel(examDate: string | null | undefined): Badge | null {
  if (!examDate) return null;
  const days = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return null;
  if (days <= 7)  return { days, color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)" };
  if (days <= 14) return { days, color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.25)" };
  return              { days, color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  };
}

const ACCENTS = ["#4f8ef7","#a78bfa","#34d399","#fbbf24","#f87171","#60a5fa"];

export default function CoursesStrip({ courses }: { courses: Course[] }) {
  return (
    <div style={{
      flexShrink: 0, padding: "12px 20px",
      borderBottom: "1px solid var(--border)",
      overflowX: "auto",
      display: "flex", gap: "10px", alignItems: "stretch",
    }}>
      {courses.map((course, idx) => {
        const badge = daysLabel(course.exam_date);
        const accent = ACCENTS[idx % ACCENTS.length];
        return (
          <Link
            key={course.id}
            href={`/course/${course.id}`}
            style={{
              flexShrink: 0, width: "190px", display: "flex", flexDirection: "column",
              padding: "12px 14px", borderRadius: "10px",
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              textDecoration: "none", position: "relative", overflow: "hidden",
              transition: "border-color 0.15s, transform 0.12s, box-shadow 0.15s",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(255,255,255,0.16)";
              el.style.transform = "translateY(-1px)";
              el.style.boxShadow = "0 6px 24px rgba(0,0,0,0.35)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "var(--border)";
              el.style.transform = "none";
              el.style.boxShadow = "none";
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: accent }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {course.name}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[course.professor, course.university].filter(Boolean).join(" · ") || "No details"}
                </div>
              </div>
              {badge && (
                <div style={{ flexShrink: 0, padding: "3px 7px", borderRadius: "6px", background: badge.bg, border: `1px solid ${badge.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: "13px", fontWeight: 800, lineHeight: 1, color: badge.color }}>{badge.days}</div>
                  <div style={{ fontSize: "9px", color: badge.color, opacity: 0.7 }}>d</div>
                </div>
              )}
            </div>
          </Link>
        );
      })}

      {/* Add course card */}
      <Link
        href="/courses/new"
        style={{
          flexShrink: 0, width: "160px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "6px",
          padding: "12px", borderRadius: "10px",
          border: "1.5px dashed var(--border)", color: "var(--text-muted)",
          textDecoration: "none",
          transition: "border-color 0.15s, color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "rgba(79,142,247,0.5)";
          el.style.color = "var(--blue)";
          el.style.background = "rgba(79,142,247,0.05)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "var(--border)";
          el.style.color = "var(--text-muted)";
          el.style.background = "transparent";
        }}
      >
        <div style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1.5px dashed currentColor", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", lineHeight: 1 }}>+</div>
        <span style={{ fontSize: "12px", fontWeight: 600 }}>Add course</span>
      </Link>
    </div>
  );
}
