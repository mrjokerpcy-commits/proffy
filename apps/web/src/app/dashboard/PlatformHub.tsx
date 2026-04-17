"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LangToggle from "@/components/ui/LangToggle";

const PLATFORMS = [
  {
    id: "uni",
    name: "Proffy Uni",
    nameHe: "אוניברסיטה",
    description: "AI chat per course, flashcards, exam upload, professor patterns",
    icon: "🎓",
    color: "#4f8ef7",
    gradient: "linear-gradient(135deg, #4f8ef7 0%, #6366f1 100%)",
    url: process.env.NODE_ENV === "production" ? "https://uni.proffy.study/dashboard" : "/dashboard",
  },
  {
    id: "psycho",
    name: "Proffy Psycho",
    nameHe: "פסיכומטרי",
    description: "Adaptive practice tests, score prediction, verbal and quantitative prep",
    icon: "🧠",
    color: "#a78bfa",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)",
    url: process.env.NODE_ENV === "production" ? "https://psycho.proffy.study/dashboard" : "/dashboard",
  },
  {
    id: "yael",
    name: "Proffy Yael",
    nameHe: "יע\"ל",
    description: "Hebrew reading comprehension, vocabulary, and exam strategies",
    icon: "📖",
    color: "#34d399",
    gradient: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
    url: process.env.NODE_ENV === "production" ? "https://yael.proffy.study/dashboard" : "/dashboard",
  },
  {
    id: "bagrut",
    name: "Proffy Bagrut",
    nameHe: "בגרות",
    description: "Matriculation exam prep for all subjects, practice and revision",
    icon: "📝",
    color: "#fbbf24",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
    url: process.env.NODE_ENV === "production" ? "https://bagrut.proffy.study/dashboard" : "/dashboard",
  },
] as const;

interface Props {
  firstName: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  platformPlans: Record<string, string>;
  uniStats: { courses: number; fc_due: number; messages: number } | null;
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    free:  { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)", label: "Free" },
    pro:   { bg: "rgba(79,142,247,0.15)",  text: "#4f8ef7",               label: "Pro" },
    max:   { bg: "rgba(167,139,250,0.15)", text: "#a78bfa",               label: "Max" },
  };
  const c = colors[plan] ?? colors.free;
  return (
    <span style={{
      fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em",
      textTransform: "uppercase" as const,
      background: c.bg, color: c.text,
      borderRadius: "99px", padding: "3px 10px",
    }}>
      {c.label}
    </span>
  );
}

export default function PlatformHub({ firstName, userName, userEmail, userImage, platformPlans, uniStats }: Props) {
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activating, setActivating] = useState<string | null>(null);
  const [showCodeFor, setShowCodeFor] = useState<string | null>(null);

  async function activate(platformId: string) {
    const code = codeInputs[platformId] ?? "";
    if (!code.trim()) {
      setErrors(e => ({ ...e, [platformId]: "Enter your access code" }));
      return;
    }
    setActivating(platformId);
    setErrors(e => ({ ...e, [platformId]: "" }));
    try {
      const res = await fetch("/api/platform/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platformId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(e => ({ ...e, [platformId]: data.error ?? "Invalid code" }));
      } else {
        window.location.reload();
      }
    } finally {
      setActivating(null);
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* ── Header ── */}
      <header style={{
        height: "64px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "0 32px",
        justifyContent: "space-between",
        background: "var(--bg-surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-owl.png" alt="Proffy" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Proffy
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LangToggle />
          <ThemeToggle />
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "linear-gradient(135deg, #4f8ef7, #a78bfa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 700, color: "#fff",
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{userEmail}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              fontSize: "13px", color: "var(--text-muted)", background: "none",
              border: "1px solid var(--border)", borderRadius: "6px",
              padding: "5px 12px", cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px" }}>
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: "40px" }}
        >
          <h1 style={{
            fontSize: "28px", fontWeight: 800, color: "var(--text-primary)",
            letterSpacing: "-0.02em", marginBottom: "6px",
          }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
            Choose a platform to continue studying
          </p>
        </motion.div>

        {/* Platform cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
          gap: "20px",
        }}>
          {PLATFORMS.map((p, i) => {
            const plan = platformPlans[p.id];
            const isActivated = !!plan;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  opacity: isActivated ? 1 : 0.75,
                }}
              >
                {/* Card top bar */}
                <div style={{
                  height: "4px",
                  background: p.gradient,
                }} />

                <div style={{ padding: "24px" }}>
                  {/* Icon + name row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "10px",
                        background: p.gradient,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "22px",
                      }}>
                        {p.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</div>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{p.nameHe}</div>
                      </div>
                    </div>
                    {isActivated && <PlanBadge plan={plan} />}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
                    {p.description}
                  </p>

                  {/* Stats (Uni only for now) */}
                  {isActivated && p.id === "uni" && uniStats && (
                    <div style={{
                      display: "flex", gap: "16px", marginBottom: "20px",
                      padding: "12px 16px",
                      background: "var(--bg-elevated)",
                      borderRadius: "8px",
                    }}>
                      <div style={{ textAlign: "center" as const }}>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{uniStats.courses}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Courses</div>
                      </div>
                      <div style={{ width: "1px", background: "var(--border)" }} />
                      <div style={{ textAlign: "center" as const }}>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: uniStats.fc_due > 0 ? "#fbbf24" : "var(--text-primary)" }}>{uniStats.fc_due}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Cards due</div>
                      </div>
                      <div style={{ width: "1px", background: "var(--border)" }} />
                      <div style={{ textAlign: "center" as const }}>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{uniStats.messages}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Messages</div>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <a
                    href={p.url}
                    style={{
                      display: "block", textAlign: "center" as const,
                      padding: "10px", borderRadius: "8px",
                      background: isActivated ? p.gradient : "var(--bg-elevated)",
                      border: isActivated ? "none" : "1px solid var(--border)",
                      color: isActivated ? "#fff" : "var(--text-secondary)",
                      fontWeight: 700, fontSize: "14px",
                      textDecoration: "none",
                    }}
                  >
                    {isActivated ? `Open ${p.name}` : "Get Started Free"}
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
