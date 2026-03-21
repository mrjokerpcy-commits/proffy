"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useRef, useEffect, Suspense } from "react";
import { motion } from "framer-motion";

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") ?? "";
  const password = params.get("p") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const code = digits.join("");

  async function verify(fullCode: string) {
    if (fullCode.length < 6 || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid code"); setLoading(false); return; }

      // Auto sign-in after verification
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.ok) router.replace("/onboarding");
      else router.replace("/login?verified=1");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
    const full = next.join("");
    if (full.length === 6) verify(full);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      verify(pasted);
    }
  }

  async function resend() {
    setResending(true);
    setError("");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 30000);
    } catch {
      setError("Could not resend. Try again.");
    }
    setResending(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)", padding: "2rem" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}
      >
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.625rem", marginBottom: "2.5rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#4f8ef7,#a78bfa)" }} />
          <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            Proffy
            <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(99,102,241,0.13)", border: "1px solid rgba(99,102,241,0.28)", borderRadius: "4px", padding: "1px 5px" }}>BETA</span>
          </span>
        </div>

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2.5rem 2rem" }}>
          {/* Icon */}
          <div style={{ width: 52, height: 52, borderRadius: "14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>

          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
            Check your email
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "2rem", lineHeight: 1.6 }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: "var(--text-secondary)" }}>{email}</strong>
          </p>

          {/* Code inputs */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1.5rem" }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: "48px", height: "56px", textAlign: "center",
                  fontSize: "1.5rem", fontWeight: 700, letterSpacing: 0,
                  background: "var(--bg-base)", border: `1px solid ${d ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "10px", color: "var(--text-primary)", outline: "none",
                  transition: "border-color 0.15s",
                }}
              />
            ))}
          </div>

          {error && (
            <p style={{ color: "var(--red)", fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</p>
          )}

          <button
            onClick={() => verify(code)}
            disabled={code.length < 6 || loading}
            style={{
              width: "100%", padding: "0.75rem", borderRadius: "10px",
              background: "var(--accent)", color: "#fff", fontWeight: 700,
              fontSize: "0.95rem", border: "none", cursor: code.length < 6 || loading ? "not-allowed" : "pointer",
              opacity: code.length < 6 || loading ? 0.5 : 1, marginBottom: "1.25rem",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Verifying…" : "Verify email"}
          </button>

          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {resent
              ? "✓ New code sent — check your inbox"
              : <>Didn't get it?{" "}
                <button onClick={resend} disabled={resending} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, fontSize: "inherit", padding: 0 }}>
                  {resending ? "Sending…" : "Resend code"}
                </button>
              </>
            }
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
