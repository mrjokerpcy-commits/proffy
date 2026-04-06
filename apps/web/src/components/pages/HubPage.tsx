"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LangToggle, { useLang } from "@/components/ui/LangToggle";

// ─── Constellation canvas ─────────────────────────────────────────────────────
function ConstellationBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf: number;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    let W = window.innerWidth, H = window.innerHeight;
    c.width = W; c.height = H;
    const onResize = () => { W = window.innerWidth; H = window.innerHeight; c.width = W; c.height = H; };
    window.addEventListener("resize", onResize, { passive: true });
    const N = isMobile ? 18 : 40;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
      r: Math.random() * 1.2 + 0.4,
    }));
    let frame = 0;
    const draw = () => {
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      frame++;
      // Throttle to ~30fps on mobile (skip every other frame)
      if (isMobile && frame % 2 !== 0) { raf = requestAnimationFrame(draw); return; }
      const light = document.documentElement.classList.contains("light");
      const rgb = light ? "22,163,74" : "34,197,94";
      ctx.clearRect(0, 0, W, H);
      if (!reduced) for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      if (!isMobile) for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d2 = dx*dx+dy*dy;
        if (d2 < 14400) { const a = (light?.20:.38)*(1-Math.sqrt(d2)/120); ctx.beginPath(); ctx.strokeStyle=`rgba(${rgb},${a.toFixed(3)})`; ctx.lineWidth=.8; ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.stroke(); }
      }
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(${rgb},${light?.32:.58})`; ctx.fill(); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }} />;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      style={{ position:"relative", zIndex:1, maxWidth:"1400px", margin:"0 auto", padding:"0 max(32px,4vw)", ...style }}
    >
      {children}
    </motion.section>
  );
}

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    badge: "The Proffy Network", getAccess: "Get Access",
    h1a:"One platform.", h1b:"Every Israeli student.",
    sub:"From bagrut to university — AI that understands your course, your professor, and your exam.",
    cta:"Start with Proffy App",
    missionBadge:"Our Mission",
    missionTitle:"Academic intelligence for every Israeli student.",
    missionBody:"Proffy exists to give every student the advantage they deserve. We combine your course material, professor context, and AI reasoning so you can study smarter, prepare faster, and walk into every exam with confidence.",
    whoBadge:"Who We Are",
    whoTitle:"Built by students, for students.",
    whoBody:"We were tired of guessing what would be on the exam, which professor to pick, and how to structure our study time. So we built the tool we wished we had. Every feature in Proffy exists because a real student needed it.",
    howBadge:"How It Works",
    howTitle:"Three steps to exam confidence.",
    howSteps:[
      { title:"Upload your material", body:"Drop your slides, syllabi, past exams, and professor notes. Proffy indexes everything.", icon:"upload" },
      { title:"Ask anything", body:"Chat with an AI that knows your exact course — not a generic tutor, your tutor.", icon:"chat" },
      { title:"Walk in ready", body:"Focused study plans, source-cited answers, and exam-targeted summaries.", icon:"check" },
    ],
    productsBadge:"The Network",
    productsTitle:"One AI, every stage of education.",
    meetBadge:"Meet Proffy",
    meetTitle:"Your AI study companion.",
    meetBody:"Proffy is not a search engine. It reads your actual course material, learns your professor's style, and answers like a top student who aced this exact class last semester. No hallucinations. No generic advice. Just what you need to pass.",
    meetPoints:["Knows your course, professor, and exam date","Answers with sources from your own material","Builds exam-focused study plans","Available 24/7 — even the night before"],
    ctaTitle:"Ready to study smarter?",
    ctaSub:"Join thousands of students across Israeli universities.",
    ctaBtn:"Get Early Access",
    footer:`© ${new Date().getFullYear()} Proffy · Built for Israeli students`,
    contact:"Contact", privacy:"Privacy", terms:"Terms",
  },
  he: {
    badge:"רשת Proffy", getAccess:"קבל גישה",
    h1a:"פלטפורמה אחת.", h1b:"לכל סטודנט ישראלי.",
    sub:"מבגרות ועד האוניברסיטה — AI שמבין את הקורס, המרצה והבחינה שלך.",
    cta:"התחל עם Proffy App",
    missionBadge:"המשימה שלנו",
    missionTitle:"אינטליגנציה אקדמית לכל סטודנט ישראלי.",
    missionBody:"Proffy נוצר כדי לתת לכל סטודנט את היתרון שהוא ראוי לו. אנחנו משלבים את חומר הלימוד שלך, ידע על המרצה, וחשיבה של AI — כדי שתלמד חכם יותר, תתכונן מהר יותר, ותיכנס לכל בחינה בביטחון.",
    whoBadge:"מי אנחנו",
    whoTitle:"נבנה על ידי סטודנטים, לסטודנטים.",
    whoBody:"נמאס לנו לנחש מה יצא בבחינה, איזה מרצה לבחור, ואיך לארגן את זמן הלמידה שלנו. אז בנינו את הכלי שרצינו שיהיה לנו. כל פיצ'ר ב-Proffy קיים כי סטודנט אמיתי היה צריך אותו.",
    howBadge:"איך זה עובד",
    howTitle:"שלושה שלבים לביטחון בבחינה.",
    howSteps:[
      { title:"העלה את החומר שלך", body:"הפל שקפים, סילבוס, בחינות ישנות והערות מרצה. Proffy מאנדקס הכל.", icon:"upload" },
      { title:"שאל הכל", body:"שוחח עם AI שמכיר את הקורס המדויק שלך — לא מורה גנרי, המורה שלך.", icon:"chat" },
      { title:"כנס מוכן", body:"תוכניות לימוד ממוקדות, תשובות עם מקורות מהחומר שלך, וסיכומי בחינה.", icon:"check" },
    ],
    productsBadge:"הרשת",
    productsTitle:"AI אחד, כל שלב בחינוך.",
    meetBadge:"הכר את Proffy",
    meetTitle:"עוזר הלמידה שלך.",
    meetBody:"Proffy הוא לא מנוע חיפוש. הוא קורא את חומר הלימוד האמיתי שלך, לומד את סגנון המרצה שלך, ועונה כמו הסטודנט הכי טוב שעבר את הקורס הזה בסמסטר האחרון. לא המצאות. לא עצות גנריות. רק מה שצריך כדי לעבור.",
    meetPoints:["מכיר את הקורס, המרצה ותאריך הבחינה","עונה עם מקורות מהחומר שלך","בונה תוכניות לימוד ממוקדות לבחינה","זמין 24/7 — גם בלילה לפני הבחינה"],
    ctaTitle:"מוכן ללמוד חכם יותר?",
    ctaSub:"הצטרף לאלפי סטודנטים מאוניברסיטאות ישראליות.",
    ctaBtn:"קבל גישה מוקדמת",
    footer:`© ${new Date().getFullYear()} Proffy · נבנה לסטודנטים ישראלים`,
    contact:"צור קשר", privacy:"פרטיות", terms:"תנאים",
  },
};

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS = (lang: "en"|"he") => [
  { key:"bagrut",  color:"#22c55e", border:"rgba(139,92,246,0.22)", glow:"rgba(139,92,246,0.12)",
    label:"Proffy Bagrut",  sub:lang==="he"?"בגרות":"Bagrut",   live:false, href:"https://bagrut.proffy.study",
    desc:lang==="he"?"נבנה לבני 16-18. נושאים כקלפים, רצפים, ו-AI שמדבר בשפה שלך.":"Built for 16-18. Subjects as cards, streaks, AI that speaks your language." },
  { key:"yael",   color:"#f59e0b", border:"rgba(245,158,11,0.22)",  glow:"rgba(245,158,11,0.11)",
    label:lang==="he"?'Proffy יע"ל':"Proffy Yael", sub:lang==="he"?'יע"ל':"Yael", live:false, href:"https://yael.proffy.study",
    desc:lang==="he"?'הכנה ליע"ל בעברית, חמה ואנושית.':"Hebrew-first yael prep, warm and human." },
  { key:"psycho", color:"#d4a017", border:"rgba(212,160,23,0.22)",  glow:"rgba(212,160,23,0.11)",
    label:"Proffy Psycho",  sub:lang==="he"?"פסיכומטרי":"Psychometric", live:false, href:"https://psycho.proffy.study",
    desc:lang==="he"?"הכנה רצינית לפסיכומטרי. תרגילים מובנים בכל קטגוריה.":"Serious psychometric prep. Structured drills. Built to score." },
  { key:"app",    color:"#16a34a", border:"rgba(22,163,74,0.24)",   glow:"rgba(22,163,74,0.13)",
    label:"Proffy App",     sub:lang==="he"?"אוניברסיטה":"University", live:true,  href:"https://uni.proffy.study",
    desc:lang==="he"?"העלה שקפים, שאל הכל, עבור את הבחינה. ה-AI שמכיר את הקורס שלך.":"Upload slides, ask anything, ace the exam. AI that knows your course." },
];

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:"rgba(22,163,74,0.1)", border:"1px solid rgba(22,163,74,0.2)", borderRadius:"99px", padding:"5px 16px", marginBottom:"20px" }}>
      <span className="hub-badge-dot" style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#16a34a", boxShadow:"0 0 8px #16a34a", flexShrink:0 }} />
      <span style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", color:"#16a34a", textTransform:"uppercase" }}>{children}</span>
    </div>
  );
}

// ─── Step icons ───────────────────────────────────────────────────────────────
function StepIcon({ icon }: { icon: string }) {
  if (icon === "upload") return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
  if (icon === "chat") return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

// ─── Request access modal ─────────────────────────────────────────────────────
function AccessModal({ lang, onClose }: { lang: "en"|"he"; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [study, setStudy] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const isRtl = lang === "he";

  const labels = {
    en: { title:"Request Access", sub:"We'll reach out with your access code.", name:"Full name", email:"Email", study:"What are you studying?", studyPlaceholder:"e.g. Computer Science, TAU semester B", submit:"Send Request", done:"You're on the list!", doneSub:"We'll be in touch soon.", err:"Something went wrong. Try again." },
    he: { title:"בקשת גישה", sub:"נחזור אליך עם קוד הגישה שלך.", name:"שם מלא", email:"אימייל", study:"מה אתה לומד?", studyPlaceholder:"לדוגמה: מדעי המחשב, ת\"א סמסטר ב", submit:"שלח בקשה", done:"!אתה ברשימה", doneSub:"ניצור איתך קשר בקרוב.", err:"משהו השתבש. נסה שוב." },
  }[lang];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, study }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch { setStatus("error"); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.94, y:16 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.94, y:16 }}
        transition={{ duration:0.25, ease:[0.16,1,0.3,1] }}
        onClick={e => e.stopPropagation()}
        style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-light)", borderRadius:"22px", padding:"36px", width:"100%", maxWidth:"440px", position:"relative", direction: isRtl ? "rtl" : "ltr" }}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position:"absolute", top:"16px", insetInlineEnd:"16px", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:"6px", borderRadius:"8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {status === "done" ? (
          <div style={{ textAlign:"center", padding:"12px 0" }}>
            <motion.div initial={{ scale:0.7, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:"spring", stiffness:260, damping:18 }}>
              <Image src="/mascot/wave.png" alt="Done" width={100} height={100} style={{ objectFit:"contain", margin:"0 auto 16px" }} draggable={false} />
            </motion.div>
            <h3 style={{ fontSize:"22px", fontWeight:900, marginBottom:"8px" }}>{labels.done}</h3>
            <p style={{ fontSize:"14px", color:"var(--text-secondary)" }}>{labels.doneSub}</p>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize:"21px", fontWeight:900, marginBottom:"6px" }}>{labels.title}</h3>
            <p style={{ fontSize:"13px", color:"var(--text-secondary)", marginBottom:"24px" }}>{labels.sub}</p>

            <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              <div>
                <label style={{ fontSize:"12px", fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:"6px" }}>{labels.name}</label>
                <input className="input-ring" value={name} onChange={e => setName(e.target.value)} placeholder={isRtl ? "ישראל ישראלי" : "John Smith"} required
                  style={{ width:"100%", padding:"11px 14px", borderRadius:"10px", background:"var(--bg-surface)", color:"var(--text-primary)", fontSize:"14px" }} />
              </div>
              <div>
                <label style={{ fontSize:"12px", fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:"6px" }}>{labels.email}</label>
                <input className="input-ring" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                  style={{ width:"100%", padding:"11px 14px", borderRadius:"10px", background:"var(--bg-surface)", color:"var(--text-primary)", fontSize:"14px" }} />
              </div>
              <div>
                <label style={{ fontSize:"12px", fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:"6px" }}>{labels.study}</label>
                <input className="input-ring" value={study} onChange={e => setStudy(e.target.value)} placeholder={labels.studyPlaceholder}
                  style={{ width:"100%", padding:"11px 14px", borderRadius:"10px", background:"var(--bg-surface)", color:"var(--text-primary)", fontSize:"14px" }} />
              </div>

              {status === "error" && (
                <p style={{ fontSize:"12px", color:"var(--red)", margin:0 }}>{labels.err}</p>
              )}

              <button type="submit" disabled={!name.trim() || !email.trim() || status === "loading"} className="btn-primary"
                style={{ padding:"13px", borderRadius:"12px", fontSize:"15px", fontWeight:700, border:"none", cursor:"pointer", marginTop:"4px" }}>
                {status === "loading" ? (isRtl ? "שולח..." : "Sending…") : labels.submit}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Hub Page ─────────────────────────────────────────────────────────────────
export default function HubPage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useLang();
  const [showModal, setShowModal] = useState(false);
  useEffect(() => setMounted(true), []);

  const t = T[lang];
  const isRtl = lang === "he";
  const dir = isRtl ? "rtl" : "ltr";
  const ff = isRtl ? "var(--font-noto-hebrew),system-ui,sans-serif" : "var(--font-inter),system-ui,sans-serif";
  const products = PRODUCTS(lang);

  return (
    <div data-hub style={{ minHeight:"100vh", background:"var(--bg-base)", color:"var(--text-primary)", position:"relative", overflowX:"hidden", fontFamily:ff, direction:dir }}>
      <ConstellationBg />

      {/* ── Access modal ── */}
      <AnimatePresence>
        {showModal && <AccessModal lang={lang} onClose={() => setShowModal(false)} />}
      </AnimatePresence>

      {/* ── Nav ── */}
      <nav style={{ position:"fixed", top:0, insetInlineStart:0, insetInlineEnd:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 max(32px,4vw)", height:"62px", background:"var(--nav-bg)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:"1px solid var(--nav-border)" }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <Image src="/logo-header-dark.png" alt="Proffy" width={160} height={52} className="hub-logo-dark" style={{ objectFit:"contain", height:"40px", width:"auto" }} draggable={false} priority />
          <Image src="/logo-header.png" alt="Proffy" width={160} height={52} className="hub-logo-light" style={{ objectFit:"contain", height:"40px", width:"auto" }} draggable={false} priority />
        </div>
        <div className="hub-nav-toggles">
          {mounted && <span className="hub-hide-mobile"><ThemeToggle /></span>}
          {mounted && <LangToggle />}
          <button onClick={() => setShowModal(true)} style={{ padding:"8px 18px", borderRadius:"10px", fontSize:"13px", fontWeight:600, background:"linear-gradient(135deg,#16a34a,#22c55e)", color:"white", border:"none", cursor:"pointer", boxShadow:"0 2px 12px rgba(22,163,74,0.28)", transition:"opacity 0.12s,transform 0.12s", whiteSpace:"nowrap" }}
            onMouseEnter={e=>{e.currentTarget.style.opacity="0.85";e.currentTarget.style.transform="translateY(-1px)"}}
            onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform=""}}>
            {t.getAccess}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position:"relative", zIndex:1, padding:"120px max(32px,4vw) 80px", overflow:"hidden" }}>
        {/* Spotlight glow */}
        <div aria-hidden="true" style={{
          position:"absolute", top:"0%", left:"50%", transform:"translateX(-50%)",
          width:"900px", height:"700px", borderRadius:"50%", pointerEvents:"none", zIndex:0,
          background:"radial-gradient(ellipse at 50% 35%, rgba(22,163,74,0.28) 0%, rgba(74,222,128,0.12) 40%, transparent 72%)",
          filter:"blur(48px)",
        }} />

        <div className="hub-hero-grid">
          {/* Text side */}
          <div style={{ direction:dir }}>
            <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.5}}>
              <Badge>{t.badge}</Badge>
            </motion.div>

            <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.08}}
              style={{ fontSize:"clamp(38px,5.5vw,82px)", fontWeight:900, letterSpacing:"-0.04em", lineHeight:1.08, marginBottom:"20px", color:"var(--text-primary)" }}>
              {t.h1a}<br />
              <span className="hub-hero-text">{t.h1b}</span>
            </motion.h1>

            <motion.p initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.55,delay:0.14}}
              style={{ fontSize:"clamp(15px,1.4vw,18px)", color:"var(--text-secondary)", lineHeight:1.75, maxWidth:"480px", marginBottom:"36px" }}>
              {t.sub}
            </motion.p>

            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.2}}
              className="hub-cta-row" style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
              <a href="https://uni.proffy.study/dashboard"
                style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"14px 36px", borderRadius:"13px", fontSize:"16px", fontWeight:700, background:"linear-gradient(135deg,#16a34a,#22c55e)", color:"white", textDecoration:"none", boxShadow:"0 6px 28px rgba(22,163,74,0.32)", transition:"transform 0.12s,box-shadow 0.12s" }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 36px rgba(22,163,74,0.42)"}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 6px 28px rgba(22,163,74,0.32)"}}>
                {t.cta}
              </a>
              <a href="#products"
                style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"14px 28px", borderRadius:"13px", fontSize:"16px", fontWeight:600, background:"rgba(22,163,74,0.08)", color:"var(--blue)", textDecoration:"none", border:"1px solid rgba(22,163,74,0.25)", transition:"background 0.12s,border-color 0.12s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(22,163,74,0.14)";e.currentTarget.style.borderColor="rgba(22,163,74,0.45)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(22,163,74,0.08)";e.currentTarget.style.borderColor="rgba(22,163,74,0.25)"}}>
                {lang === "he" ? "גלה עוד" : "Learn more"}
              </a>
            </motion.div>
          </div>

          {/* Owl side — hidden on mobile */}
          <motion.div className="hub-hero-owl" initial={{opacity:0,x:32}} animate={{opacity:1,x:0}} transition={{duration:0.7,delay:0.1}}>
            <motion.div animate={{y:[0,-12,0]}} transition={{duration:4,repeat:Infinity,ease:"easeInOut"}}>
              <Image src="/mascot/hero.png" alt="Proffy mascot" width={540} height={540} style={{ objectFit:"contain", display:"block" }} draggable={false} priority />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Feature bar ── */}
      <Section style={{ padding:"0 max(32px,4vw) 80px" }}>
        <div className="hub-feature-bar" style={{ display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"center", gap:"12px" }}>
          {(lang === "he"
            ? ["AI שמכיר את הקורס","תשובות עם מקורות","עברית + אנגלית","כל הפלטפורמות","זמין 24/7"]
            : ["Course-aware AI","Source-cited answers","Hebrew & English","All platforms","Available 24/7"]
          ).map(f => (
            <div key={f} style={{ display:"flex", alignItems:"center", gap:"8px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"99px", padding:"9px 18px", boxShadow:"var(--card-shadow)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontSize:"13px", fontWeight:500, color:"var(--text-secondary)", whiteSpace:"nowrap" }}>{f}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Mission ── */}
      <Section style={{ padding:"80px max(32px,4vw)" }}>
        <div className="hub-two-col">
          <div>
            <Badge>{t.missionBadge}</Badge>
            <h2 style={{ fontSize:"clamp(28px,3vw,46px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.12, marginBottom:"22px" }}>{t.missionTitle}</h2>
            <p style={{ fontSize:"17px", color:"var(--text-secondary)", lineHeight:1.8 }}>{t.missionBody}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
            {(lang === "he" ? [
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, title:"לומד חכם יותר", sub:"AI שמתאים את עצמו לחומר הלימוד שלך ולסגנון הבחינה." },
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, title:"חוסך זמן", sub:"קבל תשובות מדויקות תוך שניות, בלי לחפש בגוגל שעות." },
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title:"תשובות עם מקורות", sub:"כל תשובה מקושרת לשקף או לדף הרלוונטי מהחומר שלך." },
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, title:"זמין 24/7", sub:"גם בלילה לפני הבחינה — Proffy תמיד כאן." },
            ] : [
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, title:"Study smarter", sub:"AI that adapts to your material, professor style, and exam format." },
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, title:"Save time", sub:"Get precise answers in seconds, not after hours of searching." },
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title:"Source-cited answers", sub:"Every answer links back to the slide or page it came from." },
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, title:"Available 24/7", sub:"Even the night before your exam, Proffy is always on." },
            ]).map((card, i) => (
              <div key={i} style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"16px", padding:"22px", boxShadow:"var(--card-shadow)", display:"flex", flexDirection:"column", gap:"10px" }}>
                <div style={{ width:"38px", height:"38px", borderRadius:"10px", background:"rgba(22,163,74,0.1)", border:"1px solid rgba(22,163,74,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {card.icon}
                </div>
                <p style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)", lineHeight:1.3 }}>{card.title}</p>
                <p style={{ fontSize:"12px", color:"var(--text-secondary)", lineHeight:1.6 }}>{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Who We Are ── */}
      <Section style={{ padding:"80px max(32px,4vw)" }}>
        <div className="hub-two-col">
          <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"24px", padding:"40px", boxShadow:"var(--card-shadow)" }}>
            <p style={{ fontSize:"22px", fontWeight:700, lineHeight:1.6, color:"var(--text-primary)", fontStyle:"italic" }}>
              {lang === "he"
                ? '"בנינו את הכלי שרצינו שיהיה לנו בתקופת הלימודים שלנו."'
                : '"We built the tool we wished we had when we were students."'}
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginTop:"24px" }}>
              <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:"linear-gradient(135deg,#16a34a,#4ade80)", flexShrink:0, overflow:"hidden" }}>
                <Image src="/mascot/avatar.png" alt="Proffy" width={40} height={40} style={{ objectFit:"cover", width:"100%", height:"100%" }} draggable={false} />
              </div>
              <div>
                <p style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)" }}>Proffy Team</p>
                <p style={{ fontSize:"12px", color:"var(--text-muted)" }}>
                  {lang === "he" ? "מייסדים, ישראל" : "Founders, Israel"}
                </p>
              </div>
            </div>
          </div>
          <div>
            <Badge>{t.whoBadge}</Badge>
            <h2 style={{ fontSize:"clamp(28px,3vw,46px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.12, marginBottom:"22px" }}>{t.whoTitle}</h2>
            <p style={{ fontSize:"17px", color:"var(--text-secondary)", lineHeight:1.8 }}>{t.whoBody}</p>
          </div>
        </div>
      </Section>

      {/* ── How It Works ── */}
      <Section style={{ padding:"80px max(32px,4vw)" }}>
        <div style={{ textAlign:"center", marginBottom:"56px" }}>
          <Badge>{t.howBadge}</Badge>
          <h2 style={{ fontSize:"clamp(28px,3vw,46px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.12 }}>{t.howTitle}</h2>
        </div>
        <div className="hub-three-col">
          {t.howSteps.map((step, i) => (
            <motion.div key={i} initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,delay:i*0.1}}
              style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"20px", padding:"36px 32px", position:"relative", overflow:"hidden", boxShadow:"var(--card-shadow)" }}>
              <div style={{ position:"absolute", top:0, insetInlineStart:"50%", transform:"translateX(-50%)", width:"200px", height:"200px", borderRadius:"50%", background:"radial-gradient(circle,rgba(22,163,74,0.07) 0%,transparent 70%)", pointerEvents:"none" }} />
              <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"20px" }}>
                <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"38px", height:"38px", borderRadius:"10px", background:"rgba(22,163,74,0.1)", border:"1px solid rgba(22,163,74,0.2)", fontSize:"14px", fontWeight:800, color:"#16a34a" }}>{i+1}</div>
                <div style={{ width:"40px", height:"40px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <StepIcon icon={step.icon} />
                </div>
              </div>
              <h3 style={{ fontSize:"18px", fontWeight:800, marginBottom:"10px" }}>{step.title}</h3>
              <p style={{ fontSize:"14px", color:"var(--text-secondary)", lineHeight:1.7 }}>{step.body}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Products ── */}
      <Section style={{ padding:"80px max(32px,4vw)" }} id="products">
        <div style={{ textAlign:"center", marginBottom:"52px" }}>
          <Badge>{t.productsBadge}</Badge>
          <h2 style={{ fontSize:"clamp(28px,3vw,46px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.12 }}>{t.productsTitle}</h2>
        </div>
        <div className="hub-four-col">
          {products.map((p,i) => (
            <motion.a key={p.key} href={p.live ? p.href : undefined}
              initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,delay:i*0.07}}
              className="hub-card"
              style={{ display:"block", textDecoration:"none", color:"inherit", border:`1px solid ${p.border}`, borderRadius:"18px", padding:"26px 22px", position:"relative", overflow:"hidden", cursor:p.live?"pointer":"default", transition:"transform 0.15s,border-color 0.15s,box-shadow 0.15s" }}
              onMouseEnter={e=>{ if(!p.live) return; e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor=p.color; e.currentTarget.style.boxShadow=`0 16px 40px ${p.glow}`; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.borderColor=p.border; e.currentTarget.style.boxShadow=""; }}>
              <div style={{ position:"absolute", top:0, insetInlineStart:0, width:"140px", height:"140px", borderRadius:"50%", background:`radial-gradient(circle,${p.glow} 0%,transparent 70%)`, transform:"translate(-35%,-35%)", pointerEvents:"none" }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
                <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:`${p.color}18`, border:`1px solid ${p.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:"16px", fontWeight:900, color:p.color }}>{p.sub.charAt(0)}</span>
                </div>
                <span style={{ fontSize:"10px", fontWeight:700, padding:"3px 9px", borderRadius:"99px", background:p.live?`${p.color}18`:"rgba(128,128,128,0.07)", color:p.live?p.color:"var(--text-disabled)", border:`1px solid ${p.live?p.border:"var(--border)"}` }}>
                  {p.live ? (lang==="he"?"זמין":"Live") : (lang==="he"?"בקרוב":"Soon")}
                </span>
              </div>
              <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:p.color, marginBottom:"5px" }}>{p.sub}</div>
              <h3 style={{ fontSize:"17px", fontWeight:800, letterSpacing:"-0.02em", marginBottom:"9px" }}>{p.label}</h3>
              <p style={{ fontSize:"13px", color:"var(--text-secondary)", lineHeight:1.65 }}>{p.desc}</p>
            </motion.a>
          ))}
        </div>
      </Section>

      {/* ── Meet Proffy ── */}
      <Section style={{ padding:"80px max(32px,4vw)" }}>
        <div className="hub-meet-inner" style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"24px", padding:"clamp(36px,5vw,64px)", overflow:"hidden", position:"relative", boxShadow:"var(--card-shadow)" }}>
          <div style={{ position:"absolute", top:"-20%", insetInlineEnd:"-5%", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle,rgba(22,163,74,0.07) 0%,transparent 65%)", pointerEvents:"none" }} />
          <div style={{ position:"relative" }}>
            <Badge>{t.meetBadge}</Badge>
            <h2 style={{ fontSize:"clamp(26px,2.8vw,40px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.2, marginBottom:"18px" }}>{t.meetTitle}</h2>
            <p style={{ fontSize:"16px", color:"var(--text-secondary)", lineHeight:1.8, marginBottom:"24px" }}>{t.meetBody}</p>
            <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:"10px" }}>
              {t.meetPoints.map((pt,i) => (
                <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", fontSize:"14px", color:"var(--text-secondary)" }}>
                  <span style={{ width:"20px", height:"20px", borderRadius:"50%", background:"rgba(22,163,74,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                    <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
            <a href="https://uni.proffy.study/dashboard" style={{ display:"inline-flex", alignItems:"center", gap:"6px", marginTop:"28px", padding:"12px 28px", borderRadius:"12px", fontSize:"14px", fontWeight:700, background:"linear-gradient(135deg,#16a34a,#22c55e)", color:"white", textDecoration:"none", boxShadow:"0 4px 20px rgba(22,163,74,0.28)", transition:"transform 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform=""}>
              {t.cta}
            </a>
          </div>
          <div className="hub-meet-owl" style={{ display:"flex", justifyContent:"center", alignItems:"flex-end" }}>
            <motion.div animate={{y:[0,-10,0]}} transition={{duration:3.5,repeat:Infinity,ease:"easeInOut"}}>
              <Image src="/mascot/meet-tall.png" alt="Proffy" width={420} height={560} style={{ objectFit:"contain", objectPosition:"bottom" }} draggable={false} />
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── CTA Banner ── */}
      <Section style={{ padding:"80px max(32px,4vw) 100px" }}>
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6}}
          style={{ background:"linear-gradient(135deg,#16a34a,#22c55e 60%,#4ade80 100%)", borderRadius:"24px", padding:"clamp(48px,6vw,80px) clamp(32px,5vw,72px)", textAlign:"center", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 30% 50%,rgba(255,255,255,0.07) 0%,transparent 60%), radial-gradient(circle at 75% 30%,rgba(255,255,255,0.05) 0%,transparent 50%)", pointerEvents:"none" }} />
          <div style={{ position:"relative" }}>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,52px)", fontWeight:900, letterSpacing:"-0.03em", color:"white", marginBottom:"14px" }}>{t.ctaTitle}</h2>
            <p style={{ fontSize:"17px", color:"rgba(255,255,255,0.75)", marginBottom:"36px" }}>{t.ctaSub}</p>
            <a href="https://uni.proffy.study/dashboard" style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"15px 42px", borderRadius:"14px", fontSize:"16px", fontWeight:700, background:"white", color:"#15803d", textDecoration:"none", boxShadow:"0 8px 32px rgba(0,0,0,0.2)", transition:"transform 0.12s,box-shadow 0.12s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(0,0,0,0.28)"}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.2)"}}>
              {t.ctaBtn}
            </a>
          </div>
        </motion.div>
      </Section>

      {/* ── Footer ── */}
      <footer style={{ position:"relative", zIndex:1, borderTop:"1px solid var(--border)", padding:"22px max(32px,4vw)", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:"12px", fontSize:"13px", color:"var(--text-disabled)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <Image src="/logo-owl.png" alt="Proffy" width={28} height={28} style={{ objectFit:"contain", width:"28px", height:"28px" }} draggable={false} />
          <span>{t.footer}</span>
        </div>
        <div style={{ display:"flex", gap:"18px" }}>
          <a href="mailto:hello@proffy.study" style={{ color:"inherit", textDecoration:"none" }}>{t.contact}</a>
          <a href="#" style={{ color:"inherit", textDecoration:"none" }}>{t.privacy}</a>
          <a href="#" style={{ color:"inherit", textDecoration:"none" }}>{t.terms}</a>
        </div>
      </footer>
    </div>
  );
}
