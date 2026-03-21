"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const UNIVERSITIES = ["TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Other"];

function LogoMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="reg-logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f8ef7" /><stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#reg-logo-g)" />
      <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
      <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8" />
      <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [form, setForm] = useState({ name: "", email: "", password: "", university: "" });
  const [error, setError] = useState("");
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
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }
    const encoded = encodeURIComponent(form.password);
    router.push(`/verify-email?email=${encodeURIComponent(form.email)}&p=${encoded}${plan ? `&plan=${plan}` : ""}`);
  }

  const inputStyle = {
    width: "100%", fontSize: "0.9rem", padding: "0.7rem 1rem", borderRadius: "0.875rem",
    outline: "none", background: "var(--bg-elevated)",
    border: "1px solid var(--border)", color: "var(--text-primary)",
    transition: "border-color 0.15s",
  } as const;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)", padding: "2rem 1.5rem" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", maxWidth: "380px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2.5rem" }}>
          <LogoMark />
          <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>Proffy <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--accent)", background: "rgba(99,102,241,0.13)", border: "1px solid rgba(99,102,241,0.28)", borderRadius: "4px", padding: "1px 5px", lineHeight: 1.5 }}>BETA</span></span>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: "0.375rem" }}>
            Create account
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Start studying smarter today</p>
        </div>

        {plan && (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 14px", borderRadius: "10px", marginBottom: "1.25rem",
            background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.25)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span style={{ fontSize: "13px", color: "var(--blue)", fontWeight: 600, textTransform: "capitalize" }}>
              {plan} plan selected — you'll set up payment next
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: plan ? `/checkout?plan=${plan}` : "/dashboard" })}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
              padding: "0.7rem 1rem", borderRadius: "0.875rem", fontSize: "0.9rem", fontWeight: 500,
              background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
              color: "var(--text-primary)", transition: "opacity 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={{ fontSize: "0.875rem", padding: "0.625rem 1rem", borderRadius: "0.75rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
            >
              {error}
            </motion.div>
          )}

          <input type="text" placeholder="Full name" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "var(--blue)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <input type="email" placeholder="Email" value={form.email} required
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "var(--blue)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <input type="password" placeholder="Password (8+ characters)" value={form.password} required
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "var(--blue)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <select value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
            style={{ ...inputStyle, color: form.university ? "var(--text-primary)" : "var(--text-muted)" }}
            onFocus={e => (e.target.style.borderColor = "var(--blue)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          >
            <option value="">Select university</option>
            {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <button type="submit" disabled={loading}
            style={{
              padding: "0.75rem", borderRadius: "0.875rem", fontSize: "0.925rem", fontWeight: 700,
              background: "var(--blue)", color: "#fff",
              boxShadow: "0 2px 16px rgba(79,142,247,0.35)",
              opacity: loading ? 0.6 : 1, transition: "opacity 0.15s",
              marginTop: "0.25rem",
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.875rem", marginTop: "1.75rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ fontWeight: 600, color: "var(--blue-hover)" }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
