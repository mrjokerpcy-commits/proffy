"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LangToggle from "@/components/ui/LangToggle";

const ACCENT = "#f59e0b";
const ACCENT_RGB = "245,158,11";

const SECTIONS = [
  { id: "reading",       labelEn: "Reading",       labelHe: "הבנת הנקרא",   href: "/yael/practice?section=reading" },
  { id: "completion",    labelEn: "Completion",    labelHe: "השלמת משפטים", href: "/yael/practice?section=completion" },
  { id: "reformulation", labelEn: "Reformulation", labelHe: "ניסוח מחדש",   href: "/yael/practice?section=reformulation" },
];

export default function YaelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [lang, setLang] = useState("en");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? (localStorage.getItem("proffy_lang") ?? "en") : "en";
    setLang(stored);
    const onLang = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener("proffy-lang", onLang);
    return () => window.removeEventListener("proffy-lang", onLang);
  }, []);

  const isRTL = lang === "he" || lang === "ar";
  const activeSectionId = SECTIONS.find(s => pathname?.includes(s.id))?.id ?? null;

  const userName = session?.user?.name ?? "";
  const userImage = session?.user?.image ?? null;
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      background: "var(--bg-base)", color: "var(--text-primary)",
      direction: isRTL ? "rtl" : "ltr",
    }}>
      {/* ── Top navigation ── */}
      <header style={{
        height: "56px", flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 20px", gap: "16px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 30,
        boxShadow: "0 1px 0 var(--border)",
      }}>
        {/* Logo */}
        <a
          href="/dashboard"
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            textDecoration: "none", flexShrink: 0,
          }}
        >
          <div style={{
            width: "30px", height: "30px", borderRadius: "8px",
            background: `linear-gradient(135deg, ${ACCENT}, #d97706)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "15px", boxShadow: `0 2px 8px rgba(${ACCENT_RGB},0.4)`,
          }}>
            📖
          </div>
          <span style={{
            fontWeight: 800, fontSize: "14px", letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}>
            {lang === "he" ? 'יע"ל by Proffy' : "Yael by Proffy"}
          </span>
        </a>

        {/* Section tabs — desktop */}
        <nav style={{
          display: "flex", alignItems: "center", gap: "2px",
          flex: 1, justifyContent: "center",
        }} className="hidden-mobile">
          {SECTIONS.map(s => {
            const active = activeSectionId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => router.push(s.href)}
                style={{
                  padding: "6px 16px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: active ? 700 : 500,
                  border: "none", cursor: "pointer",
                  background: active ? `rgba(${ACCENT_RGB},0.12)` : "transparent",
                  color: active ? ACCENT : "var(--text-secondary)",
                  transition: "all 0.12s",
                  position: "relative",
                }}
              >
                {lang === "he" ? s.labelHe : s.labelEn}
                {active && (
                  <motion.div
                    layoutId="yael-nav-indicator"
                    style={{
                      position: "absolute", bottom: "-1px", left: "50%", transform: "translateX(-50%)",
                      width: "80%", height: "2px",
                      background: `linear-gradient(90deg, ${ACCENT}, #d97706)`,
                      borderRadius: "2px 2px 0 0",
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: isRTL ? 0 : "auto", marginRight: isRTL ? "auto" : 0 }}>
          <LangToggle />
          <ThemeToggle />

          {/* User avatar */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: userImage ? "transparent" : `rgba(${ACCENT_RGB},0.15)`,
                border: `2px solid rgba(${ACCENT_RGB},0.3)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", overflow: "hidden", padding: 0,
                fontSize: "11px", fontWeight: 700, color: ACCENT,
              }}
            >
              {userImage
                ? <img src={userImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: "absolute", top: "calc(100% + 8px)",
                    right: isRTL ? "auto" : 0, left: isRTL ? 0 : "auto",
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderRadius: "12px", padding: "8px",
                    minWidth: "180px", zIndex: 100,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: "8px 10px 10px", borderBottom: "1px solid var(--border)", marginBottom: "6px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{userName}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{session?.user?.email}</div>
                  </div>
                  <a
                    href="/dashboard"
                    style={{ display: "block", padding: "8px 10px", borderRadius: "8px", fontSize: "13px", color: "var(--text-secondary)", textDecoration: "none", cursor: "pointer" }}
                    onClick={() => setShowUserMenu(false)}
                  >
                    {lang === "he" ? "כל הפלטפורמות" : "All platforms"}
                  </a>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    style={{
                      display: "block", width: "100%", textAlign: isRTL ? "right" : "left",
                      padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
                      color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer",
                    }}
                  >
                    {lang === "he" ? "התנתקות" : "Sign out"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button
            className="show-mobile"
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{
              display: "none",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: "4px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              overflow: "hidden", background: "var(--bg-surface)",
              borderBottom: "1px solid var(--border)", zIndex: 20,
            }}
          >
            <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {SECTIONS.map(s => {
                const active = activeSectionId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { router.push(s.href); setMobileMenuOpen(false); }}
                    style={{
                      padding: "10px 14px", borderRadius: "9px", textAlign: isRTL ? "right" : "left",
                      fontSize: "14px", fontWeight: active ? 700 : 500,
                      border: "none", cursor: "pointer",
                      background: active ? `rgba(${ACCENT_RGB},0.1)` : "transparent",
                      color: active ? ACCENT : "var(--text-secondary)",
                    }}
                  >
                    {lang === "he" ? s.labelHe : s.labelEn}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away for user menu */}
      {showUserMenu && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Page content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
