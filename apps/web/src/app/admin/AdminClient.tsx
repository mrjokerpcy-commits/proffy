"use client";
import React, { useState, useMemo, useEffect } from "react";

// Claude pricing (per 1M tokens, USD) — updated rates
const HAIKU_IN   = 0.80;
const HAIKU_OUT  = 4.00;
const SONNET_IN  = 3.00;
const SONNET_OUT = 15.00;
const OPUS_IN    = 15.00;
const OPUS_OUT   = 75.00;

function calcCost(ti: number, to: number, plan: "free" | "pro" | "max") {
  // Free: Haiku for chat. Pro: Sonnet. Max: Opus for complex, Sonnet otherwise.
  // Drive processing always uses Sonnet — so blended estimate leans Sonnet.
  const inRate  = plan === "max" ? (SONNET_IN  + OPUS_IN)  / 2
                : plan === "pro" ? SONNET_IN
                : HAIKU_IN;
  const outRate = plan === "max" ? (SONNET_OUT + OPUS_OUT) / 2
                : plan === "pro" ? SONNET_OUT
                : HAIKU_OUT;
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

type QueueItem = {
  id: string; url: string; university: string | null; course_name: string | null;
  submitted_at: string; status: string; email: string | null;
  files_found: number | null; chunks_created: number | null;
  error_msg: string | null; processed_at: string | null;
  log: string | null;
};

export default function AdminClient({
  stats,
  users: initialUsers,
  queue,
}: {
  stats: Stats;
  users: User[];
  queue: QueueItem[];
}) {
  const [tab, setTab] = useState<"overview" | "users" | "usage" | "queue" | "knowledge" | "simulate">("overview");
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"joined" | "msgs" | "cost" | "plan">("joined");

  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function cancelItem(id: string) {
    setActioningId(id);
    await fetch("/api/admin/queue-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "cancel" }) }).catch(() => {});
    setQueueItems(prev => prev.map(q => q.id === id ? { ...q, status: "pending" } : q));
    setActioningId(null);
  }

  async function deleteItem(id: string) {
    setActioningId(id);
    await fetch("/api/admin/queue-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "delete" }) }).catch(() => {});
    setQueueItems(prev => prev.filter(q => q.id !== id));
    if (openLogId === id) setOpenLogId(null);
    setActioningId(null);
  }

  // Simulate tab state
  const [simQuestion, setSimQuestion] = useState("");
  const [simUniversity, setSimUniversity] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<{ chunks: any[]; answer?: string } | null>(null);
  const [simError, setSimError] = useState("");
  const [simWithAnswer, setSimWithAnswer] = useState(true);

  async function runSimulation() {
    if (!simQuestion.trim()) return;
    setSimLoading(true);
    setSimError("");
    setSimResult(null);
    try {
      const r = await fetch("/api/admin/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: simQuestion, university: simUniversity || undefined, withAnswer: simWithAnswer }),
      });
      const d = await r.json();
      if (!r.ok) { setSimError(d.error ?? "Failed"); }
      else setSimResult(d);
    } catch { setSimError("Request failed"); }
    finally { setSimLoading(false); }
  }

  const AUTO_QUESTIONS = [
    // Management / Law
    "מה הם יסודות חוזה תקף לפי המשפט הישראלי?",
    "הסבר את עקרון המידתיות בחוק יסוד כבוד האדם וחירותו",
    "מהו מבחן הוודאות הקרובה בחופש הביטוי?",
    "מה הם עקרונות יסוד של דיני חוזים?",
    "הסבר את מבנה בתי המשפט בישראל",
    "מהו עוולת הרשלנות ומה יסודותיה?",
    "מה ההבדל בין אחריות חוזית לאחריות נזיקית?",
    "הסבר את דוקטרינת תום הלב בדיני חוזים",
    "מהי משמעות ההפרה היסודית של חוזה?",
    "אילו תרופות עומדות לנפגע מהפרת חוזה?",
    // Economics / Finance
    "כיצד מחשבים ריבית אפקטיבית שנתית מריבית חודשית?",
    "מה ההבדל בין אג'ח צמודה לאג'ח לא צמודה?",
    "הסבר את מודל ה-NPV בהחלטות השקעה",
    "מהי השונות והסטיית התקן בסטטיסטיקה?",
    "כיצד מחשבים ערך נוכחי של תזרים מזומנים עתידי?",
    "מהו מדד בטא ומה משמעותו בשוק ההון?",
    "הסבר את עקרון הגיוון בתיק השקעות",
    "מה ההבדל בין שוק ראשוני לשוק משני?",
    "הסבר את מודל CAPM ומה הוא מניח",
    "מהי אינפלציה ואילו כלים יש לבנק המרכזי להתמודד איתה?",
    // Electrical Engineering / Technion
    "הסבר את חוק אוהם ויישומיו במעגלים חשמליים",
    "מהי תדירות תהודה במעגל RLC טורי?",
    "מה ההבדל בין מגבר פתוח לולאה לבין מגבר סגור לולאה?",
    "הסבר את הטרנספורמציית פורייה ומתי משתמשים בה",
    "מהו אות Nyquist ומה חשיבותו בדיגיטציה?",
    "הסבר את עקרון הסופרפוזיציה במעגלים לינאריים",
    "מהי פונקציית העברה של מערכת ומה ניתן ללמוד ממנה?",
    "הסבר את הבדל בין מיקרו-עיבוד למיקרו-בקר",
    "מהם שערי לוגיקה בסיסיים ומה הפונקציה של כל אחד?",
    "הסבר את שיטת node-voltage לפתרון מעגלים",
  ];

  function autoGenerate() {
    const q = AUTO_QUESTIONS[Math.floor(Math.random() * AUTO_QUESTIONS.length)];
    setSimQuestion(q);
  }

  // Knowledge tab state
  type Chunk = { id: string; payload: Record<string, any> };
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunksTotal, setChunksTotal] = useState(0);
  const [chunksOffset, setChunksOffset] = useState<number | null>(null);
  const [chunksNextOffset, setChunksNextOffset] = useState<number | null>(null);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunkFilterUni, setChunkFilterUni] = useState("");
  const [chunkFilterCourse, setChunkFilterCourse] = useState("");
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

  async function loadChunks(offset: number | null = null) {
    setChunksLoading(true);
    const params = new URLSearchParams();
    if (offset !== null) params.set("offset", String(offset));
    if (chunkFilterUni) params.set("university", chunkFilterUni);
    if (chunkFilterCourse) params.set("course", chunkFilterCourse);
    try {
      const r = await fetch(`/api/admin/chunks?${params}`);
      const d = await r.json();
      setChunks(d.points ?? []);
      setChunksTotal(d.total ?? 0);
      setChunksNextOffset(d.next_offset ?? null);
      setChunksOffset(offset);
    } finally {
      setChunksLoading(false);
    }
  }

  useEffect(() => { if (tab === "knowledge") loadChunks(null); }, [tab]);

  // Drive queue form
  const [driveUrl, setDriveUrl] = useState("");
  const [driveUniversity, setDriveUniversity] = useState("TAU");
  const [driveFaculty, setDriveFaculty] = useState("");
  const [driveNote, setDriveNote] = useState("");
  const [driveStatus, setDriveStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [queueItems, setQueueItems] = useState<QueueItem[]>(queue);

  const [processing, setProcessing] = useState(false);
  const [envVars, setEnvVars] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (tab !== "queue" || envVars) return;
    fetch("/api/admin/env-check").then(r => r.json()).then(d => { if (d.vars) setEnvVars(d.vars); }).catch(() => {});
  }, [tab]);

  async function refreshQueue() {
    const r = await fetch("/api/admin/queue-status").catch(() => null);
    if (!r?.ok) return;
    const d = await r.json().catch(() => ({}));
    if (d.queue) setQueueItems(d.queue);
  }

  // Fetch fresh queue data when tab switches to queue
  useEffect(() => { if (tab === "queue") refreshQueue(); }, [tab]);

  // Auto-refresh every 5s while items are processing
  useEffect(() => {
    if (tab !== "queue") return;
    const hasActive = queueItems.some(q => q.status === "pending" || q.status === "processing");
    if (!hasActive) return;
    const id = setInterval(refreshQueue, 5000);
    return () => clearInterval(id);
  }, [tab, queueItems]);

  async function runProcessNow() {
    setProcessing(true);
    await fetch("/api/admin/process-drive", { method: "POST" }).catch(() => {});
    // Refresh queue status after giving it a few seconds to start
    setTimeout(async () => {
      await refreshQueue();
      setProcessing(false);
    }, 4000);
  }

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
      setQueueItems(prev => [{ id: crypto.randomUUID(), url: driveUrl.trim(), university: driveUniversity || null, course_name: driveFaculty || null, submitted_at: new Date().toISOString(), status: "pending", email: null, files_found: null, chunks_created: null, error_msg: null, processed_at: null, log: null }, ...prev]);
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
            {(["overview", "users", "usage", "queue", "knowledge", "simulate"] as const).map(t => (
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

            {/* Env vars status panel */}
            {envVars && (
              <div style={{ ...cardStyle, borderColor: Object.values(envVars).every(Boolean) ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.4)" }}>
                <h3 style={{ fontWeight: 700, marginBottom: "0.75rem", fontSize: "13px", color: Object.values(envVars).every(Boolean) ? "var(--green)" : "#f87171" }}>
                  {Object.values(envVars).every(Boolean) ? "All env vars set" : "Missing env vars detected"}
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {Object.entries(envVars).map(([key, set]) => (
                    <span key={key} style={{
                      padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                      background: set ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.15)",
                      color: set ? "#34d399" : "#f87171",
                      border: `1px solid ${set ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.3)"}`,
                    }}>
                      {set ? "✓" : "✗"} {key}
                    </span>
                  ))}
                </div>
                {!envVars["GOOGLE_SERVICE_ACCOUNT_KEY"] && (
                  <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "8px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", fontSize: "12px", color: "#f87171" }}>
                    GOOGLE_SERVICE_ACCOUNT_KEY is not set. Drive processing will fail. Add it in Vercel project settings.
                  </div>
                )}
              </div>
            )}

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "14px", margin: 0 }}>Material queue</h3>
              <button
                onClick={runProcessNow}
                disabled={processing}
                style={{
                  padding: "6px 14px", borderRadius: "8px", border: "none",
                  background: processing ? "rgba(255,255,255,0.06)" : "rgba(79,142,247,0.15)",
                  color: processing ? "var(--text-muted)" : "var(--blue)",
                  fontSize: "12px", fontWeight: 700, cursor: processing ? "not-allowed" : "pointer",
                }}
              >
                {processing ? "Processing…" : "▶ Process Now"}
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Drive Folder", "Faculty / University", "Status", "Progress", "Submitted", "Log"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queueItems.map(item => {
                  const isPending = item.status === "pending";
                  const isProcessing = item.status === "processing";
                  const isDone = item.status === "done";
                  const isError = item.status === "error";
                  const statusColor = isDone ? "var(--green)" : isProcessing ? "var(--blue)" : isPending ? "var(--amber)" : "#f87171";
                  const statusBg = isDone ? "rgba(52,211,153,0.15)" : isProcessing ? "rgba(79,142,247,0.15)" : isPending ? "rgba(251,191,36,0.15)" : "rgba(248,113,113,0.15)";
                  return (
                    <React.Fragment key={item.id}>
                      <tr style={{ borderBottom: openLogId === item.id ? "none" : "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px", maxWidth: "240px" }}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            style={{ color: "var(--blue)", textDecoration: "none", fontSize: "11px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.url.replace("https://drive.google.com/drive/", "Drive/")}
                          </a>
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-secondary)", fontSize: "12px" }}>
                          {[item.course_name, item.university].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: statusBg, color: statusColor }}>
                            {isProcessing ? "⏳ processing" : item.status}
                          </span>
                          {isError && item.error_msg && (
                            <div style={{ fontSize: "10px", color: "#f87171", marginTop: "4px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              title={item.error_msg}>{item.error_msg}</div>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {isDone ? (
                            <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600 }}>
                              {item.files_found ?? 0} files · {item.chunks_created ?? 0} chunks
                            </span>
                          ) : isProcessing ? (
                            <div style={{ width: "80px", height: "4px", borderRadius: "4px", background: "rgba(79,142,247,0.15)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: "60%", background: "var(--blue)", borderRadius: "4px", animation: "pulse 1.5s ease infinite" }} />
                            </div>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "11px" }}>{fmtDate(item.submitted_at)}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                            {item.log ? (
                              <button onClick={() => setOpenLogId(openLogId === item.id ? null : item.id)}
                                style={{ padding: "2px 8px", borderRadius: "5px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: openLogId === item.id ? "var(--blue)" : "var(--text-muted)", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
                                {openLogId === item.id ? "▾ log" : "▸ log"}
                              </button>
                            ) : null}
                            {(isProcessing || isPending) && (
                              <button onClick={() => cancelItem(item.id)} disabled={actioningId === item.id} title="Reset to pending"
                                style={{ padding: "2px 7px", borderRadius: "5px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "#fbbf24", fontSize: "11px", cursor: "pointer" }}>
                                ✕ cancel
                              </button>
                            )}
                            <button onClick={() => deleteItem(item.id)} disabled={actioningId === item.id} title="Delete from queue"
                              style={{ padding: "2px 7px", borderRadius: "5px", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.1)", color: "#f87171", fontSize: "11px", cursor: "pointer" }}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                      {openLogId === item.id && item.log && (
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <td colSpan={6} style={{ padding: "0 12px 12px" }}>
                            <pre style={{
                              margin: 0, padding: "14px 16px", borderRadius: "10px",
                              background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
                              color: "#e6edf3", fontSize: "11px", lineHeight: 1.7,
                              fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
                              maxHeight: "320px", overflowY: "auto",
                            }}>
                              {item.log.split("\n").filter(Boolean).map((line, i) => {
                                const color = line.includes("✓") ? "#3fb950"
                                  : line.includes("✗") || line.includes("ERROR") ? "#f85149"
                                  : line.includes("Found") || line.includes("Done") ? "#79c0ff"
                                  : line.includes("batch") || line.includes("Starting") ? "#d2a8ff"
                                  : "#e6edf3";
                                return <span key={i} style={{ color, display: "block" }}>{line}</span>;
                              })}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {queueItems.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Queue is empty</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* ── SIMULATE ── */}
        {tab === "simulate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Input panel */}
            <div style={{ ...cardStyle, borderColor: "rgba(167,139,250,0.3)" }}>
              <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "14px", color: "var(--purple)" }}>RAG + AI Simulation</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Test the full pipeline: embed a question → search Qdrant → (optionally) get a Claude answer. Use this to verify retrieval quality before real students hit it.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <textarea
                  dir="auto"
                  value={simQuestion}
                  onChange={e => setSimQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && e.metaKey && runSimulation()}
                  placeholder="Ask a question as if you were a student… e.g. מה הם יסודות חוזה תקף?"
                  rows={3}
                  style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "14px", resize: "vertical", fontFamily: "inherit", outline: "none" }}
                />
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    value={simUniversity}
                    onChange={e => setSimUniversity(e.target.value)}
                    placeholder="Filter by university (optional, e.g. TAU)"
                    style={{ flex: 1, minWidth: "180px", padding: "9px 12px", borderRadius: "9px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={simWithAnswer} onChange={e => setSimWithAnswer(e.target.checked)} style={{ cursor: "pointer" }} />
                    Include AI answer
                  </label>
                  <button
                    onClick={autoGenerate}
                    style={{ padding: "9px 16px", borderRadius: "9px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    ✦ Auto
                  </button>
                  <button
                    onClick={runSimulation}
                    disabled={!simQuestion.trim() || simLoading}
                    style={{ padding: "9px 22px", borderRadius: "9px", border: "none", background: "var(--purple)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: simQuestion.trim() ? "pointer" : "not-allowed", opacity: (!simQuestion.trim() || simLoading) ? 0.6 : 1 }}
                  >
                    {simLoading ? "Running…" : "▶ Run"}
                  </button>
                </div>
                {simError && <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: "13px" }}>{simError}</div>}
              </div>
            </div>

            {/* Results */}
            {simResult && (
              <>
                {/* Chunks retrieved */}
                <div style={cardStyle}>
                  <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "14px" }}>
                    Retrieved chunks
                    <span style={{ marginLeft: "8px", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, background: simResult.chunks.length > 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.12)", color: simResult.chunks.length > 0 ? "var(--green)" : "#f87171" }}>
                      {simResult.chunks.length} found
                    </span>
                  </h3>
                  {simResult.chunks.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No chunks matched. Check that material is indexed and university filter is correct.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {simResult.chunks.map((c, i) => (
                        <div key={c.id} style={{ padding: "12px 14px", borderRadius: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--blue)", fontWeight: 700 }}>#{i+1}</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: c.score >= 0.7 ? "var(--green)" : c.score >= 0.5 ? "var(--amber)" : "#f87171" }}>{(c.score * 100).toFixed(1)}%</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px" }}>{c.filename}</span>
                            <span style={{ fontSize: "11px", color: "var(--blue)", marginLeft: "auto" }}>{c.university}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c.course}</span>
                            <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>{c.type}</span>
                          </div>
                          <p dir="auto" style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {c.text?.slice(0, 400)}{c.text?.length > 400 ? "…" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Answer */}
                {simResult.answer !== undefined && (
                  <div style={{ ...cardStyle, borderColor: "rgba(79,142,247,0.25)" }}>
                    <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "14px", color: "var(--blue)" }}>AI Answer (Sonnet 4.6)</h3>
                    <div dir="auto" style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {simResult.answer}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* ── KNOWLEDGE ── */}
        {tab === "knowledge" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Filters + stats row */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="Filter by university (e.g. TAU)"
                value={chunkFilterUni}
                onChange={e => setChunkFilterUni(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadChunks(null)}
                style={{ flex: 1, minWidth: "180px", padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px" }}
              />
              <input
                placeholder="Filter by course name"
                value={chunkFilterCourse}
                onChange={e => setChunkFilterCourse(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadChunks(null)}
                style={{ flex: 2, minWidth: "200px", padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px" }}
              />
              <button
                onClick={() => loadChunks(null)}
                disabled={chunksLoading}
                style={{ padding: "8px 18px", borderRadius: "10px", border: "none", background: "var(--blue)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: chunksLoading ? 0.6 : 1 }}
              >
                {chunksLoading ? "Loading…" : "Search"}
              </button>
              <div style={{ padding: "8px 14px", borderRadius: "10px", background: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: "13px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {fmtNum(chunksTotal)} total chunks
              </div>
            </div>

            {/* Chunks table */}
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                    {["Filename", "Course", "Uni", "Type", "Trust", "Text preview"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chunks.map(c => {
                    const p = c.payload;
                    const isExpanded = expandedChunk === c.id;
                    return (
                      <tr key={c.id}
                        onClick={() => setExpandedChunk(isExpanded ? null : c.id)}
                        style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", background: isExpanded ? "var(--bg-elevated)" : "transparent", transition: "background 0.1s" }}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "10px 14px", maxWidth: "220px" }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)", fontWeight: 500 }} title={p.filename}>
                            {p.filename ?? "—"}
                          </div>
                          {p.folder_path && (
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }} title={p.folder_path}>
                              {p.folder_path}
                            </div>
                          )}
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>chunk #{p.chunk_index ?? 0}</div>
                        </td>
                        <td style={{ padding: "10px 14px", maxWidth: "160px" }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{p.course ?? "—"}</div>
                          {p.course_number && <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{p.course_number}</div>}
                        </td>
                        <td style={{ padding: "10px 14px", color: "var(--blue)", fontWeight: 600, whiteSpace: "nowrap" }}>{p.university ?? "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                            background: p.type === "slides" ? "rgba(167,139,250,0.15)" : p.type === "notes" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
                            color: p.type === "slides" ? "var(--purple)" : p.type === "notes" ? "var(--green)" : "var(--text-muted)" }}>
                            {p.type ?? "?"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                            background: p.trust_level === "verified" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
                            color: p.trust_level === "verified" ? "var(--green)" : "var(--text-muted)" }}>
                            {p.trust_level ?? "?"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", maxWidth: "300px" }}>
                          {isExpanded ? (
                            <div style={{ color: "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: "12px", maxHeight: "200px", overflowY: "auto" }}>
                              {p.text}
                            </div>
                          ) : (
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                              {p.text?.slice(0, 120) ?? "—"}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {chunks.length === 0 && !chunksLoading && (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No chunks found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={() => loadChunks(null)}
                disabled={chunksOffset === null || chunksLoading}
                style={{ padding: "7px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: chunksOffset === null ? 0.4 : 1 }}
              >
                First page
              </button>
              <button
                onClick={() => chunksNextOffset !== null && loadChunks(chunksNextOffset)}
                disabled={chunksNextOffset === null || chunksLoading}
                style={{ padding: "7px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: chunksNextOffset === null ? 0.4 : 1 }}
              >
                Next 20 →
              </button>
              {chunksOffset !== null && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>offset: {chunksOffset}</span>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
