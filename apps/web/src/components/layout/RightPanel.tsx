"use client";
import { motion } from "framer-motion";
import type { Course } from "@/lib/types";
import { useLang } from "@/components/ui/LangToggle";

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
  const [lang] = useLang();
  const isRTL = lang === "he" || lang === "ar";
  const t = (he: string, en: string, ar: string) => lang === "he" ? he : lang === "ar" ? ar : en;
  const locale = lang === "he" ? "he-IL" : lang === "ar" ? "ar-SA" : "en-IL";

  const days = daysUntil(course.exam_date);
  const isUrgent = days !== null && days <= 7;

  const preparedPct = days !== null
    ? Math.min(100, Math.max(5, Math.round(100 - (days / 60) * 100)))
    : null;

  const prepColor = !days ? "var(--green)"
    : days <= 7 ? "var(--red)"
    : days <= 14 ? "var(--amber)"
    : "var(--blue)";

  const profLabel = course.professor
    ? `${course.professor} ${t("תמיד שואל", "always asks", "دائمًا يسأل")}`
    : t("תבניות פרופסור", "Professor patterns", "أنماط الأستاذ");

  const studyModeText = isUrgent
    ? t("🔥 הכנה לבחינה — התמקד בשאלות ממבחנים ישנים ונקודות חולשה בלבד.", "🔥 Exam prep — focus on past exam questions and weak spots only.", "🔥 الاستعداد للامتحان — ركز على أسئلة الامتحانات السابقة ونقاط الضعف فقط.")
    : days !== null && days <= 14
    ? t("⚡ אינטנסיבי — הגבר קצב, תעדף נושאים בעלי תשואה גבוהה.", "⚡ Intensive — pick up the pace, prioritize high-yield topics.", "⚡ مكثف — ارفع الوتيرة وأعطِ الأولوية للموضوعات عالية التأثير.")
    : t("📖 למידה — בנה הבנה, בקש מ-Proffy לבחון אותך.", "📖 Learning — build understanding, ask Proffy to quiz you as you go.", "📖 تعلم — ابنِ الفهم واطلب من Proffy اختبارك.");

  const courseInfoRows: [string, string | null | undefined][] = [
    [t("פרופסור", "Professor", "الأستاذ"), course.professor],
    [t("אוניברסיטה", "University", "الجامعة"), course.university],
    [t("סמסטר", "Semester", "الفصل"), course.semester],
    [t("מטרה", "Goal", "الهدف"), course.goal],
    [t("רמה", "Level", "المستوى"), course.user_level],
    [t("שעות/שבוע", "Hours/week", "ساعات/أسبوع"), course.hours_per_week ? `${course.hours_per_week}h` : null],
  ];

  return (
    <div style={{
      height: "100%", overflowY: "auto",
      padding: "1rem 0.875rem",
      display: "flex", flexDirection: "column", gap: "0.75rem",
      background: "var(--bg-surface)",
      direction: isRTL ? "rtl" : "ltr",
    }}>

      {/* ── 1. Exam Countdown ── */}
      <Card delay={0.05} urgent={isUrgent}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <SectionLabel>{t("ספירה לאחור לבחינה", "Exam countdown", "العد التنازلي للامتحان")}</SectionLabel>
          {isUrgent && (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--red)", background: "rgba(248,113,113,0.12)", padding: "2px 7px", borderRadius: "999px", marginTop: "-4px" }}>
              🔥 {t("בקרוב", "SOON", "قريبًا")}
            </span>
          )}
        </div>

        {course.exam_date && days !== null ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "4px" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1, color: prepColor }}>{Math.max(0, days)}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", paddingBottom: "4px" }}>{t("ימים נותרו", "days left", "أيام متبقية")}</div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
              {new Date(course.exam_date).toLocaleDateString(locale, { day: "numeric", month: "short" })}
              {days <= 0 ? ` — ${t("היום!", "Today!", "اليوم!")}` : days === 1 ? ` — ${t("מחר", "Tomorrow", "غدًا")}` : ""}
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
                  <span>{t("התקדמות", "Progress", "التقدم")}</span>
                  <span>{preparedPct}%</span>
                </div>
              </>
            )}
          </>
        ) : (
          <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--text-muted)" }}>
            {t("לא הוגדר תאריך בחינה.", "No exam date set.", "لم يُحدَّد تاريخ الامتحان.")}<br />
            {t("בקש מ-Proffy להגדיר אחד.", "Ask Proffy to set one.", "اطلب من Proffy تحديده.")}
          </p>
        )}
      </Card>

      {/* ── 2. Professor Patterns ── */}
      {userPlan === "free" ? (
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
                {t("תכונת Pro", "Pro feature", "ميزة Pro")}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5, maxWidth: "140px" }}>
                {t("פתח טביעת אצבע של הפרופסור", "Unlock professor fingerprinting", "افتح بصمة الأستاذ")}
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
              {t("שדרג ל-Pro →", "Upgrade to Pro →", "الترقية إلى Pro →")}
            </a>
          </div>

          <div style={{ opacity: 0.25 }}>
            <SectionLabel>{profLabel}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[["Proofs & derivations", 72], ["Edge cases", 58], ["Theory", 45]].map(([tp, pct]) => (
                <div key={tp as string}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{tp}</span>
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
          <SectionLabel>{profLabel}</SectionLabel>

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
                {t(
                  `העלה מבחנים ישנים ו-Proffy ילמד את התבניות${course.professor ? ` של פרופ' ${course.professor}` : ""}.`,
                  `Upload past exams and Proffy will learn${course.professor ? ` Prof. ${course.professor}'s` : " your professor's"} exact patterns — topics that appear every year, trick questions, and point distribution.`,
                  `ارفع الامتحانات السابقة وسيتعلم Proffy أنماط${course.professor ? ` الأستاذ ${course.professor}` : " أستاذك"} الدقيقة.`
                )}
              </p>
              <button
                onClick={() => window.dispatchEvent(new Event("proffy:open-upload"))}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  fontSize: "11px", fontWeight: 600, color: "var(--blue)",
                  padding: "5px 10px", borderRadius: "7px", cursor: "pointer",
                  background: "var(--blue-dim)", border: "1px solid rgba(79,142,247,0.2)",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {t("העלה מבחנים ישנים", "Upload past exams", "ارفع امتحانات سابقة")}
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ── 3. Flashcards Due ── */}
      <Card delay={0.15}>
        <SectionLabel>{t("כרטיסיות לחזרה", "Flashcards due", "البطاقات المستحقة")}</SectionLabel>

        {flashcardsDue > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "4px" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1, color: "var(--purple)" }}>{flashcardsDue}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", paddingBottom: "4px" }}>{t("לחזרה", "to review", "للمراجعة")}</div>
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "12px" }}>
              {t("חזרה מרווחת שומרת על רעננות הזיכרון.", "Spaced repetition keeps these fresh.", "المراجعة المتباعدة تحافظ على الذاكرة.")}
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
              {t("התחל חזרה →", "Start review →", "ابدأ المراجعة →")}
            </a>
          </>
        ) : (
          <div>
            <p style={{ fontSize: "11px", lineHeight: 1.65, color: "var(--text-muted)", marginBottom: "10px" }}>
              {t("אין כרטיסיות עדיין. בקש מ-Proffy ליצור מהחומר שלך.", "No flashcards yet. Ask Proffy to generate some from your material.", "لا توجد بطاقات بعد. اطلب من Proffy إنشاءها من مادتك.")}
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
        <SectionLabel>{t("מצב לימוד", "Study mode", "وضع الدراسة")}</SectionLabel>
        <p style={{ fontSize: "11px", lineHeight: 1.7, color: "var(--text-secondary)" }}>
          {studyModeText}
        </p>
      </Card>

      {/* ── 5. Course info ── */}
      <Card delay={0.25}>
        <SectionLabel>{t("פרטי הקורס", "Course info", "معلومات المقرر")}</SectionLabel>
        <dl style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {courseInfoRows.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <dt style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>{label}</dt>
              <dd style={{ fontSize: "11px", textAlign: isRTL ? "left" : "right", textTransform: "capitalize", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

    </div>
  );
}
