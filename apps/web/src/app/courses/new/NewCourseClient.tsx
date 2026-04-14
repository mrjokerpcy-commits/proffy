"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const UNIVERSITIES = ["TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Ariel", "Other"];
const LEVELS = [
  { val: "beginner", label: "Beginner",     desc: "Starting fresh" },
  { val: "some",     label: "Some background", desc: "Know the basics" },
  { val: "strong",   label: "Strong",       desc: "Comfortable with material" },
];
const GOALS = [
  { val: "pass",      icon: "✅", label: "Just pass" },
  { val: "good",      icon: "⭐", label: "Good grade" },
  { val: "excellent", icon: "🏆", label: "Top of class" },
];

export default function NewCourseClient({ userUniversity = "" }: { userUniversity?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", university: userUniversity, professor: "",
    course_number: "", exam_date: "", user_level: "", goal: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ name: string; course_number?: string; lecturer?: string }>>([]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function fetchTechnionSuggestions(query: string) {
    if (!query.trim() || form.university !== "Technion") {
      setSuggestions([]);
      return;
    }
    const res = await fetch(`/api/courses/technion?semester=2025b`).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json().catch(() => ({}));
    const rows = Array.isArray(data?.courses) ? data.courses : [];
    const q = query.toLowerCase();
    const matched = rows
      .filter((r: any) => `${r.name ?? ""} ${r.course_number ?? ""}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((r: any) => ({ name: r.name, course_number: r.course_number, lecturer: r.lecturer }));
    setSuggestions(matched);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Course name is required"); return; }
    if (!form.university)  { setError("Please select your university"); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        university: form.university,
        professor: form.professor.trim() || undefined,
        course_number: form.course_number.trim() || undefined,
        exam_date: form.exam_date || undefined,
        user_level: form.user_level || undefined,
        goal: form.goal || undefined,
      }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to create course");
      setSaving(false);
      return;
    }

    const { course } = await res.json();
    router.push(`/course/${course.id}`);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: "9px",
    background: "var(--bg-elevated)", border: "1px solid var(--border)",
    color: "var(--text-primary)", fontSize: "14px", outline: "none",
    fontFamily: "inherit", transition: "border-color 0.15s",
  };

  const optBtn = (selected: boolean): React.CSSProperties => ({
    padding: "10px 14px", borderRadius: "8px", cursor: "pointer", transition: "all 0.12s",
    border: `1px solid ${selected ? "rgba(79,142,247,0.5)" : "var(--border)"}`,
    background: selected ? "rgba(79,142,247,0.1)" : "var(--bg-elevated)",
    color: selected ? "var(--blue)" : "var(--text-secondary)",
    fontSize: "13px", fontWeight: selected ? 600 : 400,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: "0 24px", height: "56px", display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <h1 style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Add New Course</h1>
      </div>

      <div style={{ flex: 1, padding: "28px 24px", maxWidth: "600px", width: "100%" }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Course Name *
            </label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Algorithms, Linear Algebra, Data Structures"
              value={form.name}
              onChange={e => { set("name", e.target.value); fetchTechnionSuggestions(e.target.value); }}
              maxLength={200}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "rgba(79,142,247,0.5)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
            {form.university === "Technion" && suggestions.length > 0 && (
              <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                {suggestions.map((s) => (
                  <button
                    key={`${s.course_number}-${s.name}`}
                    type="button"
                    onClick={() => {
                      set("name", s.name ?? "");
                      if (s.course_number) set("course_number", s.course_number);
                      if (s.lecturer && !form.professor) set("professor", s.lecturer);
                      setSuggestions([]);
                    }}
                    style={{ ...optBtn(false), textAlign: "left" }}
                  >
                    {(s.course_number ? `${s.course_number} — ` : "") + s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* University — pre-filled from profile, show selector only if not set */}
          {userUniversity ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "9px", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>University:</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--blue)" }}>{userUniversity}</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto" }}>from your profile</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                University *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                {UNIVERSITIES.map(u => (
                  <button key={u} type="button" onClick={() => set("university", u)} style={{ ...optBtn(form.university === u), textAlign: "center", fontWeight: 600 }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Professor + Course number */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Professor</label>
              <input type="text" placeholder="Prof. Cohen" value={form.professor} onChange={e => set("professor", e.target.value)} maxLength={150} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(79,142,247,0.5)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Course Number</label>
              <input type="text" placeholder="0366-2115" value={form.course_number} onChange={e => set("course_number", e.target.value)} maxLength={30} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(79,142,247,0.5)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            </div>
          </div>

          {/* Exam date */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Exam Date</label>
            <input type="date" value={form.exam_date} onChange={e => set("exam_date", e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }}
              onFocus={e => (e.target.style.borderColor = "rgba(79,142,247,0.5)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
          </div>

          {/* Knowledge level */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your Knowledge Level</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
              {LEVELS.map(l => (
                <button key={l.val} type="button" onClick={() => set("user_level", l.val)} style={{ ...optBtn(form.user_level === l.val), display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>{l.label}</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{l.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Goal</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
              {GOALS.map(g => (
                <button key={g.val} type="button" onClick={() => set("goal", g.val)} style={{ ...optBtn(form.goal === g.val), textAlign: "center" }}>
                  <span style={{ marginRight: "6px" }}>{g.icon}</span>{g.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={() => router.back()}
              style={{ flex: 1, padding: "12px", borderRadius: "9px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: "12px", borderRadius: "9px", border: "none", background: "var(--blue)", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 2px 14px rgba(79,142,247,0.35)" }}>
              {saving ? "Creating…" : "Create Course →"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
