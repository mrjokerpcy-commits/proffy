"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PAYPAL_CLIENT_ID = "AZWKNOrILVkXzT3U_6F12RD2e0QnQrAtlIjk0PzxwKPSijsAVuLGKSNXi3Kr8_0sgbLvSdvcnt2DsOFG";

interface Props {
  open: boolean;
  onClose: () => void;
  currentPlan?: "free" | "pro" | "max";
}

const PLANS = [
  {
    key: "pro" as const,
    name: "Pro",
    price: "₪79",
    usd: "22.00",
    color: "#4f8ef7",
    border: "rgba(79,142,247,0.4)",
    bg: "rgba(79,142,247,0.06)",
    badge: "Most popular",
    features: [
      "Unlimited messages & courses",
      "Smart flashcards + study plan",
      "Exam prep mode",
      "Answers cited from your slides",
      "Professor fingerprinting",
    ],
  },
  {
    key: "max" as const,
    name: "Max",
    price: "₪149",
    usd: "42.00",
    color: "#a78bfa",
    border: "rgba(167,139,250,0.4)",
    bg: "rgba(167,139,250,0.06)",
    features: [
      "Everything in Pro",
      "Exam predictions",
      "Study groups",
      "Telegram bot access",
      "Priority support",
    ],
  },
];

export default function UpgradeModal({ open, onClose, currentPlan = "free" }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"plans" | "payment">("plans");
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "max">("pro");
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);

  const plan = PLANS.find(p => p.key === selectedPlan)!;

  function handleClose() {
    onClose();
    setTimeout(() => setStep("plans"), 300);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="upgrade-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: "540px",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "18px", overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "20px 22px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              {step === "payment" && (
                <button
                  onClick={() => setStep("plans")}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                  </svg>
                </button>
              )}
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  {step === "plans" ? "Upgrade Proffy" : `${plan.name} — ${plan.price}/mo`}
                </h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>
                  {step === "plans" ? "Choose a plan to unlock full access" : "Complete your payment securely via PayPal"}
                </p>
              </div>
              <button
                onClick={handleClose}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Step 1 — Plan selection */}
            {step === "plans" && (
              <div style={{ padding: "18px 22px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {PLANS.map(p => {
                  const isCurrent = p.key === currentPlan;
                  return (
                    <div key={p.key} style={{ borderRadius: "12px", border: `1px solid ${p.border}`, background: p.bg, padding: "16px 18px", position: "relative" }}>
                      {"badge" in p && p.badge && (
                        <span style={{ position: "absolute", top: "-10px", left: "16px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: p.color, borderRadius: "5px", padding: "2px 8px" }}>
                          {p.badge}
                        </span>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "15px", fontWeight: 800, color: p.color }}>{p.name}</span>
                          {isCurrent && (
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>Current</span>
                          )}
                        </div>
                        <span style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>{p.price}<span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>/mo</span></span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: isCurrent ? 0 : "14px" }}>
                        {p.features.map(f => (
                          <span key={f} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            {f}
                          </span>
                        ))}
                      </div>
                      {!isCurrent && (
                        <button
                          onClick={() => { setSelectedPlan(p.key); setStep("payment"); setPayError(""); }}
                          style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "none", background: p.color, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Get {p.name} — {p.price}/mo
                        </button>
                      )}
                    </div>
                  );
                })}
                <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                  Cancel any time · No hidden fees
                </p>
              </div>
            )}

            {/* Step 2 — Payment */}
            {step === "payment" && (
              <div style={{ padding: "18px 22px 20px" }}>
                <div style={{ padding: "12px 14px", borderRadius: "10px", background: plan.bg, border: `1px solid ${plan.border}`, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: plan.color }}>{plan.name} plan · monthly</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>{plan.price}/mo</span>
                </div>

                {payError && (
                  <div style={{ fontSize: "12px", color: "#f87171", marginBottom: "12px", padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: "8px", border: "1px solid rgba(248,113,113,0.2)" }}>
                    {payError}
                  </div>
                )}

                <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD", intent: "capture" }}>
                  <PayPalButtons
                    style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                    disabled={paying}
                    createOrder={async () => {
                      setPaying(true); setPayError("");
                      const res = await fetch("/api/checkout/paypal/create-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ plan: selectedPlan }),
                      });
                      const data = await res.json();
                      setPaying(false);
                      if (!data.orderId) throw new Error(data.error ?? "Failed");
                      return data.orderId;
                    }}
                    onApprove={async (data) => {
                      setPaying(true);
                      const res = await fetch("/api/checkout/paypal/capture-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: data.orderID }),
                      });
                      const result = await res.json();
                      setPaying(false);
                      if (result.ok) { handleClose(); router.refresh(); }
                      else setPayError(result.error ?? "Payment failed");
                    }}
                    onError={() => { setPayError("Payment failed. Please try again."); setPaying(false); }}
                    onCancel={() => setPaying(false)}
                  />
                </PayPalScriptProvider>

                <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "12px" }}>
                  Pay with PayPal or credit card · No account required
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
