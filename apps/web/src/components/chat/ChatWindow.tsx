"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, Course, Source } from "@/lib/types";
import MessageBubble from "./MessageBubble";

interface Props {
  course?: Course;
  sessionId?: string;
  initialMessages?: ChatMessage[];
  hasCourses?: boolean;
  userPlan?: "free" | "pro" | "max";
}

const SUGGESTED = [
  "Explain the main topics",
  "Quiz me on the material",
  "What does the professor focus on?",
  "Key concepts summary",
];

function makeGreeting(hasCourses: boolean, courseName?: string): ChatMessage {
  const content = courseName
    ? `Hey! Ready to study **${courseName}**? Ask me anything — I can explain concepts, quiz you, build a study plan, or help you prep for the exam.`
    : hasCourses
    ? `Hey! Which course do you want to work on today? Pick one from the sidebar, or just tell me what you're studying.`
    : `Hey! I'm Proffy, your AI study companion.\n\nTell me what you're studying — the course name, your university, and your professor if you know them — and I'll set everything up and start helping you right away.`;
  return { id: "greeting", role: "assistant", content };
}


export default function ChatWindow({ course, sessionId, initialMessages = [], hasCourses = false, userPlan = "free" }: Props) {
  const router = useRouter();
  const greeting = makeGreeting(hasCourses, course?.name);
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.length > 0 ? initialMessages : [greeting]
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [savedNote, setSavedNote] = useState<{ title: string; note_type: string } | null>(null);
  const [savedCards, setSavedCards] = useState<number | null>(null);
  const [limitBanner, setLimitBanner] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [userSavedToast, setUserSavedToast] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const noteToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limitToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function autoResize() {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
  }

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          courseId: course?.id,
          university: course?.university,
          course: course?.name,
          professor: course?.professor,
          courseNumber: (course as any)?.course_number ?? null,
          sessionId,
          history: (() => {
            // Filter out the local greeting and any non-DB messages, then ensure
            // the conversation starts with a user turn (Anthropic API requirement)
            const hist = messages
              .filter(m => m.id !== "greeting" && m.content)
              .slice(-12)
              .map(m => ({ role: m.role, content: m.content }));
            // Drop leading assistant messages
            while (hist.length > 0 && hist[0].role === "assistant") hist.shift();
            return hist;
          })(),
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error ?? "Daily free limit reached. Upgrade to Pro for unlimited messages.";
        setLimitBanner(msg);
        if (limitToastRef.current) clearTimeout(limitToastRef.current);
        limitToastRef.current = setTimeout(() => setLimitBanner(null), 10000);
        setShowUpgrade(true);
        setMessages(prev => prev.filter(m => m.id !== assistantId));
        setStreaming(false);
        return;
      }
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let sources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "thinking") {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, thinkingText: data.text } : m));
            } else if (data.type === "done") {
              router.refresh();
            } else if (data.type === "course_created" || data.type === "profile_updated") {
              router.refresh();
            } else if (data.type === "sources") {
              sources = data.sources;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, sources } : m));
            } else if (data.type === "error") {
              content = data.message ?? "Something went wrong. Please try again.";
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, streaming: false } : m));
            } else if (data.type === "token") {
              content += data.text;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, thinkingText: undefined } : m));
            } else if (data.type === "replace_content") {
              content = data.content;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content } : m));
            } else if (data.type === "note_saved") {
              setSavedNote(data.note);
              if (noteToastRef.current) clearTimeout(noteToastRef.current);
              noteToastRef.current = setTimeout(() => setSavedNote(null), 4000);
            } else if (data.type === "cards_saved") {
              setSavedCards(data.count);
              if (cardsToastRef.current) clearTimeout(cardsToastRef.current);
              cardsToastRef.current = setTimeout(() => setSavedCards(null), 4000);
            }
          } catch { /* ignore */ }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content, streaming: false } : m
      ));
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: "Something went wrong. Please try again.", streaming: false } : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, streaming: false } : m
        ));
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, course, sessionId, streaming]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>

      {/* ── Course header ── */}
      {course && (
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: "10px",
          padding: "14px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
              {course.name}
            </h1>
            {(course.professor || course.university) && (
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                {[course.professor, course.university].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ padding: "20px 0 8px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              index={i}
              onRetry={msg.role === "assistant" && msg.id !== "greeting" && i === messages.length - 1
                ? () => {
                    // Find last user message and re-send it
                    const lastUser = [...messages].reverse().find(m => m.role === "user");
                    if (lastUser) {
                      setMessages(prev => prev.slice(0, -1)); // Remove failed assistant msg
                      send(lastUser.content);
                    }
                  }
                : undefined}
              onSave={msg.role === "assistant" && msg.id !== "greeting" ? async (content) => {
                try {
                  await fetch("/api/notes/save-message", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content, courseId: course?.id, courseName: course?.name }),
                  });
                  setUserSavedToast(true);
                  setTimeout(() => setUserSavedToast(false), 3000);
                } catch { /* ignore */ }
              } : undefined}
            />
          ))}
          {/* Suggested prompts after greeting when no user messages yet */}
          {messages.length === 1 && course && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", padding: "0 20px" }}>
              {SUGGESTED.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  style={{
                    fontSize: "12px", padding: "7px 13px", borderRadius: "9px",
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", transition: "all 0.15s", fontWeight: 500, cursor: "pointer",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} style={{ height: "8px" }} />
        </div>
      </div>

      {/* ── Toasts ── */}
      <AnimatePresence>
        {savedNote && (
          <motion.div
            key="note-toast"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{
              position: "absolute", bottom: "80px", left: "50%", transform: "translateX(-50%)",
              zIndex: 50, display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 14px", borderRadius: "99px",
              background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "14px" }}>📝</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--purple)" }}>
              Saved to notes{savedNote.title ? ` — "${savedNote.title}"` : ""}
            </span>
          </motion.div>
        )}
        {savedCards !== null && (
          <motion.div
            key="cards-toast"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{
              position: "absolute", bottom: "80px", left: "50%", transform: "translateX(-50%)",
              zIndex: 50, display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 14px", borderRadius: "99px",
              background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "14px" }}>🃏</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--blue)" }}>
              {savedCards} flashcard{savedCards !== 1 ? "s" : ""} saved — check Flashcards tab
            </span>
          </motion.div>
        )}
        {userSavedToast && (
          <motion.div
            key="user-saved-toast"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{
              position: "absolute", bottom: "80px", left: "50%", transform: "translateX(-50%)",
              zIndex: 50, display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 14px", borderRadius: "99px",
              background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--purple)" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--purple)" }}>
              Saved to your notes
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Usage limit banner ── */}
      <AnimatePresence>
        {limitBanner && (
          <motion.div
            key="limit-banner"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: "10px",
              padding: "9px 16px", borderTop: "1px solid rgba(251,191,36,0.3)",
              background: "rgba(251,191,36,0.08)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ fontSize: "12px", color: "#fbbf24", flex: 1 }}>{limitBanner}</span>
            <button
              onClick={() => setShowUpgrade(true)}
              style={{ flexShrink: 0, fontSize: "11px", fontWeight: 700, color: "#fff", background: "#fbbf24", border: "none", borderRadius: "6px", padding: "3px 10px", cursor: "pointer" }}
            >
              Upgrade
            </button>
            <button onClick={() => setLimitBanner(null)} style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", padding: 0, flexShrink: 0, opacity: 0.7 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input area ── */}
      <div style={{ flexShrink: 0, padding: "10px 16px 14px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: "10px",
          padding: "10px 14px", borderRadius: "12px",
          background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
          transition: "border-color 0.15s",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder={course ? `Ask about ${course.name}…` : "Ask anything…"}
            rows={1}
            disabled={streaming}
            style={{
              flex: 1, background: "transparent", fontSize: "14px", outline: "none",
              resize: "none", maxHeight: "140px", lineHeight: 1.6, border: "none",
              color: "var(--text-primary)", opacity: streaming ? 0.5 : 1,
              fontFamily: "inherit", paddingTop: "2px",
            }}
          />

          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              style={{
                flexShrink: 0, width: "32px", height: "32px",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "9px", background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.25)", cursor: "pointer",
              }}
            >
              <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#f87171", display: "block" }} />
            </button>
          ) : (
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              style={{
                flexShrink: 0, width: "32px", height: "32px",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "9px", background: "var(--blue)", cursor: input.trim() ? "pointer" : "default",
                boxShadow: input.trim() ? "0 2px 10px rgba(79,142,247,0.4)" : "none",
                opacity: input.trim() ? 1 : 0.3, transition: "opacity 0.15s, box-shadow 0.15s",
                border: "none",
              }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "10px", marginTop: "7px", color: "var(--text-disabled)" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
      {/* ── Upgrade modal ── */}
      <AnimatePresence>
        {showUpgrade && (
          <motion.div
            key="upgrade-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowUpgrade(false)}
            style={{ position: "absolute", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: "480px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Upgrade your plan</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Unlock unlimited messages and premium features</p>
                </div>
                <button onClick={() => setShowUpgrade(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Plans */}
              {([
                { key: "pro", name: "Pro", price: "₪79", color: "var(--blue)", border: "rgba(79,142,247,0.35)", bg: "rgba(79,142,247,0.07)", features: ["Unlimited messages & courses", "Smart flashcards + study plan", "Exam prep mode", "Answers cited from your slides"] },
                { key: "max", name: "Max", price: "₪149", color: "var(--purple)", border: "rgba(167,139,250,0.35)", bg: "rgba(167,139,250,0.07)", features: ["Everything in Pro", "Exam predictions", "Study groups", "Telegram bot + priority support"] },
              ] as const).map(plan => (
                <div key={plan.key} style={{ borderRadius: "12px", border: `1px solid ${plan.border}`, background: plan.bg, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontWeight: 800, fontSize: "15px", color: plan.color }}>{plan.name}</span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{plan.price}<span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>/mo</span></span>
                  </div>
                  <ul style={{ margin: "0 0 12px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "5px" }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, color: "#fff", background: plan.color, border: "none", cursor: "pointer" }}
                    onClick={() => { setShowUpgrade(false); window.location.href = `/checkout?plan=${plan.key}`; }}
                  >
                    Get {plan.name}
                  </button>
                </div>
              ))}

              <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                Cancel anytime · Secure payment
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
