"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Props {
  user: {
    name: string | null;
    email: string | null;
    university: string | null;
    learning_style: string | null;
    plan: "free" | "pro" | "max";
  };
}

const UNIVERSITIES = ["TAU", "Technion", "HUJI", "BGU", "Bar Ilan", "Other"];

const LEARNING_STYLES = [
  { val: "visual",   icon: "🎨", label: "Visual & diagrams" },
  { val: "practice", icon: "⚡", label: "Practice problems first" },
  { val: "reading",  icon: "📖", label: "Thorough reading" },
  { val: "mixed",    icon: "🔀", label: "Mix it up" },
];

const UPGRADE_PLANS = [
  {
    key: "pro",
    name: "Pro",
    price: "₪79",
    color: "var(--blue)",
    glow: "rgba(79,142,247,0.18)",
    border: "rgba(79,142,247,0.3)",
    features: [
      "Unlimited messages (~30-35/day) & courses",
      "Smarter AI (Claude Sonnet vs Haiku on free)",
      "General AI — coding, writing, career, anything",
      "Upload slides & PDFs — answers from your material",
      "Professor pattern analysis",
      "Auto-saved flashcards, notes & weak-spot tracking",
    ],
  },
  {
    key: "max",
    name: "Max",
    price: "₪149",
    color: "var(--purple)",
    glow: "rgba(167,139,250,0.15)",
    border: "rgba(167,139,250,0.3)",
    features: [
      "Everything in Pro",
      "Higher usage (~60-70 msgs/day)",
      "Exam predictions — what's most likely to appear",
      "Deep professor fingerprinting with topic % breakdown",
      "Priority support",
    ],
  },
];

const PLAN_META = {
  free: { label: "Free",  color: "var(--text-muted)", bg: "rgba(255,255,255,0.04)", border: "var(--border)",          price: "Free",    desc: "10 questions/day" },
  pro:  { label: "Pro",   color: "var(--blue)",        bg: "rgba(79,142,247,0.07)", border: "rgba(79,142,247,0.3)",   price: "₪79/mo",  desc: "Unlimited questions" },
  max:  { label: "Max",   color: "var(--purple)",      bg: "rgba(167,139,250,0.07)", border: "rgba(167,139,250,0.3)", price: "₪149/mo", desc: "All features" },
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "var(--text-muted)",
  display: "block", marginBottom: "8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "9px",
  border: "1px solid var(--border)", background: "var(--bg-elevated)",
  color: "var(--text-primary)", fontSize: "14px", outline: "none",
  fontFamily: "inherit", transition: "border-color 0.15s",
};

const card: React.CSSProperties = {
  background: "var(--bg-surface)", border: "1px solid var(--border)",
  borderRadius: "14px", padding: "24px", marginBottom: "16px",
};

