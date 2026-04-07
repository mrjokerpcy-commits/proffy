"use client";
import { useEffect, useState } from "react";

const CONSENT_KEY = "proffy_cookie_consent_v1";

type ConsentState = "accepted" | "declined" | null;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function updateGtagConsent(granted: boolean) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
  });
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(null);
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentState | null;
    setConsent(stored);
    if (stored === "accepted") updateGtagConsent(true);
    if (stored === "declined") updateGtagConsent(false);
  }, []);
  return consent;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    updateGtagConsent(true);
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    updateGtagConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-light)",
        borderRadius: "16px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        padding: "20px 24px",
        maxWidth: "520px",
        width: "calc(100% - 48px)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
          We use cookies
        </p>
        <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
          We use cookies for authentication, analytics, and to improve the service. By accepting, you allow us to use analytics and marketing cookies.{" "}
          <a href="/privacy" style={{ color: "#16a34a", textDecoration: "underline" }}>Privacy policy</a>
        </p>
      </div>
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button
          onClick={decline}
          style={{
            padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
            background: "transparent", border: "1px solid var(--border-light)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
            background: "#16a34a", border: "none",
            color: "#fff", cursor: "pointer",
          }}
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
