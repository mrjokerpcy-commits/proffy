"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
    let W = window.innerWidth, H = window.innerHeight;
    c.width = W; c.height = H;
    const onResize = () => { W = window.innerWidth; H = window.innerHeight; c.width = W; c.height = H; };
    window.addEventListener("resize", onResize, { passive: true });
    const N = 40;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
      r: Math.random() * 1.2 + 0.4,
    }));
    const draw = () => {
      const light = document.documentElement.classList.contains("light");
      const rgb = light ? "79,70,229" : "99,102,241";
      ctx.clearRect(0, 0, W, H);
      if (!reduced) for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d2 = dx*dx+dy*dy;
        if (d2 < 14400) { const a = (light?.1:.14)*(1-Math.sqrt(d2)/120); ctx.beginPath(); ctx.strokeStyle=`rgba(${rgb},${a.toFixed(3)})`; ctx.lineWidth=.8; ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.stroke(); }
      }
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(${rgb},${light?.28:.42})`; ctx.fill(); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }} />;
}

// ─── Mascot image helper ──────────────────────────────────────────────────────
function Owl({ src, size, style }: { src: string; size: number; style?: React.CSSProperties }) {
  return <Image src={src} alt="Proffy" width={size} height={size} style={{ objectFit:"contain", ...style }} draggable={false} />;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      style={{ position:"relative", zIndex:1, maxWidth:"1100px", margin:"0 auto", padding:"0 max(24px,5vw)", ...style }}
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
    sub:"From bagrut to university — AI that knows your exact course, exam, and professor.",
    cta:"Start with Proffy App",
    stats:[
      { v:"800+", l:"Courses indexed" },
      { v:"4.5h", l:"Saved per week" },
      { v:"+18%", l:"Avg score boost" },
      { v:"5K+", l:"Students helped" },
    ],
    missionBadge:"Our Mission",
    missionTitle:"Academic intelligence for every Israeli student.",
    missionBody:"Proffy exists to give every student the advantage they deserve. We combine your course material, professor context, and AI reasoning so you can study smarter, prepare faster, and walk into every exam with confidence.",
    whoBadge:"Who We Are",
    whoTitle:"Built by students, for students.",
    whoBody:"We were tired of guessing what would be on the exam, which professor to pick, and how to structure our study time. So we built the tool we wished we had. Every feature in Proffy exists because a real student needed it.",
    howBadge:"How It Works",
    howTitle:"Three steps to exam confidence.",
    howSteps:[
      { title:"Upload your material", body:"Drop your slides, syllabi, past exams, and professor notes. Proffy indexes everything.", img:"/mascot/notes.png" },
      { title:"Ask anything", body:"Chat with an AI that knows your exact course — not a generic tutor, your tutor.", img:"/mascot/thinking.png" },
      { title:"Walk in ready", body:"Focused study plans, source-cited answers, and exam-targeted summaries.", img:"/mascot/thumbsup.png" },
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
    sub:"מבגרות ועד האוניברסיטה — AI שמכיר את הקורס, הבחינה והמרצה שלך.",
    cta:"התחל עם Proffy App",
    stats:[
      { v:"800+", l:"קורסים באינדקס" },
      { v:"4.5h", l:"שעות שנחסכות בשבוע" },
      { v:"+18%", l:"שיפור ממוצע בציון" },
      { v:"5K+", l:"סטודנטים שעזרנו להם" },
    ],
    missionBadge:"המשימה שלנו",
    missionTitle:"אינטליגנציה אקדמית לכל סטודנט ישראלי.",
    missionBody:"Proffy נוצר כדי לתת לכל סטודנט את היתרון שהוא ראוי לו. אנחנו משלבים את חומר הלימוד שלך, ידע על המרצה, וחשיבה של AI — כדי שתלמד חכם יותר, תתכונן מהר יותר, ותיכנס לכל בחינה בביטחון.",
    whoBadge:"מי אנחנו",
    whoTitle:"נבנה על ידי סטודנטים, לסטודנטים.",
    whoBody:"נמאס לנו לנחש מה יצא בבחינה, איזה מרצה לבחור, ואיך לארגן את זמן הלמידה שלנו. אז בנינו את הכלי שרצינו שיהיה לנו. כל פיצ'ר ב-Proffy קיים כי סטודנט אמיתי היה צריך אותו.",
    howBadge:"איך זה עובד",
    howTitle:"שלושה שלבים לביטחון בבחינה.",
    howSteps:[
      { title:"העלה את החומר שלך", body:"הפל שקפים, סילבוס, בחינות ישנות והערות מרצה. Proffy מאנדקס הכל.", img:"/mascot/notes.png" },
      { title:"שאל הכל", body:"שוחח עם AI שמכיר את הקורס המדויק שלך — לא מורה גנרי, המורה שלך.", img:"/mascot/thinking.png" },
      { title:"כנס מוכן", body:"תוכניות לימוד ממוקדות, תשובות עם מקורות מהחומר שלך, וסיכומי בחינה.", img:"/mascot/thumbsup.png" },
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
  { key:"bagrut",  color:"#8b5cf6", border:"rgba(139,92,246,0.22)", glow:"rgba(139,92,246,0.12)",
    label:"Proffy Bagrut",  sub:lang==="he"?"בגרות":"Bagrut",   live:false, href:"https://bagrut.proffy.study",  img:"/mascot/reading.png",
    desc:lang==="he"?"נבנה לבני 16-18. נושאים כקלפים, רצפים, ו-AI שמדבר בשפה שלך.":"Built for 16-18. Subjects as cards, streaks, AI that speaks your language." },
  { key:"yael",   color:"#f59e0b", border:"rgba(245,158,11,0.22)",  glow:"rgba(245,158,11,0.11)",
    label:lang==="he"?'Proffy × יע"ל':"Proffy × Yael", sub:lang==="he"?'יע"ל':"Yael", live:false, href:"https://yael.proffy.study", img:"/mascot/wave.png",
    desc:lang==="he"?'נעזור לך להצליח. הכנה ליע"ל בעברית, חמה ואנושית.':"We'll help you succeed. Hebrew-first, warm and human." },
  { key:"psycho", color:"#d4a017", border:"rgba(212,160,23,0.22)",  glow:"rgba(212,160,23,0.11)",
    label:"Proffy Psycho",  sub:lang==="he"?"פסיכומטרי":"Psychometric", live:false, href:"https://psycho.proffy.study", img:"/mascot/notes.png",
    desc:lang==="he"?"הכנה רצינית לפסיכומטרי. תרגילים מובנים בכל קטגוריה.":"Serious psychometric prep. Structured drills. Built to score." },
  { key:"app",    color:"#6366f1", border:"rgba(99,102,241,0.24)",   glow:"rgba(99,102,241,0.13)",
    label:"Proffy App",     sub:lang==="he"?"אוניברסיטה":"University", live:true,  href:"https://app.proffy.study",  img:"/mascot/hero.png",
    desc:lang==="he"?"העלה שקפים, שאל הכל, עבור את הבחינה. ה-AI שמכיר את הקורס שלך.":"Upload slides, ask anything, ace the exam. AI that knows your course." },
];

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"99px", padding:"5px 16px", marginBottom:"20px" }}>
      <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#6366f1", boxShadow:"0 0 8px #6366f1", flexShrink:0, animation:"fc-pulse 2s ease-in-out infinite" }} />
      <span style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", color:"#6366f1", textTransform:"uppercase" }}>{children}</span>
    </div>
  );
}

// ─── Hub Page ─────────────────────────────────────────────────────────────────
export default function HubPage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useLang();
  useEffect(() => setMounted(true), []);

  const t = T[lang];
  const isRtl = lang === "he";
  const dir = isRtl ? "rtl" : "ltr";
  const ff = isRtl ? "var(--font-noto-hebrew),system-ui,sans-serif" : "var(--font-inter),system-ui,sans-serif";
  const products = PRODUCTS(lang);

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-base)", color:"var(--text-primary)", position:"relative", overflowX:"hidden", fontFamily:ff, direction:dir }}>
      <ConstellationBg />

      {/* ── Nav ── */}
      <nav style={{ position:"fixed", top:0, insetInlineStart:0, insetInlineEnd:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 max(24px,5vw)", height:"62px", background:"var(--nav-bg)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:"1px solid var(--nav-border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <defs><linearGradient id="hub-lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a78bfa"/></linearGradient></defs>
            <rect width="32" height="32" rx="9" fill="url(#hub-lg)"/>
            <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white"/>
            <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8"/>
            <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
            <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
            <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6"/>
          </svg>
          <span style={{ fontWeight:800, fontSize:"17px", letterSpacing:"-0.02em" }}>Proffy</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {mounted && <ThemeToggle />}
          {mounted && <LangToggle />}
          <a href="https://app.proffy.study" style={{ padding:"8px 18px", borderRadius:"10px", fontSize:"13px", fontWeight:600, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", textDecoration:"none", boxShadow:"0 2px 12px rgba(99,102,241,0.28)", transition:"opacity 0.12s,transform 0.12s", whiteSpace:"nowrap" }}
            onMouseEnter={e=>{e.currentTarget.style.opacity="0.85";e.currentTarget.style.transform="translateY(-1px)"}}
            onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform=""}}>
            {t.getAccess}
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"156px max(24px,5vw) 64px" }}>
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.5}}>
          <Badge>{t.badge}</Badge>
        </motion.div>

        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.06}}
          style={{ marginBottom:"20px" }}>
          <motion.div animate={{y:[0,-8,0]}} transition={{duration:3.5,repeat:Infinity,ease:"easeInOut"}}>
            <Owl src="/mascot/wave.png" size={110} />
          </motion.div>
        </motion.div>

        <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.1}}
          className="hub-hero-text"
          style={{ fontSize:"clamp(36px,6vw,76px)", fontWeight:900, letterSpacing:"-0.04em", lineHeight:1.08, marginBottom:"18px" }}>
          {t.h1a}<br />{t.h1b}
        </motion.h1>

        <motion.p initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.55,delay:0.16}}
          style={{ fontSize:"clamp(15px,1.7vw,18px)", color:"var(--text-secondary)", lineHeight:1.7, maxWidth:"500px", marginBottom:"36px" }}>
          {t.sub}
        </motion.p>

        <motion.a href="https://app.proffy.study" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.22}}
          style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"13px 34px", borderRadius:"13px", fontSize:"15px", fontWeight:700, background:"linear-gradient(135deg,#6366f1,#8b5cf6 60%,#a855f7 100%)", color:"white", textDecoration:"none", boxShadow:"0 6px 28px rgba(99,102,241,0.32)", transition:"transform 0.12s,box-shadow 0.12s" }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 36px rgba(99,102,241,0.42)"}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 6px 28px rgba(99,102,241,0.32)"}}>
          {t.cta}
        </motion.a>
      </section>

      {/* ── Stats bar ── */}
      <Section style={{ padding:"0 max(24px,5vw) 80px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"1px", background:"var(--border)", borderRadius:"18px", overflow:"hidden", border:"1px solid var(--border)" }}>
          {t.stats.map(s => (
            <div key={s.l} style={{ background:"var(--bg-surface)", padding:"28px 24px", textAlign:"center" }}>
              <div style={{ fontSize:"clamp(28px,3vw,38px)", fontWeight:900, letterSpacing:"-0.03em", background:"linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", marginBottom:"6px" }}>{s.v}</div>
              <div style={{ fontSize:"13px", color:"var(--text-muted)", fontWeight:500 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Mission ── */}
      <Section style={{ padding:"80px max(24px,5vw)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"64px", alignItems:"center" }}>
        <div>
          <Badge>{t.missionBadge}</Badge>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.15, marginBottom:"20px" }}>{t.missionTitle}</h2>
          <p style={{ fontSize:"17px", color:"var(--text-secondary)", lineHeight:1.75 }}>{t.missionBody}</p>
        </div>
        <div style={{ display:"flex", justifyContent:"center" }}>
          <motion.div animate={{y:[0,-10,0]}} transition={{duration:4,repeat:Infinity,ease:"easeInOut"}}>
            <Owl src="/mascot/hero.png" size={260} />
          </motion.div>
        </div>
      </Section>

      {/* ── Who We Are ── */}
      <Section style={{ padding:"80px max(24px,5vw)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"64px", alignItems:"center" }}>
        <div style={{ display:"flex", justifyContent:"center" }}>
          <motion.div animate={{y:[0,-8,0]}} transition={{duration:4.5,repeat:Infinity,ease:"easeInOut"}}>
            <Owl src="/mascot/notes.png" size={240} />
          </motion.div>
        </div>
        <div>
          <Badge>{t.whoBadge}</Badge>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.15, marginBottom:"20px" }}>{t.whoTitle}</h2>
          <p style={{ fontSize:"17px", color:"var(--text-secondary)", lineHeight:1.75 }}>{t.whoBody}</p>
        </div>
      </Section>

      {/* ── How It Works ── */}
      <Section style={{ padding:"80px max(24px,5vw)" }}>
        <div style={{ textAlign:"center", marginBottom:"56px" }}>
          <Badge>{t.howBadge}</Badge>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.15 }}>{t.howTitle}</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"20px" }}>
          {t.howSteps.map((step, i) => (
            <motion.div key={i} initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,delay:i*0.1}}
              style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"20px", padding:"32px 28px", textAlign:"center", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"200px", height:"200px", borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />
              <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"36px", height:"36px", borderRadius:"10px", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", fontSize:"14px", fontWeight:800, color:"#6366f1", marginBottom:"20px" }}>{i+1}</div>
              <div style={{ marginBottom:"20px" }}>
                <Owl src={step.img} size={100} style={{ margin:"0 auto" }} />
              </div>
              <h3 style={{ fontSize:"18px", fontWeight:800, marginBottom:"10px" }}>{step.title}</h3>
              <p style={{ fontSize:"14px", color:"var(--text-secondary)", lineHeight:1.65 }}>{step.body}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Products ── */}
      <Section style={{ padding:"80px max(24px,5vw)" }}>
        <div style={{ textAlign:"center", marginBottom:"52px" }}>
          <Badge>{t.productsBadge}</Badge>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.15 }}>{t.productsTitle}</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:"16px" }}>
          {products.map((p,i) => (
            <motion.a key={p.key} href={p.live ? p.href : undefined}
              initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,delay:i*0.07}}
              className="hub-card"
              style={{ display:"block", textDecoration:"none", color:"inherit", border:`1px solid ${p.border}`, borderRadius:"18px", padding:"24px", position:"relative", overflow:"hidden", cursor:p.live?"pointer":"default", transition:"transform 0.15s,border-color 0.15s,box-shadow 0.15s" }}
              onMouseEnter={e=>{ if(!p.live) return; e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor=p.color; e.currentTarget.style.boxShadow=`0 16px 40px ${p.glow}`; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.borderColor=p.border; e.currentTarget.style.boxShadow=""; }}>
              <div style={{ position:"absolute", top:0, left:0, width:"160px", height:"160px", borderRadius:"50%", background:`radial-gradient(circle,${p.glow} 0%,transparent 70%)`, transform:"translate(-35%,-35%)", pointerEvents:"none" }} />
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"16px" }}>
                <Owl src={p.img} size={52} />
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
      <Section style={{ padding:"80px max(24px,5vw)" }}>
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"24px", padding:"clamp(32px,5vw,64px)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"48px", alignItems:"center", overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", top:"-20%", right:"-5%", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 65%)", pointerEvents:"none" }} />
          <div style={{ position:"relative" }}>
            <Badge>{t.meetBadge}</Badge>
            <h2 style={{ fontSize:"clamp(24px,3vw,38px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.2, marginBottom:"16px" }}>{t.meetTitle}</h2>
            <p style={{ fontSize:"16px", color:"var(--text-secondary)", lineHeight:1.75, marginBottom:"24px" }}>{t.meetBody}</p>
            <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:"10px" }}>
              {t.meetPoints.map((pt,i) => (
                <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", fontSize:"14px", color:"var(--text-secondary)" }}>
                  <span style={{ width:"20px", height:"20px", borderRadius:"50%", background:"rgba(99,102,241,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                    <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
            <a href="https://app.proffy.study" style={{ display:"inline-flex", alignItems:"center", gap:"6px", marginTop:"28px", padding:"12px 28px", borderRadius:"12px", fontSize:"14px", fontWeight:700, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", textDecoration:"none", boxShadow:"0 4px 20px rgba(99,102,241,0.28)", transition:"transform 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform=""}>
              {t.cta}
            </a>
          </div>
          <div style={{ display:"flex", justifyContent:"center" }}>
            <motion.div animate={{y:[0,-12,0]}} transition={{duration:4,repeat:Infinity,ease:"easeInOut"}}>
              <Owl src="/mascot/hero.png" size={280} />
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── CTA Banner ── */}
      <Section style={{ padding:"80px max(24px,5vw) 100px" }}>
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6}}
          style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6 60%,#a855f7 100%)", borderRadius:"24px", padding:"clamp(40px,6vw,72px) clamp(28px,5vw,64px)", textAlign:"center", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 30% 50%,rgba(255,255,255,0.07) 0%,transparent 60%), radial-gradient(circle at 75% 30%,rgba(255,255,255,0.05) 0%,transparent 50%)", pointerEvents:"none" }} />
          <div style={{ position:"relative" }}>
            <motion.div animate={{y:[0,-6,0]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut"}} style={{ marginBottom:"20px" }}>
              <Owl src="/mascot/celebrate.png" size={96} style={{ margin:"0 auto" }} />
            </motion.div>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,44px)", fontWeight:900, letterSpacing:"-0.03em", color:"white", marginBottom:"12px" }}>{t.ctaTitle}</h2>
            <p style={{ fontSize:"16px", color:"rgba(255,255,255,0.75)", marginBottom:"32px" }}>{t.ctaSub}</p>
            <a href="https://app.proffy.study" style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"14px 36px", borderRadius:"14px", fontSize:"15px", fontWeight:700, background:"white", color:"#4f46e5", textDecoration:"none", boxShadow:"0 8px 32px rgba(0,0,0,0.2)", transition:"transform 0.12s,box-shadow 0.12s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(0,0,0,0.28)"}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.2)"}}>
              {t.ctaBtn}
            </a>
          </div>
        </motion.div>
      </Section>

      {/* ── Footer ── */}
      <footer style={{ position:"relative", zIndex:1, borderTop:"1px solid var(--border)", padding:"22px max(24px,5vw)", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:"12px", fontSize:"13px", color:"var(--text-disabled)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <Owl src="/mascot/avatar.png" size={24} style={{ borderRadius:"6px", overflow:"hidden" }} />
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
