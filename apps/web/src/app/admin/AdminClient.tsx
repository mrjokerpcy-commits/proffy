"use client";
import { useState, useMemo } from "react";

// Claude pricing (per 1M tokens, USD)
const HAIKU_IN  = 0.80;
const HAIKU_OUT = 4.00;
const SONNET_IN  = 3.00;
const SONNET_OUT = 15.00;

function calcCost(ti: number, to: number, plan: "free" | "pro" | "max") {
  const isPaid = plan === "pro" || plan === "max";
  const inRate  = isPaid ? SONNET_IN  : HAIKU_IN;
  const outRate = isPaid ? SONNET_OUT : HAIKU_OUT;
  return (ti / 1_000_000) * inRate + (to / 1_000_000) * outRate;
}

function fmtCost(usd: number) {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IL", { day: "2-digit", month: "short", year: "2-digit" });
}

const PLAN_COLORS: Record<string, string> = {
  free: "var(--text-muted)",
  pro:  "var(--blue)",
  max:  "var(--purple)",
};
const PLAN_BG: Record<string, string> = {
  free: "rgba(255,255,255,0.06)",
  pro:  "rgba(79,142,247,0.15)",
  max:  "rgba(167,139,250,0.15)",
};

type User = {
  id: string;
  email: string;
  name: string | null;
  university: string | null;
  created_at: string;
  plan: string;
  sub_status: string;
  msgs_7d: number;
  tin_7d: number;
  tout_7d: number;
  msgs_total: number;
  tin_total: number;
  tout_total: number;
  course_count: number;
};

type Stats = {
  totalUsers: number;
  paidUsers: number;
  today: { questions: number; tokens_input: number; tokens_output: number };
  week: { questions: number; tokens_input: number; tokens_output: number };
  month: { questions: number; tokens_input: number; tokens_output: number };
  allTime: { questions: number; tokens_input: number; tokens_output: number };
  dailyBreakdown: Array<{ date: string; questions: number; ti: number; to_: number }>;
};

type QueueItem = { id: string; url: string; submitted_at: string; status: string; email: string | null };

