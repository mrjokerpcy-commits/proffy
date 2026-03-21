"use client";
import { motion } from "framer-motion";
import type { Course } from "@/lib/types";

interface Props {
  course: Course;
  flashcardsDue?: number;
  professorPatterns?: { topic: string; pct: number }[];
  userPlan?: "free" | "pro" | "max";
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px",
    }}>
      {children}
    </div>
  );
}

function Card({ children, delay = 0, urgent = false }: { children: React.ReactNode; delay?: number; urgent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: "8px", padding: "16px",
        background: urgent ? "rgba(239,68,68,0.06)" : "var(--bg-elevated)",
        border: `1px solid ${urgent ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </motion.div>
  );
}

export default function RightPanel({ course, flashcardsDue = 0, professorPatterns, userPlan = "free" }: Props) {
  const days = daysUntil(course.exam_date);
  const isUrgent = days !== null && days <= 7;

  // Computed progress: fewer days = more prepared (proxy)
  const preparedPct = days !== null
    ? Math.min(100, Math.max(5, Math.round(100 - (days / 60) * 100)))
    : null;

  const prepColor = !days ? "var(--green)"
    : days <= 7 ? "var(--red)"
    : days <= 14 ? "var(--amber)"
    : "var(--blue)";

  return (
    <div style={{
      height: "100%", overflowY: "auto",
      padding: "1rem 0.875rem",
      display: "flex", flexDirection: "column", gap: "0.75rem",
      background: "var(--bg-surface)",
    }}>

      {/* ── 1. Exam Countdown ── */}
      <Card delay={0.05} urgent={isUrgent}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <SectionLabel>Exam countdown</SectionLabel>
          {isUrgent && (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--red)", background: "rgba(248,113,113,0.12)", padding: "2px 7px", borderRadius: "999px", marginTop: "-4px" }}>
              🔥 SOON
            </span>
          )}
        </div>

        {course.exam_date && days !== null ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "4px" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1, color: prepColor }}>{Math.max(0, days)}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", paddingBottom: "4px" }}>days left</div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
              {new Date(course.exam_date).toLocaleDateString("en-IL", { day: "numeric", month: "short" })}
              {days <= 0 ? " — Today!" : days === 1 ? " — Tomorrow" : ""}
            </div>
            {preparedPct !== null && (
              <>
                <div style={{ height: "4px", borderRadius: "4px", background: "var(--border)", marginBottom: "5px", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${preparedPct}%` }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    style={{ height: "100%", borderRadius: "4px", background: `linear-gradient(90deg, #4f8ef7, #a78bfa)` }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)" }}>
                  <span>Progress</span>
                  <span>{preparedPct}%</span>
                </div>
              </>
            )}
          </>
        ) : (
          <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--text-muted)" }}>
            No exam date set.<br />Ask Proffy to set one.
          </p>
        )}
      </Card>

      {/* ── 2. Professor Patterns ── */}
      {userPlan === "free" ? (
        /* Locked for free users */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          style={{
            borderRadius: "8px", padding: "16px",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Blur overlay */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            background: "rgba(13,13,24,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "8px", borderRadius: "8px",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "3px" }}>
                Pro feature
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5, maxWidth: "140px" }}>
                Unlock professor fingerprinting
              </div>
            </div>
            <a
              href="/settings"
              style={{
                fontSize: "11px", fontWeight: 700, padding: "5px 12px",
                borderRadius: "7px", textDecoration: "none",
                background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                color: "#000",
              }}
            >
              Upgrade to Pro →
            </a>
          </div>

          {/* Ghost content behind blur */}
          <div style={{ opacity: 0.25 }}>
            <SectionLabel>
              {course.professor ? `${course.professor} always asks` : "Professor patterns"}
            </SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[["Proofs & derivations", 72], ["Edge cases", 58], ["Theory", 45]].map(([t, pct]) => (
                <div key={t as string}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{t}</span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{pct}%</span>
                  </div>
                  <div style={{ height: "3px", borderRadius: "3px", background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--blue)", borderRadius: "3px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <Card delay={0.1}>
          <SectionLabel>
            {course.professor ? `${course.professor} always asks` : "Professor patterns"}
          </SectionLabel>

          {professorPatterns && professorPatterns.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {professorPatterns.map(p => (
                <div key={p.topic}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)" }}>{p.topic}</span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{p.pct}%</span>
                  </div>
                  <div style={{ height: "3px", borderRadius: "3px", background: "var(--border)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.pct}%` }}
                      transition={{ delay: 0.2, duration: 0.6 }}
                      style={{ height: "100%", background: "var(--blue)", borderRadius: "3px" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "11px", lineHeight: 1.65, color: "var(--text-muted)", marginBottom: "10px" }}>
                Upload past exams and Proffy will learn{" "}
                {course.professor ? `Prof. ${course.professor}'s` : "your professor's"} exact
                patterns — topics that appear every year, trick questions, and point distribution.
              </p>
              <a
                href="/upload"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  fontSize: "11px", fontWeight: 600, color: "var(--blue)",
                  textDecoration: "none", padding: "5px 10px", borderRadius: "7px",
                  background: "var(--blue-dim)", border: "1px solid rgba(79,142,247,0.2)",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload past exams
              </a>
            </div>
          )}
        </Card>
      )}

      {/* ── 3. Flashcards Due ── */}
      <Card delay={0.15}>
        <SectionLabel>Flashcards due</SectionLabel>

        {flashcardsDue > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "4px" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1, color: "var(--purple)" }}>{flashcardsDue}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", paddingBottom: "4px" }}>to review</div>
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "12px" }}>
              Spaced repetition keeps these fresh.
            </p>
            <a
              href="/flashcards"
              style={{
                display: "block", textAlign: "center", padding: "7px",
                borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                background: "rgba(167,139,250,0.12)", color: "var(--purple)",
                border: "1px solid rgba(167,139,250,0.25)", textDecoration: "none",
              }}
            >
              Start review →
            </a>
          </>
        ) : (
          <div>
            <p style={{ fontSize: "11px", lineHeight: 1.65, color: "var(--text-muted)", marginBottom: "10px" }}>
              No flashcards yet. Ask Proffy to generate some from your material.
            </p>
            <div style={{ display: "flex", gap: "3px" }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ flex: 1, height: "3px", borderRadius: "3px", background: "var(--border)" }} />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── 4. Study mode ── */}
      <Card delay={0.2} urgent={isUrgent}>
        <SectionLabel>Study mode</SectionLabel>
        <p style={{ fontSize: "11px", lineHeight: 1.7, color: "var(--text-secondary)" }}>
          {isUrgent
            ? "🔥 Exam prep — focus on past exam questions and weak spots only."
            : days !== null && days <= 14
            ? "⚡ Intensive — pick up the pace, prioritize high-yield topics."
            : "📖 Learning — build understanding, ask Proffy to quiz you as you go."}
        </p>
      </Card>

      {/* ── 5. Course info ── */}
      <Card delay={0.25}>
        <SectionLabel>Course info</SectionLabel>
        <dl style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {([
            ["Professor", course.professor],
            ["University", course.university],
            ["Semester", course.semester],
            ["Goal", course.goal],
            ["Level", course.user_level],
            ["Hours/week", course.hours_per_week ? `${course.hours_per_week}h` : null],
          ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <dt style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>{label}</dt>
              <dd style={{ fontSize: "11px", textAlign: "right", textTransform: "capitalize", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

    </div>
  );
}