export default function SettingsClient({ user }: Props) {
  const planMeta = PLAN_META[user.plan];
  const router = useRouter();

  const [profile, setProfile] = useState({
    name: user.name ?? "",
    university: user.university ?? "",
    learning_style: user.learning_style ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (!deletePassword.trim()) { setDeleteError("Enter your password to confirm."); return; }
    setDeleting(true);
    setDeleteError("");
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setDeleteError(data?.error ?? "Incorrect password. Try again.");
      setDeleting(false);
      return;
    }
    await signOut({ redirect: false });
    router.push("/login");
  }

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const optBtn = (selected: boolean): React.CSSProperties => ({
    padding: "9px 14px", borderRadius: "8px", cursor: "pointer", transition: "all 0.12s",
    border: `1px solid ${selected ? "rgba(79,142,247,0.5)" : "var(--border)"}`,
    background: selected ? "rgba(79,142,247,0.1)" : "var(--bg-elevated)",
    color: selected ? "var(--blue)" : "var(--text-secondary)",
    fontSize: "13px", fontWeight: selected ? 600 : 400,
    display: "flex", alignItems: "center", gap: "6px",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: "0 24px", height: "56px",
        display: "flex", alignItems: "center",
        borderBottom: "1px solid var(--border)", background: "var(--bg-surface)",
      }}>
        <h1 style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Settings & Billing</h1>
      </div>

      <div style={{ flex: 1, padding: "28px 24px", maxWidth: "680px", width: "100%" }}>

        {/* ── Current plan ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>Your plan</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{planMeta.desc}</p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "6px 14px", borderRadius: "99px",
              background: planMeta.bg, border: `1px solid ${planMeta.border}`,
            }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: planMeta.color }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: planMeta.color }}>{planMeta.label}</span>
              {user.plan !== "free" && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>· {planMeta.price}</span>
              )}
            </div>
          </div>

          {user.plan !== "free" && (
            <button
              style={{
                padding: "8px 16px", borderRadius: "8px",
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-muted)", fontSize: "12px", cursor: "pointer",
              }}
            >
              Cancel subscription
            </button>
          )}
        </motion.div>

        {/* ── Upgrade (only if not max) ── */}
        {user.plan !== "max" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              {user.plan === "free" ? "Upgrade your plan" : "Upgrade to Max"}
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Unlock all features and study without limits
            </p>

            <div style={{ display: "grid", gridTemplateColumns: user.plan === "free" ? "1fr 1fr" : "1fr", gap: "12px" }}>
              {UPGRADE_PLANS.filter(p => p.key !== user.plan).map(p => (
                <div
                  key={p.key}
                  style={{
                    borderRadius: "12px", padding: "18px",
                    background: `rgba(${p.key === "pro" ? "79,142,247" : "167,139,250"},0.05)`,
                    border: `1px solid ${p.border}`,
                    boxShadow: `0 0 32px ${p.glow}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 800, color: p.color }}>{p.name}</span>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                      {p.price}<span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)" }}>/mo</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={`/checkout?plan=${p.key}`}
                    style={{
                      display: "block", textAlign: "center", padding: "10px",
                      borderRadius: "8px",
                      background: p.key === "pro"
                        ? "linear-gradient(135deg,#4f8ef7,#6fa3ff)"
                        : "linear-gradient(135deg,#a78bfa,#c084fc)",
                      color: "#fff", fontSize: "13px", fontWeight: 700,
                      textDecoration: "none",
                      boxShadow: `0 2px 16px ${p.glow}`,
                    }}
                  >
                    Upgrade to {p.name}
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Profile ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={card}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Profile</h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Proffy uses this to personalise explanations and study plans
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(79,142,247,0.5)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <div style={{ ...inputStyle, color: "var(--text-muted)", background: "var(--bg-base)", cursor: "default" }}>
                {user.email}
              </div>
            </div>

            <div>
              <label style={labelStyle}>University</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {UNIVERSITIES.map(u => (
                  <button key={u} type="button" onClick={() => setProfile(p => ({ ...p, university: u }))}
                    style={{ ...optBtn(profile.university === u), fontWeight: profile.university === u ? 700 : 500 }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Learning style</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {LEARNING_STYLES.map(s => (
                  <button key={s.val} type="button" onClick={() => setProfile(p => ({ ...p, learning_style: s.val }))}
                    style={optBtn(profile.learning_style === s.val)}>
                    <span>{s.icon}</span><span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              style={{
                alignSelf: "flex-start", padding: "10px 24px", borderRadius: "9px",
                background: saved ? "rgba(52,211,153,0.12)" : "linear-gradient(135deg,#4f8ef7,#a78bfa)",
                color: saved ? "var(--green)" : "#fff",
                border: saved ? "1px solid rgba(52,211,153,0.3)" : "none",
                fontSize: "13px", fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1, transition: "all 0.2s",
              }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
            </button>
          </div>
        </motion.div>

        {/* ── Account ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          style={{ ...card, border: "1px solid rgba(248,113,113,0.15)", background: "rgba(248,113,113,0.02)" }}
        >
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Account</h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>Sign out or permanently delete your account</p>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                padding: "8px 18px", borderRadius: "8px",
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer",
              }}
            >
              Sign out
            </button>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                style={{
                  padding: "8px 18px", borderRadius: "8px",
                  background: "transparent", border: "1px solid rgba(248,113,113,0.3)",
                  color: "var(--red)", fontSize: "13px", cursor: "pointer",
                }}
              >
                Delete account
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                  Enter your password to confirm permanent deletion.
                </p>
                <input
                  type="password"
                  placeholder="Your password"
                  value={deletePassword}
                  onChange={e => { setDeletePassword(e.target.value); setDeleteError(""); }}
                  onKeyDown={e => e.key === "Enter" && deleteAccount()}
                  style={{
                    padding: "8px 12px", borderRadius: "7px", fontSize: "13px",
                    border: `1px solid ${deleteError ? "rgba(248,113,113,0.5)" : "var(--border)"}`,
                    background: "var(--bg-elevated)", color: "var(--text-primary)",
                    outline: "none", fontFamily: "inherit", maxWidth: "260px",
                  }}
                />
                {deleteError && (
                  <p style={{ fontSize: "11px", color: "var(--red)", margin: 0 }}>{deleteError}</p>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => { setDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
                    style={{ padding: "6px 12px", borderRadius: "7px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button
                    onClick={deleteAccount}
                    disabled={deleting || !deletePassword.trim()}
                    style={{ padding: "6px 14px", borderRadius: "7px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "var(--red)", fontSize: "12px", cursor: deleting || !deletePassword.trim() ? "not-allowed" : "pointer", fontWeight: 600, opacity: deleting || !deletePassword.trim() ? 0.5 : 1 }}>
                    {deleting ? "Deleting…" : "Yes, delete everything"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