export default function AdminClient({
  stats,
  users: initialUsers,
  queue,
}: {
  stats: Stats;
  users: User[];
  queue: QueueItem[];
}) {
  const [tab, setTab] = useState<"overview" | "users" | "usage" | "queue">("overview");
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"joined" | "msgs" | "cost" | "plan">("joined");

  // Drive queue form
  const [driveUrl, setDriveUrl] = useState("");
  const [driveUniversity, setDriveUniversity] = useState("TAU");
  const [driveFaculty, setDriveFaculty] = useState("");
  const [driveNote, setDriveNote] = useState("");
  const [driveStatus, setDriveStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [queueItems, setQueueItems] = useState<QueueItem[]>(queue);

  async function submitDrive() {
    if (!driveUrl.trim()) return;
    setDriveStatus("loading");
    try {
      const r = await fetch("/api/admin/queue-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: driveUrl.trim(), university: driveUniversity, faculty: driveFaculty || null, note: driveNote || null }),
      });
      if (!r.ok) throw new Error();
      setDriveStatus("ok");
      setQueueItems(prev => [{ id: crypto.randomUUID(), url: driveUrl.trim(), submitted_at: new Date().toISOString(), status: "pending", email: null }, ...prev]);
      setDriveUrl(""); setDriveFaculty(""); setDriveNote("");
      setTimeout(() => setDriveStatus("idle"), 3000);
    } catch {
      setDriveStatus("err");
      setTimeout(() => setDriveStatus("idle"), 3000);
    }
  }
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    let list = users.filter(u =>
      !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.university ?? "").toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      if (sortBy === "msgs") return b.msgs_total - a.msgs_total;
      if (sortBy === "cost") return calcCost(Number(b.tin_total ?? 0), Number(b.tout_total ?? 0), b.plan as any) - calcCost(Number(a.tin_total ?? 0), Number(a.tout_total ?? 0), a.plan as any);
      if (sortBy === "plan") return a.plan.localeCompare(b.plan);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [users, search, sortBy]);

  async function setPlan(userId: string, plan: string) {
    setUpdatingId(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, plan }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u));
    }
    setUpdatingId(null);
  }

  // Cost estimates (baseline Haiku rate for free users; actual is higher for paid users on Sonnet)
  const todayCost    = calcCost(Number(stats.today.tokens_input   ?? 0), Number(stats.today.tokens_output   ?? 0), "free");
  const weekCost     = calcCost(Number(stats.week.tokens_input    ?? 0), Number(stats.week.tokens_output    ?? 0), "free");
  const monthCost    = calcCost(Number(stats.month.tokens_input   ?? 0), Number(stats.month.tokens_output   ?? 0), "free");
  const allTimeCost  = calcCost(Number(stats.allTime?.tokens_input ?? 0), Number(stats.allTime?.tokens_output ?? 0), "free");

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "14px", padding: "1.5rem",
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", border: "none",
    background: active ? "var(--bg-elevated)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-muted)",
    transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-primary)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "2px" }}>Admin</h1>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Proffy platform dashboard</p>
          </div>
          <div style={{ display: "flex", gap: "6px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "4px" }}>
            {(["overview", "users", "usage", "queue"] as const).map(t => (
              <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "queue" && queue.filter(q => q.status === "pending").length > 0 && (
                  <span style={{ marginLeft: "5px", background: "var(--blue)", color: "#fff", borderRadius: "99px", padding: "1px 6px", fontSize: "11px" }}>
                    {queue.filter(q => q.status === "pending").length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total users", value: fmtNum(stats.totalUsers), sub: `${stats.paidUsers} paid` },
                { label: "Messages today", value: fmtNum(Number(stats.today.questions ?? 0)), sub: `${fmtNum(Number(stats.today.tokens_input ?? 0) + Number(stats.today.tokens_output ?? 0))} tokens` },
                { label: "Est. cost today", value: fmtCost(todayCost), sub: "Haiku baseline", accent: true },
                { label: "Est. cost this week", value: fmtCost(weekCost), sub: "7-day rolling" },
                { label: "Est. cost this month", value: fmtCost(monthCost), sub: new Date().toLocaleString("en-IL", { month: "long" }) },
                { label: "Messages this month", value: fmtNum(Number(stats.month.questions ?? 0)), sub: `${fmtNum(Number(stats.month.tokens_input ?? 0) + Number(stats.month.tokens_output ?? 0))} tokens` },
                { label: "Total cost all time", value: fmtCost(allTimeCost), sub: `${fmtNum(Number(stats.allTime?.questions ?? 0))} messages total`, accent: true },
              ].map(s => (
                <div key={s.label} style={cardStyle}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>{s.label}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.accent ? "var(--green)" : "var(--text-primary)", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Cost model breakdown */}
            <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
              <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "14px" }}>Claude pricing reference</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {[
                  { model: "Haiku 3.5", plan: "Free users", inRate: HAIKU_IN, outRate: HAIKU_OUT, color: "var(--text-muted)" },
                  { model: "Sonnet 4.5", plan: "Pro/Max users", inRate: SONNET_IN, outRate: SONNET_OUT, color: "var(--blue)" },
                ].map(m => (
                  <div key={m.model} style={{ background: "var(--bg-elevated)", borderRadius: "10px", padding: "1rem" }}>
                    <div style={{ fontWeight: 700, color: m.color, marginBottom: "4px" }}>{m.model}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{m.plan}</div>
                    <div style={{ fontSize: "13px" }}>Input: <strong>${m.inRate}/1M</strong></div>
                    <div style={{ fontSize: "13px" }}>Output: <strong>${m.outRate}/1M</strong></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan breakdown */}
            <div style={cardStyle}>
              <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "14px" }}>Users by plan</h3>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {(["free", "pro", "max"] as const).map(p => {
                  const count = p === "free"
                    ? users.filter(u => u.plan === "free").length
                    : users.filter(u => u.plan === p).length;
                  return (
                    <div key={p} style={{ flex: 1, minWidth: "100px", background: PLAN_BG[p], border: `1px solid ${PLAN_COLORS[p]}33`, borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: PLAN_COLORS[p] }}>{count}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginTop: "2px" }}>{p}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "1rem", flexWrap: "wrap" }}>
              <input
                placeholder="Search email, name, university..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: "240px", padding: "8px 14px", borderRadius: "10px",
                  border: "1px solid var(--border)", background: "var(--bg-elevated)",
                  color: "var(--text-primary)", fontSize: "13px",
                }}
              />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--border)",
                  background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px", cursor: "pointer",
                }}
              >
                <option value="joined">Sort: Joined</option>
                <option value="msgs">Sort: Messages</option>
                <option value="cost">Sort: Cost (total)</option>
                <option value="plan">Sort: Plan</option>
              </select>
              <div style={{ padding: "8px 14px", borderRadius: "10px", background: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: "13px", color: "var(--text-muted)" }}>
                {filteredUsers.length} users
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["User", "University", "Plan", "Courses", "Msgs (7d)", "Msgs total", "Est. cost (all time)", "Joined"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const costTotal = calcCost(Number(u.tin_total ?? 0), Number(u.tout_total ?? 0), u.plan as any);
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{u.email}</div>
                          {u.name && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{u.name}</div>}
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{u.university ?? "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <select
                            value={u.plan}
                            disabled={updatingId === u.id}
                            onChange={e => setPlan(u.id, e.target.value)}
                            style={{
                              padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                              border: `1px solid ${PLAN_COLORS[u.plan] ?? "var(--border)"}`,
                              background: PLAN_BG[u.plan] ?? "var(--bg-elevated)",
                              color: PLAN_COLORS[u.plan] ?? "var(--text-primary)",
                              opacity: updatingId === u.id ? 0.5 : 1,
                            }}
                          >
                            <option value="free">free</option>
                            <option value="pro">pro</option>
                            <option value="max">max</option>
                          </select>
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "center" }}>{u.course_count}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "right" }}>{fmtNum(Number(u.msgs_7d))}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)", textAlign: "right" }}>{fmtNum(Number(u.msgs_total))}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: costTotal > 0.5 ? "var(--amber)" : "var(--text-secondary)" }}>
                          {fmtCost(costTotal)}
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtDate(u.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No users found</div>
              )}
            </div>
          </div>
        )}

        {/* ── USAGE ── */}
        {tab === "usage" && (
          <div>
            <div style={{ ...cardStyle }}>
              <h3 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "14px" }}>Daily usage (last 30 days)</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Date", "Messages", "Input tokens", "Output tokens", "Total tokens", "Est. cost"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: h === "Date" ? "left" : "right", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.dailyBreakdown.map(row => {
                      const ti = Number(row.ti ?? 0);
                      const to_ = Number(row.to_ ?? 0);
                      const cost = calcCost(ti, to_, "free"); // rough baseline
                      return (
                        <tr key={row.date} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmtDate(row.date)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmtNum(Number(row.questions ?? 0))}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-muted)" }}>{fmtNum(ti)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-muted)" }}>{fmtNum(to_)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmtNum(ti + to_)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: cost > 1 ? "var(--amber)" : "var(--green)" }}>{fmtCost(cost)}</td>
                        </tr>
                      );
                    })}
                    {stats.dailyBreakdown.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No usage data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── QUEUE ── */}
        {tab === "queue" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Add Drive Folder form */}
            <div style={{ ...cardStyle, borderColor: "rgba(79,142,247,0.3)" }}>
              <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "14px", color: "var(--blue)" }}>Add Drive Folder to Queue</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  value={driveUrl} onChange={e => setDriveUrl(e.target.value)}
                  placeholder="Google Drive folder URL"
                  style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={driveUniversity} onChange={e => setDriveUniversity(e.target.value)}
                    placeholder="University (e.g. TAU)"
                    style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                  />
                  <input
                    value={driveFaculty} onChange={e => setDriveFaculty(e.target.value)}
                    placeholder="Faculty (e.g. Management)"
                    style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    value={driveNote} onChange={e => setDriveNote(e.target.value)}
                    placeholder="Note (optional)"
                    style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                  />
                  <button
                    onClick={submitDrive}
                    disabled={!driveUrl.trim() || driveStatus === "loading"}
                    style={{
                      padding: "9px 20px", borderRadius: "8px", border: "none", cursor: driveUrl.trim() ? "pointer" : "not-allowed",
                      background: driveStatus === "ok" ? "rgba(52,211,153,0.2)" : driveStatus === "err" ? "rgba(248,113,113,0.2)" : "var(--blue)",
                      color: driveStatus === "ok" ? "#34d399" : driveStatus === "err" ? "#f87171" : "#fff",
                      fontSize: "13px", fontWeight: 700, flexShrink: 0,
                    }}
                  >
                    {driveStatus === "loading" ? "Adding…" : driveStatus === "ok" ? "Added!" : driveStatus === "err" ? "Error" : "Add to Queue"}
                  </button>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
            <h3 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "14px" }}>Material queue</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["URL", "Submitted by", "Submitted at", "Status"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queueItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px", maxWidth: "360px" }}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        style={{ color: "var(--blue)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", display: "block", whiteSpace: "nowrap" }}>
                        {item.url}
                      </a>
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{item.email ?? "—"}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtDate(item.submitted_at)}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                        background: item.status === "pending" ? "rgba(251,191,36,0.15)" : item.status === "done" ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)",
                        color: item.status === "pending" ? "var(--amber)" : item.status === "done" ? "var(--green)" : "var(--text-muted)",
                      }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {queueItems.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Queue is empty</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
