"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PLANS = {
  pro: {
    name: "Pro",
    price: "79",
    period: "month",
    color: "var(--blue)",
    glow: "rgba(79,142,247,0.2)",
    border: "rgba(79,142,247,0.3)",
    features: [
      "Unlimited questions & courses",
      "Smart flashcards + study plan",
      "Exam prep mode",
      "Professor fingerprinting",
      "Answers cited from your slides",
    ],
  },
  max: {
    name: "Max",
    price: "149",
    period: "month",
    color: "var(--purple)",
    glow: "rgba(167,139,250,0.2)",
    border: "rgba(167,139,250,0.3)",
    features: [
      "Everything in Pro",
      "Study groups",
      "Exam predictions",
      "Telegram bot access",
      "Priority support",
    ],
  },
};

interface Props {
  plan: "pro" | "max";
  userEmail: string;
}

export default function CheckoutClient({ plan: initialPlan, userEmail }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<"pro" | "max">(initialPlan);
  const p = PLANS[plan];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem 1.5rem",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: "500px", height: "300px", borderRadius: "50%",
        background: `radial-gradient(ellipse, ${p.glow} 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "860px" }}>

        {/* Back */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <button onClick={() => router.back()} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          {/* Plan toggle */}
          <div style={{ display: "flex", gap: "3px", padding: "3px", borderRadius: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            {(["pro", "max"] as const).map(p => (
              <button key={p} onClick={() => setPlan(p)} style={{
                padding: "6px 18px", borderRadius: "7px", fontSize: "13px", fontWeight: 700,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: plan === p ? (p === "pro" ? "var(--blue)" : "var(--purple)") : "transparent",
                color: plan === p ? "#fff" : "var(--text-muted)",
              }}>
                {p === "pro" ? "Pro" : "Max"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* ── Left: Plan summary ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            style={{
              borderRadius: "12px", padding: "28px",
              background: "var(--bg-surface)", border: `1px solid ${p.border}`,
              boxShadow: `0 0 48px ${p.glow}`,
            }}
          >
            {/* Plan badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "4px 12px", borderRadius: "999px",
              background: `rgba(${plan === "pro" ? "79,142,247" : "167,139,250"},0.12)`,
              border: `1px solid ${p.border}`, marginBottom: "1.5rem",
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: p.color }}>{p.name}</span>
            </div>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>₪</span>
              <span style={{ fontSize: "3.5rem", fontWeight: 800, lineHeight: 1, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{p.price}</span>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>/ {p.period}</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "1.75rem" }}>
              Billed monthly · Cancel any time
            </p>

            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {p.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "2px", flexShrink: 0 }}>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Guarantee */}
            <div style={{
              marginTop: "1.75rem", padding: "12px 14px", borderRadius: "8px",
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ fontSize: "18px" }}>🛡️</span>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Secure payment · No hidden fees · Cancel any time from settings
              </p>
            </div>
          </motion.div>

          {/* ── Right: Payment form ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
            style={{
              borderRadius: "12px", padding: "28px",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
              Payment details
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Paying as <span style={{ color: "var(--text-secondary)" }}>{userEmail}</span>
            </p>

            {/* Total line */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 0", borderTop: "1px solid var(--border)", marginBottom: "16px",
            }}>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{p.name} plan · monthly</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>₪{p.price}/mo</span>
            </div>

            {error && (
              <div style={{ fontSize: "12px", color: "#f87171", marginBottom: "12px", padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: "8px", border: "1px solid rgba(248,113,113,0.2)" }}>
                {error}
              </div>
            )}

            <PayPalScriptProvider options={{ clientId: "AZWKNOrILVkXzT3U_6F12RD2e0QnQrAtlIjk0PzxwKPSijsAVuLGKSNXi3Kr8_0sgbLvSdvcnt2DsOFG", currency: "USD", intent: "capture" }}>
              <PayPalButtons
                style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                disabled={loading}
                createOrder={async () => {
                  setLoading(true);
                  setError("");
                  const res = await fetch("/api/checkout/paypal/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan }),
                  });
                  const data = await res.json();
                  setLoading(false);
                  if (!data.orderId) throw new Error(data.error ?? "Failed to create order");
                  return data.orderId;
                }}
                onApprove={async (data) => {
                  setLoading(true);
                  const res = await fetch("/api/checkout/paypal/capture-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: data.orderID }),
                  });
                  const result = await res.json();
                  setLoading(false);
                  if (result.ok) {
                    router.push("/dashboard?subscribed=" + plan);
                  } else {
                    setError(result.error ?? "Payment failed");
                  }
                }}
                onError={() => { setError("Payment failed. Please try again."); setLoading(false); }}
                onCancel={() => setLoading(false)}
              />
            </PayPalScriptProvider>

            <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "12px", lineHeight: 1.6 }}>
              Pay securely with PayPal or credit card — no account required. Cancel any time.
            </p>
          </motion.div>
        </div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          style={{
            marginTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center",
            gap: "2rem", flexWrap: "wrap",
          }}
        >
          {["🔒 256-bit SSL", "🌍 Secure infrastructure", "✕ Cancel any time"].map(t => (
            <span key={t} style={{ fontSize: "12px", color: "var(--text-muted)" }}>{t}</span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
