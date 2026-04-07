"use client";
import { useState } from "react";
import { motion } from "framer-motion";

const PLATFORM_META: Record<string, { name: string; icon: string; gradient: string; description: string }> = {
  uni:    { name: "Proffy Uni",   icon: "🎓", gradient: "linear-gradient(135deg, #4f8ef7, #6366f1)", description: "AI study tools for university courses" },
  psycho: { name: "Proffy Psycho", icon: "🧠", gradient: "linear-gradient(135deg, #a78bfa, #ec4899)", description: "Adaptive psychometric exam preparation" },
  yael:   { name: "Proffy Yael", icon: "📖", gradient: "linear-gradient(135deg, #34d399, #059669)", description: "Hebrew reading comprehension and Yael exam prep" },
  bagrut: { name: "Proffy Bagrut", icon: "📝", gradient: "linear-gradient(135deg, #fbbf24, #f97316)", description: "Matriculation exam prep for all subjects" },
};

interface Props {
  platform: string;
  userId: string;
}

export default function BetaGate({ platform }: Props) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.uni;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [showRequest, setShowRequest] = useState(false);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError("Enter your access code"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid access code");
      } else {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: requestName, email: requestEmail, platform }),
      });
      setRequestSent(true);
    } finally {
      setLoading(false);
    }
  }

  const hubUrl = process.env.NODE_ENV === "production" ? "https://proffy.study/dashboard" : "/dashboard";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      padding: "24px",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: "100%", maxWidth: "420px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        {/* Top gradient bar */}
        <div style={{ height: "4px", background: meta.gradient }} />

        <div style={{ padding: "36px 32px" }}>
          {/* Icon + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "12px",
              background: meta.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px",
            }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {meta.name}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{meta.description}</div>
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--border)", margin: "24px 0" }} />

          {!showRequest ? (
            <>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
                This platform is in early access. Enter your access code to get started.
              </p>

              <form onSubmit={handleActivate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value); setError(""); }}
                  placeholder="Access code"
                  autoFocus
                  style={{
                    padding: "11px 14px", borderRadius: "9px", fontSize: "15px",
                    background: "var(--bg-elevated)", border: `1px solid ${error ? "#f87171" : "var(--border)"}`,
                    color: "var(--text-primary)", outline: "none", letterSpacing: "0.05em",
                  }}
                />
                {error && (
                  <div style={{ fontSize: "13px", color: "#f87171" }}>{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "11px", borderRadius: "9px",
                    background: meta.gradient,
                    color: "#fff", fontWeight: 700, fontSize: "15px",
                    border: "none", cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Verifying..." : "Activate Access"}
                </button>
              </form>

              <div style={{ textAlign: "center" as const, marginTop: "20px" }}>
                <button
                  onClick={() => setShowRequest(true)}
                  style={{ fontSize: "13px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  No code? Request access
                </button>
              </div>
            </>
          ) : requestSent ? (
            <div style={{ textAlign: "center" as const, padding: "16px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Request received</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                We will send you an access code when a spot opens up.
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
                Leave your details and we will send you an access code when a spot opens.
              </p>
              <form onSubmit={handleRequest} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  type="text" value={requestName} onChange={e => setRequestName(e.target.value)}
                  placeholder="Your name" required
                  style={{ padding: "11px 14px", borderRadius: "9px", fontSize: "14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                />
                <input
                  type="email" value={requestEmail} onChange={e => setRequestEmail(e.target.value)}
                  placeholder="Email address" required
                  style={{ padding: "11px 14px", borderRadius: "9px", fontSize: "14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                />
                <button
                  type="submit" disabled={loading}
                  style={{ padding: "11px", borderRadius: "9px", background: meta.gradient, color: "#fff", fontWeight: 700, fontSize: "14px", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Sending..." : "Request Access"}
                </button>
              </form>
              <div style={{ textAlign: "center" as const, marginTop: "14px" }}>
                <button onClick={() => setShowRequest(false)} style={{ fontSize: "13px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  I have a code
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>

      <a href={hubUrl} style={{ marginTop: "20px", fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>
        Back to Dashboard
      </a>
    </div>
  );
}
