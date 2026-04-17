"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LangToggle from "@/components/ui/LangToggle";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const FADE = (delay = 0) => ({
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.4, delay, ease: EASE },
});

function GlassInput({
  type, value, onChange, placeholder, required, right,
}: {
  type: string; value: string; onChange: (v: string) => void;
  placeholder: string; required?: boolean; right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: "14px", border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        transition: "border-color 0.15s, background 0.15s", position: "relative",
      }}
      onFocusCapture={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(22,163,74,0.5)";
        el.style.background = "rgba(22,163,74,0.06)";
      }}
      onBlurCapture={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--border)";
        el.style.background = "var(--bg-elevated)";
      }}
    >
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        style={{
          width: "100%", background: "transparent", fontSize: "14px",
          padding: right ? "13px 44px 13px 16px" : "13px 16px",
          borderRadius: "14px", outline: "none", color: "var(--text-primary)",
        }}
      />
      {right && (
        <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}>
          {right}
        </div>
      )}
    </div>
  );
}

export default function RegisterClient() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const plan        = searchParams.get("plan");
  const [form, setForm]    = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]  = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
    if (data.status === "auto_verified") {
      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      router.push(plan ? `/checkout?plan=${plan}` : "/onboarding");
      return;
    }
    const encoded = encodeURIComponent(form.password);
    router.push(`/verify-email?email=${encodeURIComponent(form.email)}&p=${encoded}${plan ? `&plan=${plan}` : ""}`);
  }

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", background: "var(--bg-base)",
      position: "relative", overflow: "hidden",
    }}>
      {/* ── Theme / Lang toggles ── */}
      <div style={{ position: "fixed", top: "14px", right: "16px", zIndex: 50, display: "flex", alignItems: "center", gap: "8px" }}>
        <LangToggle />
        <ThemeToggle />
      </div>

      {/* Ambient glows */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(22,163,74,0.1) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)" }} />
      </div>

      {/* Left branding panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "440px", flexShrink: 0, position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "2.5rem", borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(5,9,10,0.6)", backdropFilter: "blur(20px)",
        }}
        className="hidden lg:flex"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-owl.png" alt="Proffy" style={{ width: "44px", height: "44px", objectFit: "contain" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Proffy</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>AI study assistant</div>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { stat: "10K+", label: "Active students" },
              { stat: "4.9",  label: "Average rating" },
              { stat: "3x",   label: "Faster exam prep" },
            ].map(s => (
              <div key={s.stat} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--blue)", letterSpacing: "-0.04em", minWidth: "60px" }}>{s.stat}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>TAU · Technion · HUJI · BGU · Bar Ilan · Ariel</p>
      </motion.div>

      {/* Form */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem 1.5rem", position: "relative", zIndex: 1,
      }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>

          {/* Mobile logo */}
          <motion.div {...FADE(0)} style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "2.5rem" }} className="lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-owl.png" alt="Proffy" style={{ width: "38px", height: "38px", objectFit: "contain" }} />
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-primary)" }}>Proffy</span>
          </motion.div>

          <motion.div {...FADE(0.05)} style={{ marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.035em", color: "var(--text-primary)", marginBottom: "6px", lineHeight: 1.15 }}>
              Create account
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Start studying smarter today</p>
          </motion.div>

          {plan && (
            <motion.div {...FADE(0.08)} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px", borderRadius: "10px", marginBottom: "1.25rem",
              background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span style={{ fontSize: "13px", color: "var(--blue)", fontWeight: 600, textTransform: "capitalize" }}>
                {plan} plan selected — payment setup next
              </span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Google */}
            <motion.button
              {...FADE(0.1)}
              type="button"
              onClick={() => signIn("google", { callbackUrl: plan ? `/checkout?plan=${plan}` : "/onboarding" })}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                padding: "13px", borderRadius: "14px", fontSize: "14px", fontWeight: 600,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-primary)", cursor: "pointer", backdropFilter: "blur(8px)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </motion.button>

            <motion.div {...FADE(0.15)} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {error}
              </motion.div>
            )}

            <motion.div {...FADE(0.2)}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>Full name</div>
              <GlassInput type="text" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Your name" />
            </motion.div>

            <motion.div {...FADE(0.25)}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>Email address</div>
              <GlassInput type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="you@university.ac.il" required />
            </motion.div>

            <motion.div {...FADE(0.3)}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>Password</div>
              <GlassInput
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={v => setForm(f => ({ ...f, password: v }))}
                placeholder="8+ characters"
                required
                right={
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </motion.div>

            <motion.button
              {...FADE(0.35)}
              type="submit" disabled={loading}
              whileHover={loading ? {} : { scale: 1.01, boxShadow: "0 4px 24px rgba(22,163,74,0.35)" }}
              whileTap={loading ? {} : { scale: 0.98 }}
              style={{
                padding: "14px", borderRadius: "14px", fontSize: "14px", fontWeight: 700,
                background: "var(--blue)", color: "#fff", border: "none",
                boxShadow: "0 2px 16px rgba(22,163,74,0.25)",
                opacity: loading ? 0.65 : 1, cursor: loading ? "not-allowed" : "pointer",
                marginTop: "4px",
              }}
            >
              {loading ? "Creating account…" : "Create account"}
            </motion.button>
          </form>

          <motion.p {...FADE(0.4)} style={{ textAlign: "center", fontSize: "13px", marginTop: "1.5rem", color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ fontWeight: 700, color: "var(--blue-hover)", textDecoration: "none" }}>
              Sign in
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
