import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Pool } from "pg";
import AppShell from "@/components/layout/AppShell";
import DashboardWorkspace from "./DashboardWorkspace";
import PlatformHub from "./PlatformHub";
import BetaGate from "./BetaGate";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;
  const headersList = headers();
  const host = headersList.get("host") ?? "";

  // Detect current platform from subdomain
  const isUni     = host.startsWith("uni.");
  const isPsycho  = host.startsWith("psycho.");
  const isYael    = host.startsWith("yael.");
  const isBarrut  = host.startsWith("bagrut.");
  const isSubdomain = isUni || isPsycho || isYael || isBarrut;

  // ── Platform Hub (proffy.study/dashboard) ─────────────────────────────────
  if (!isSubdomain) {
    const [userRes, platformSubsRes] = await Promise.all([
      pool.query("SELECT onboarding_done, email_verified, name FROM users WHERE id = $1", [uid]),
      pool.query(
        "SELECT platform, plan, status FROM platform_subscriptions WHERE user_id = $1 AND status = 'active'",
        [uid]
      ).catch(() => ({ rows: [] })),
    ]);

    if (!userRes.rows[0]?.email_verified) redirect("/verify-email");
    if (!userRes.rows[0]?.onboarding_done) redirect("/onboarding");

    const platformPlans: Record<string, string> = {};
    for (const row of platformSubsRes.rows) {
      platformPlans[row.platform] = row.plan;
    }

    // Per-platform stats for activated platforms
    const statsQueries: Promise<any>[] = [];
    const activePlatforms = Object.keys(platformPlans);

    const uniStats = activePlatforms.includes("uni")
      ? pool.query(`
          SELECT
            (SELECT COUNT(*) FROM courses WHERE user_id = $1)::int AS courses,
            (SELECT COUNT(*) FROM flashcards WHERE user_id = $1 AND next_review_at <= NOW())::int AS fc_due,
            (SELECT COUNT(*) FROM chat_messages cm JOIN chat_sessions cs ON cs.id = cm.session_id WHERE cs.user_id = $1)::int AS messages
        `, [uid]).catch(() => ({ rows: [{ courses: 0, fc_due: 0, messages: 0 }] }))
      : Promise.resolve(null);

    const uniStatsResult = await uniStats;

    const firstName = (userRes.rows[0]?.name ?? "").split(" ")[0] || "there";

    return (
      <PlatformHub
        firstName={firstName}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
        userImage={session.user.image ?? null}
        platformPlans={platformPlans}
        uniStats={uniStatsResult?.rows[0] ?? null}
      />
    );
  }

  // ── Platform-specific dashboard (uni.proffy.study/dashboard etc.) ──────────
  const platform = isUni ? "uni" : isPsycho ? "psycho" : isYael ? "yael" : "bagrut";

  // Check if user has activated this platform
  const accessRes = await pool.query(
    "SELECT plan FROM platform_subscriptions WHERE user_id = $1 AND platform = $2 AND status = 'active'",
    [uid, platform]
  );

  if (accessRes.rows.length === 0) {
    return <BetaGate platform={platform} userId={uid} />;
  }

  // ── Uni dashboard (existing) ───────────────────────────────────────────────
  if (isUni) {
    const [coursesRes, usageRes, planRes, fcRes, notesRes, userRes, courseStatsRes, recentRes] = await Promise.all([
      pool.query("SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [uid]),
      pool.query("SELECT SUM(tokens_input) AS tokens_input, SUM(tokens_output) AS tokens_output FROM usage WHERE user_id = $1 AND date >= DATE_TRUNC('month', CURRENT_DATE)", [uid]),
      pool.query("SELECT plan FROM platform_subscriptions WHERE user_id = $1 AND platform = 'uni' AND status = 'active'", [uid]),
      pool.query("SELECT COUNT(*) as c FROM flashcards WHERE user_id = $1 AND next_review_at <= NOW()", [uid]).catch(() => ({ rows: [{ c: "0" }] })),
      pool.query("SELECT COUNT(*) as c FROM course_notes WHERE user_id = $1", [uid]).catch(() => ({ rows: [{ c: "0" }] })),
      pool.query("SELECT onboarding_done, email_verified FROM users WHERE id = $1", [uid]).catch(() => ({ rows: [{ onboarding_done: true, email_verified: true }] })),
      pool.query(`
        SELECT
          c.id, c.name, c.professor, c.exam_date, c.number,
          COALESCE(m.cnt, 0)::int AS material_count,
          COALESCE(msg.cnt, 0)::int AS message_count,
          msg.last_chat
        FROM courses c
        LEFT JOIN (
          SELECT course_id, COUNT(*) AS cnt FROM materials GROUP BY course_id
        ) m ON m.course_id = c.id
        LEFT JOIN (
          SELECT cs.course_id, COUNT(cm.id) AS cnt, MAX(cm.created_at) AS last_chat
          FROM chat_sessions cs
          LEFT JOIN chat_messages cm ON cm.session_id = cs.id
          WHERE cs.user_id = $1
          GROUP BY cs.course_id
        ) msg ON msg.course_id = c.id
        WHERE c.user_id = $1
        ORDER BY msg.last_chat DESC NULLS LAST
      `, [uid]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT cs.id, cs.course_id, cs.created_at, c.name AS course_name,
          COUNT(cm.id)::int AS message_count
        FROM chat_sessions cs
        LEFT JOIN courses c ON c.id = cs.course_id
        LEFT JOIN chat_messages cm ON cm.session_id = cs.id
        WHERE cs.user_id = $1
        GROUP BY cs.id, c.name
        ORDER BY cs.created_at DESC
        LIMIT 5
      `, [uid]).catch(() => ({ rows: [] })),
    ]);

    if (!userRes.rows[0]?.email_verified) redirect("/verify-email");
    if (!userRes.rows[0]?.onboarding_done) redirect("/onboarding");

    const courses = coursesRes.rows;
    const monthTokens = (Number(usageRes.rows[0]?.tokens_input) || 0) + (Number(usageRes.rows[0]?.tokens_output) || 0);
    const userPlan = planRes.rows[0]?.plan ?? "free";
    const MONTHLY_LIMITS: Record<string, number> = { free: 600_000, pro: 4_000_000, max: 10_000_000 };
    const tokenLimit = MONTHLY_LIMITS[userPlan] ?? MONTHLY_LIMITS.free;
    const fcDue = parseInt(fcRes.rows[0]?.c ?? "0", 10);
    const notesCount = parseInt(notesRes.rows[0]?.c ?? "0", 10);
    const firstName = (session.user.name ?? "").split(" ")[0] || "there";
    const nextExam = courses
      .filter((c: any) => c.exam_date)
      .map((c: any) => ({ name: c.name, days: Math.ceil((new Date(c.exam_date).getTime() - Date.now()) / 86400000) }))
      .filter((c: any) => c.days >= 0)
      .sort((a: any, b: any) => a.days - b.days)[0] ?? null;

    return (
      <AppShell courses={courses} flashcardsDue={fcDue} userPlan={userPlan as "free" | "pro" | "max"}>
        <DashboardWorkspace
          firstName={firstName}
          courses={courses}
          monthTokens={monthTokens}
          tokenLimit={tokenLimit}
          userPlan={userPlan}
          fcDue={fcDue}
          notesCount={notesCount}
          nextExam={nextExam}
        />
      </AppShell>
    );
  }

  // ── Other platforms (psycho, yael, bagrut) — coming soon ──────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: "16px", fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ fontSize: "48px" }}>🚧</div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>Coming Soon</div>
      <div style={{ fontSize: "16px", color: "var(--text-secondary)" }}>
        This platform is under construction.
      </div>
      <a href={process.env.NODE_ENV === "production" ? "https://proffy.study/dashboard" : "/dashboard"}
        style={{ color: "var(--blue)", fontSize: "15px", marginTop: "8px" }}>
        Back to Dashboard
      </a>
    </div>
  );
}
