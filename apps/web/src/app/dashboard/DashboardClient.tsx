"use client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LangToggle, { useLang } from "@/components/ui/LangToggle";

const BLUE     = "#4f8ef7";
const BLUE_RGB = "79,142,247";

const COURSE_COLORS = ["#4f8ef7","#a78bfa","#34d399","#f59e0b","#f87171","#38bdf8","#fb923c","#e879f9"];
const courseColor = (c: any, idx: number) => c.color || COURSE_COLORS[idx % COURSE_COLORS.length];
const courseRgb   = (hex: string) => {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
};

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
      setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * value));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

function formatTimeAgo(date: string | null) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Icons = {
  Chat: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  File: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Cards: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  Note: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Arrow: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  Clock: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Calendar: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Bolt: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  Book: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
};

// ── Activity bar ──────────────────────────────────────────────────────────────
function ActivityBar({ courseStats, tActivity }: { courseStats: any[]; tActivity: string }) {
  const active = courseStats.filter((c: any) => c.message_count > 0);
  const total  = active.reduce((s: number, c: any) => s + c.message_count, 0);

  if (total === 0) return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: "4px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>No activity yet</div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Start a conversation to see your study breakdown</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {tActivity}
      </div>
      <div style={{ display: "flex", height: "6px", borderRadius: "99px", overflow: "hidden", gap: "2px", marginBottom: "14px" }}>
        {active.map((c: any, i: number) => (
          <div key={c.id} style={{ flex: c.message_count, background: courseColor(c, i), minWidth: "4px",
            borderRadius: i === 0 ? "99px 0 0 99px" : i === active.length - 1 ? "0 99px 99px 0" : "0" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
        {active.map((c: any, i: number) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "3px", background: courseColor(c, i), flexShrink: 0 }} />
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
  const [lang] = useLang();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isRTL = lang === "he" || lang === "ar";
  const t = (he: string, en: string, ar: string) => lang === "he" ? he : lang === "ar" ? ar : en;

  const totalMessages  = courseStats.reduce((s: number, c: any) => s + (c.message_count  || 0), 0);
  const totalMaterials = courseStats.reduce((s: number, c: any) => s + (c.material_count || 0), 0);
  const usagePct = tokenLimit > 0 ? Math.min(100, Math.round(monthTokens / tokenLimit * 100)) : 0;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12
    ? t("בוקר טוב", "Good morning", "صباح الخير")
    : greetingHour < 18
    ? t("צהריים טובים", "Good afternoon", "نهارك سعيد")
    : t("ערב טוב", "Good evening", "مساء الخير");

  const stats = [
    { label: t("שיחות", "Conversations", "المحادثات"), value: totalMessages,  color: BLUE,      colorRgb: BLUE_RGB,     icon: <Icons.Chat  /> },
    { label: t("חומרים", "Materials",    "المواد"),    value: totalMaterials, color: "#34d399", colorRgb: "52,211,153", icon: <Icons.File  /> },
    { label: t("כרטיסיות", "Flashcards", "البطاقات"),  value: fcDue,          color: "#a78bfa", colorRgb: "167,139,250",icon: <Icons.Cards /> },
    { label: t("הערות", "Notes",         "الملاحظات"), value: notesCount,     color: "#f59e0b", colorRgb: "245,158,11", icon: <Icons.Note  /> },
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", position: "relative" }}>
      {/* Ambient glow */}
      <div aria-hidden="true" style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "700px", height: "400px", borderRadius: "50%", background: `radial-gradient(ellipse at 50% 0%, rgba(${BLUE_RGB},0.07) 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

    <div style={{
      padding: isMobile ? "20px 16px" : "clamp(24px,3vw,40px) clamp(20px,3vw,36px)",
      maxWidth: "1100px", margin: "0 auto",
      direction: isRTL ? "rtl" : "ltr",
      position: "relative", zIndex: 1,
    }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ marginBottom: isMobile ? "20px" : "28px" }}>
        <h1 style={{ fontSize: "clamp(1.35rem,3vw,1.9rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "6px" }}>
          {greeting}, {firstName} 👋
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
            {nextExam
              ? <>{t("הבחינה הבאה:", "Next exam:", "الامتحان القادم:")} <span style={{ color: nextExam.days <= 7 ? "#f87171" : nextExam.days <= 14 ? "#fbbf24" : "var(--text-secondary)", fontWeight: 700 }}>{nextExam.name}</span> {t(`בעוד ${nextExam.days} ימים`, `in ${nextExam.days} day${nextExam.days !== 1 ? "s" : ""}`, `خلال ${nextExam.days} أيام`)}</>
              : courses.length === 0
              ? t("הוסף את הקורס הראשון שלך כדי להתחיל", "Add your first course to get started", "أضف أول مقرر لك للبدء")
              : t(`${courses.length} קורסים פעילים`, `${courses.length} course${courses.length !== 1 ? "s" : ""} active`, `${courses.length} مقررات نشطة`)}
          </p>
          {nextExam && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", background: (nextExam.days <= 7 ? "rgba(248,113,113,0.1)" : "rgba(79,142,247,0.08)"), border: `1px solid ${nextExam.days <= 7 ? "rgba(248,113,113,0.3)" : `rgba(${BLUE_RGB},0.2)`}`, borderRadius: "8px", padding: "2px 8px" }}>
              <Icons.Calendar />
              <span style={{ fontSize: "11px", fontWeight: 700, color: nextExam.days <= 7 ? "#f87171" : BLUE }}>{nextExam.days}d</span>
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.04 }}
        style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "10px", marginBottom: "16px" }}>
        {stats.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 + i * 0.05 }}
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", cursor: "default" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 24px rgba(${s.colorRgb},0.14)`; (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${s.colorRgb},0.3)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
          >
            <div style={{ height: "3px", background: `linear-gradient(90deg, ${s.color}, ${s.color}66)` }} />
            <div style={{ padding: isMobile ? "14px 14px 12px" : "18px 18px 16px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "9px", background: `rgba(${s.colorRgb},0.12)`, color: s.color, marginBottom: "12px" }}>
                {s.icon}
              </div>
              <div style={{ fontSize: isMobile ? "22px" : "26px", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", lineHeight: 1, marginBottom: "4px" }}>
                <Counter value={s.value} />
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Usage + Activity ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}
        style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.8fr", gap: "12px", marginBottom: "24px" }}>

        {/* Usage card */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ height: "3px", background: `linear-gradient(90deg, ${BLUE}, ${BLUE}66)` }} />
          <div style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "3px" }}>
                  {t("שימוש חודשי", "Monthly usage", "الاستخدام الشهري")}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {(monthTokens / 1000).toFixed(0)}K / {(tokenLimit / 1000).toFixed(0)}K tokens
                </div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", color: usagePct > 85 ? "#f87171" : usagePct > 60 ? "#fbbf24" : "var(--text-primary)" }}>
                {usagePct}%
              </div>
            </div>
            <div style={{ height: "5px", borderRadius: "99px", background: "var(--bg-elevated)", overflow: "hidden", marginBottom: "14px" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                style={{ height: "100%", borderRadius: "99px", background: usagePct > 85 ? "#f87171" : usagePct > 60 ? "#fbbf24" : `linear-gradient(90deg, ${BLUE}, #a78bfa)` }} />
            </div>
            {userPlan === "free" ? (
              <Link href="/checkout" style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: BLUE, textDecoration: "none" }}>
                {t("שדרג תוכנית", "Upgrade plan", "ترقية الخطة")} <Icons.Arrow />
              </Link>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
                {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} {t("תוכנית", "plan", "خطة")}
              </div>
            )}
          </div>
        </div>

        {/* Activity card */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ height: "3px", background: `linear-gradient(90deg, #a78bfa, #4f8ef7)` }} />
          <div style={{ padding: "18px", height: "calc(100% - 3px)", boxSizing: "border-box" }}>
            <ActivityBar courseStats={courseStats} tActivity={t("פעילות לפי קורס", "Activity by course", "النشاط حسب المقرر")} />
          </div>
        </div>
      </motion.div>

      {/* ── Start studying CTA ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.22 }}
        style={{ marginBottom: "24px" }}>
        <button
          onClick={() => router.push(`/chat?new=${Date.now()}`)}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "12px", background: `linear-gradient(135deg, ${BLUE}, #6366f1)`, border: "none", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 20px rgba(${BLUE_RGB},0.3)`, transition: "opacity 0.15s, transform 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
        >
          <Icons.Bolt />
          {t("התחל ללמוד", "Start studying", "ابدأ الدراسة")}
          <Icons.Arrow />
        </button>
      </motion.div>

      {/* ── Empty state ── */}
      {courses.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ height: "3px", background: `linear-gradient(90deg, ${BLUE}, #6366f1)` }} />
          <div style={{ padding: "48px 32px", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: `rgba(${BLUE_RGB},0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: BLUE }}>
              <Icons.Book />
            </div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
              {t("הוסף את הקורס הראשון שלך", "Add your first course", "أضف أول مقرر لك")}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px", maxWidth: "300px", margin: "0 auto 24px" }}>
              {t("העלה שקפים, PDF או הרצאות והתחל ללמוד עם AI.", "Upload your slides, PDFs, or lecture notes and start studying with AI.", "ارفع الشرائح أو الملفات وابدأ الدراسة مع الذكاء الاصطناعي.")}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => router.push("/courses/new")}
                style={{ display: "flex", alignItems: "center", gap: "7px", padding: "11px 22px", borderRadius: "10px", background: `linear-gradient(135deg, ${BLUE}, #6366f1)`, border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                <Icons.Plus /> {t("הוסף קורס", "Add course", "إضافة مقرر")}
              </button>
              <button onClick={() => router.push("/chat")}
                style={{ padding: "11px 22px", borderRadius: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                {t("פתח צ'אט", "Open chat", "فتح المحادثة")}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Course cards ── */}
      {courses.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {t("הקורסים שלך", "Your courses", "مقرراتك")}
            </span>
            <button onClick={() => router.push("/courses/new")}
              style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: BLUE, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <Icons.Plus /> {t("הוסף", "Add", "إضافة")}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`, gap: "12px" }}>
            {courseStats.map((c: any, i: number) => {
              const col      = courseColor(c, i);
              const rgb      = courseRgb(col);
              const examDays = c.exam_date ? Math.ceil((new Date(c.exam_date).getTime() - Date.now()) / 86400000) : null;
              const lastChat = formatTimeAgo(c.last_chat);
              const urgency  = examDays !== null && examDays >= 0 ? (examDays <= 7 ? "#f87171" : examDays <= 14 ? "#fbbf24" : "#34d399") : null;

              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", cursor: "default", transition: "box-shadow 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(${rgb},0.16)`; (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${rgb},0.35)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
                >
                  {/* Color bar */}
                  <div style={{ height: "3px", background: `linear-gradient(90deg, ${col}, ${col}88)` }} />

                  <div style={{ padding: "18px 20px 16px", display: "flex", flexDirection: "column" }}>
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "14px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0, background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.2)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 800, color: col }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        {c.professor && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.professor}</div>}
                      </div>
                      {urgency && examDays !== null && examDays >= 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", background: urgency + "15", border: `1px solid ${urgency}40`, borderRadius: "7px", padding: "3px 7px", flexShrink: 0 }}>
                          <Icons.Calendar />
                          <span style={{ fontSize: "11px", fontWeight: 700, color: urgency }}>{examDays}d</span>
                        </div>
                      )}
                    </div>

                    {/* Mini stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                      <div style={{ background: "var(--bg-elevated)", borderRadius: "9px", padding: "9px 12px" }}>
                        <div style={{ fontSize: "17px", fontWeight: 800, color: col, letterSpacing: "-0.03em" }}>{c.message_count}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginTop: "1px", letterSpacing: "0.04em" }}>{t("הודעות", "MSGS", "رسائل")}</div>
                      </div>
                      <div style={{ background: "var(--bg-elevated)", borderRadius: "9px", padding: "9px 12px" }}>
                        <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "-0.03em" }}>{c.material_count}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginTop: "1px", letterSpacing: "0.04em" }}>{t("חומרים", "FILES", "ملفات")}</div>
                      </div>
                    </div>

                    {lastChat && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                        <Icons.Clock /> {t("נלמד לאחרונה", "Last studied", "آخر دراسة")} {lastChat}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => router.push(`/chat?courseId=${c.id}`)}
                        style={{ flex: 1, padding: "10px 0", borderRadius: "9px", fontSize: "13px", fontWeight: 700, background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.25)`, color: col, cursor: "pointer", transition: "background 0.12s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.2)`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.12)`; }}>
                        {t("פתח שיחה", "Open chat", "فتح محادثة")}
                      </button>
                      <button onClick={() => router.push(`/course/${c.id}`)}
                        style={{ padding: "10px 14px", borderRadius: "9px", fontSize: "12px", fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
                        {t("פרטים", "Details", "تفاصيل")}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent conversations ── */}
      {recentSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            {t("שיחות אחרונות", "Recent conversations", "المحادثات الأخيرة")}
          </div>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            {recentSessions.map((s: any, i: number) => (
              <motion.button key={s.id}
                initial={{ opacity: 0, x: isRTL ? 6 : -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => router.push(s.course_id ? `/chat?courseId=${s.course_id}` : "/chat")}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 18px", width: "100%", background: "none", border: "none", borderBottom: i < recentSessions.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", textAlign: isRTL ? "right" : "left", transition: "background 0.12s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, background: s.color || COURSE_COLORS[i % COURSE_COLORS.length] }} />
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {s.course_name ?? t("שיחה כללית", "General chat", "محادثة عامة")}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                  {s.message_count} {t("הודעות", "msgs", "رسائل")}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {formatTimeAgo(s.created_at)}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

    </div>
    </div>
  );
}
