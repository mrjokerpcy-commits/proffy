"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SECTIONS = [
  {
    title: "Getting started",
    items: [
      {
        q: "How do I add a course?",
        a: "Just tell Proffy in the chat — say something like 'I'm studying Algorithms at the Technion' and it will set everything up. You can also click '+ Add' in the sidebar.",
      },
      {
        q: "What information does Proffy need about my course?",
        a: "At minimum: the course name and your university. Optionally: your professor, exam date, semester, and how many hours/week you study. The more context Proffy has, the more tailored the help.",
      },
      {
        q: "Can I study multiple courses?",
        a: "Yes. Free plan: up to 3 courses (lifetime). Pro and Max: unlimited courses. Switch between them using the sidebar.",
      },
    ],
  },
  {
    title: "Uploading material",
    items: [
      {
        q: "How do I upload my slides and PDFs?",
        a: "Click the Upload button (top right of the dashboard or in the sidebar). You can upload files directly or share a Google Drive folder. Once uploaded, Proffy answers questions directly from your material.",
      },
      {
        q: "What file types are supported?",
        a: "PDF, DOCX, PPTX, and TXT. Images inside documents are also indexed where possible.",
      },
      {
        q: "How many files can I upload?",
        a: "Free: up to 5 files per course. Pro: up to 30 files per course. Max: unlimited.",
      },
      {
        q: "How do I share a Google Drive folder?",
        a: "Open Upload → Drive tab. Copy the service account email shown there, go to Google Drive, right-click your folder → Share → paste the email → set role to Viewer → Send. Then come back and paste your folder link.",
      },
    ],
  },
  {
    title: "Flashcards & notes",
    items: [
      {
        q: "How are flashcards created?",
        a: "Proffy automatically creates flashcards when you struggle with a concept or when you explicitly ask. They appear in the Flashcards tab and use spaced repetition — cards you find easy are pushed further out; hard ones come back sooner.",
      },
      {
        q: "Where do my notes go?",
        a: "Proffy auto-saves key insights (formulas, tricks, professor patterns) as notes during your chat. You can also add notes manually from the Notes tab. All notes are linked to a specific course.",
      },
      {
        q: "Why aren't my flashcards showing up?",
        a: "Flashcards need to be linked to a course. If you're chatting on the main dashboard without a course selected when they're created, navigate to the course page first, then ask Proffy to create them.",
      },
    ],
  },
  {
    title: "Chat & the AI",
    items: [
      {
        q: "What is /btw?",
        a: "A way to inject context mid-conversation without interrupting the flow. Type '/btw my exam is in 3 days' and Proffy will factor it in from that point on. Pro/Max users can even use /btw while Proffy is still typing — it'll finish its thought and then acknowledge.",
      },
      {
        q: "What are the daily limits?",
        a: "Free: 10 messages/day. Pro: ~30–35 messages/day (token-based). Max: ~60–70 messages/day. Limits reset at midnight UTC.",
      },
      {
        q: "Why does Proffy ask me about my professor or exam style?",
        a: "Proffy builds a picture of your course over time — what the professor focuses on, exam formats, common traps. This intelligence is saved and helps other students in the same course too (anonymously).",
      },
      {
        q: "What is 'professor fingerprinting'?",
        a: "A Pro/Max feature where Proffy learns which topics, question styles, and patterns your specific professor repeats across exams. Visible in the sidebar panel when you have a course selected.",
      },
    ],
  },
  {
    title: "Plans & billing",
    items: [
      {
        q: "What's the difference between Free, Pro, and Max?",
        a: "Free: 10 messages/day, 3 courses, study topics only. Pro (₪79/mo): ~30-35 msgs/day, unlimited courses, file uploads, professor patterns, general AI (coding, writing, etc.). Max (₪149/mo): ~60-70 msgs/day, exam predictions, deep fingerprinting, priority support.",
      },
      {
        q: "How do I upgrade?",
        a: "Go to Settings (gear icon in the sidebar) → scroll to 'Upgrade your plan' → click Upgrade to Pro or Max.",
      },
      {
        q: "How do I cancel?",
        a: "Go to Settings → your current plan → click 'Cancel subscription'. Your access continues until the end of the billing period.",
      },
    ],
  },
  {
    title: "Privacy & data",
    items: [
      {
        q: "Is my uploaded material shared with other users?",
        a: "No. Your personal uploads are private to your account. Only platform-level material (ingested by the Proffy team for shared courses) is visible across accounts.",
      },
      {
        q: "What data does Proffy store?",
        a: "Your messages, flashcards, notes, course details, and usage stats. Anonymous course intelligence (patterns, exam insights) is aggregated at the course level without identifying you.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → Account section → Delete account. This permanently removes all your data including courses, flashcards, notes, and chat history.",
      },
    ],
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 0", background: "none", border: "none", cursor: "pointer",
          color: open ? "var(--text-primary)" : "var(--text-secondary)",
          fontSize: "14px", fontWeight: open ? 600 : 500, textAlign: "left", gap: "12px",
        }}
      >
        <span>{q}</span>
        <Chevron open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden" }}
          >
            <p style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--text-muted)", paddingBottom: "14px" }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpClient() {
  const [activeSection, setActiveSection] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Top bar */}
      <div style={{
        flexShrink: 0, padding: "0 24px", height: "56px",
        display: "flex", alignItems: "center",
        borderBottom: "1px solid var(--border)", background: "var(--bg-surface)",
      }}>
        <h1 style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Help & FAQ</h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", gap: 0 }}>

        {/* Section nav */}
        <div style={{
          width: "200px", flexShrink: 0,
          borderRight: "1px solid var(--border)",
          padding: "20px 12px",
          display: "flex", flexDirection: "column", gap: "2px",
        }}>
          {SECTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              style={{
                width: "100%", padding: "8px 10px", borderRadius: "7px",
                background: activeSection === i ? "rgba(79,142,247,0.1)" : "transparent",
                border: activeSection === i ? "1px solid rgba(79,142,247,0.2)" : "1px solid transparent",
                color: activeSection === i ? "var(--blue)" : "var(--text-muted)",
                fontSize: "13px", fontWeight: activeSection === i ? 600 : 400,
                textAlign: "left", cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {s.title}
            </button>
          ))}

          <div style={{ marginTop: "auto", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={() => window.dispatchEvent(new Event("proffy:start-tour"))}
              style={{
                width: "100%", padding: "8px 10px", borderRadius: "8px",
                background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)",
                color: "var(--purple)", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              }}
            >
              Take the tour →
            </button>
            <div style={{
              padding: "14px", borderRadius: "10px",
              background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)",
            }}>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "8px" }}>
                Still stuck? Ask Proffy directly in the chat.
              </p>
              <a
                href="/dashboard"
                style={{
                  display: "block", textAlign: "center", padding: "6px 10px",
                  borderRadius: "7px", background: "var(--blue)", color: "#fff",
                  fontSize: "12px", fontWeight: 600, textDecoration: "none",
                }}
              >
                Open chat →
              </a>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "28px 32px", maxWidth: "680px" }}>
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>
              {SECTIONS[activeSection].title}
            </h2>
            <div>
              {SECTIONS[activeSection].items.map((item, i) => (
                <FAQItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
