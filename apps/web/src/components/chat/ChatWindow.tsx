"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, Course, Source } from "@/lib/types";
import MessageBubble from "./MessageBubble";

function getSubdomain(): string {
  if (typeof window === "undefined") return "app";
  const h = window.location.hostname;
  if (h.startsWith("psycho.")) return "psycho";
  if (h.startsWith("yael.")) return "yael";
  if (h.startsWith("bagrut.")) return "bagrut";
  return "app";
}

interface Props {
  course?: Course;
  sessionId?: string;
  initialMessages?: ChatMessage[];
  hasCourses?: boolean;
  userPlan?: "free" | "pro" | "max";
  initialUsedTokens?: number;
  tokenLimit?: number;
}

const SUGGESTED = [
  "Explain the main topics",
  "Quiz me on the material",
  "What does the professor focus on?",
  "Key concepts summary",
];

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey";
}

function makeGreeting(hasCourses: boolean, courseName?: string, userPlan?: string): ChatMessage {
  const tod = getTimeGreeting();
  const isPaid = userPlan === "pro" || userPlan === "max";
  const content = courseName
    ? `${tod}! Ready to study **${courseName}**? Ask me anything. I can explain concepts, quiz you, build a study plan, or help you prep for the exam.`
    : isPaid
    ? `${tod}! Ask me anything — course help, coding, writing, math, career questions, or just a quick chat. What's on your mind?`
    : hasCourses
    ? `${tod}! Which course do you want to work on today? Pick one from the sidebar, or just tell me what you're studying.`
    : `${tod}! I'm Proffy, your AI study companion.\n\nTell me what you're studying. Share the course name, your university, and your professor if you know them, and I'll set everything up right away.`;
  return { id: "greeting", role: "assistant", content };
}


function getResetDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString("en-IL", { day: "numeric", month: "short" });
}

export default function ChatWindow({ course, sessionId, initialMessages = [], hasCourses = false, userPlan = "free", initialUsedTokens = 0, tokenLimit }: Props) {
  const router = useRouter();
  const greeting = makeGreeting(hasCourses, course?.name, userPlan);
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
  const [usedTokens, setUsedTokens] = useState(initialUsedTokens);
  const [btwDismissed, setBtwDismissed] = useState(false);
  const [pendingBtw, setPendingBtw] = useState<string[]>([]);
  const [hasFirstResponse, setHasFirstResponse] = useState(initialMessages.length > 1);
  const [wasCompacted, setWasCompacted] = useState(false);
  const [ratingReminderDismissed, setRatingReminderDismissed] = useState(false);
  const [assistantMsgCount, setAssistantMsgCount] = useState(0);
  // Updated when agent creates a course mid-chat so subsequent saves use the right ID
  const [runtimeCourseId, setRuntimeCourseId] = useState<string | undefined>(course?.id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const btwBreakRef = useRef<string | null>(null);
  const noteToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limitToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Streaming batch: accumulate tokens in ref, flush to state via RAF (1 setState/frame max)
  const streamRef = useRef<{ full: string; msgId: string; raf: number | null }>
    ({ full: "", msgId: "", raf: null });
  // Image upload
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: string; preview: string } | null>(null);
  const [sessionImageCount, setSessionImageCount] = useState(0);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const imageLimit = userPlan === "free" ? 2 : userPlan === "pro" ? 10 : 30;

  const canTypeWhileStreaming = userPlan === "pro" || userPlan === "max";
  // /btw is an explicit command prefix (like Claude's interface)
  const isBtw = input.trimStart().startsWith("/btw");
  const resetDate = getResetDate();

  // Scroll to bottom — instant during streaming, smooth otherwise
  useEffect(() => {
    const box = scrollBoxRef.current;
    if (!box) return;
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    if (streaming) {
      if (nearBottom) box.scrollTop = box.scrollHeight;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streaming]);

  function scheduleStreamFlush(msgId: string) {
    const sr = streamRef.current;
    sr.msgId = msgId;
    if (sr.raf !== null) return; // already scheduled this frame
    sr.raf = requestAnimationFrame(() => {
      sr.raf = null;
      setMessages(prev => prev.map(m =>
        m.id === sr.msgId ? { ...m, content: sr.full, thinkingText: undefined } : m
      ));
    });
  }

  function flushStream() {
    const sr = streamRef.current;
    if (sr.raf !== null) { cancelAnimationFrame(sr.raf); sr.raf = null; }
    if (sr.msgId && sr.full) {
      setMessages(prev => prev.map(m =>
        m.id === sr.msgId ? { ...m, content: sr.full, streaming: false, thinkingText: undefined } : m
      ));
    }
    sr.full = ""; sr.msgId = "";
  }

  const sendRef = useRef<((text: string) => void) | null>(null);

  function autoResize() {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
  }

  const send = useCallback(async (text: string) => {
    if (!text.trim() && !pendingImage) return;
    sendRef.current = null; // clear after use to avoid double-fires

    // /btw command while streaming — inject context at next paragraph break
    if (streaming && canTypeWhileStreaming && text.trimStart().startsWith("/btw")) {
      const context = text.trimStart().slice(4).trim();
      if (context) {
        setMessages(prev => [...prev, { id: Math.random().toString(36).slice(2) + Date.now().toString(36), role: "user", content: text.trim() }]);
        btwBreakRef.current = context;
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
      return;
    }

    // Non-btw message while streaming: abort and restart
    if (streaming && canTypeWhileStreaming) {
      abortRef.current?.abort();
    } else if (streaming) {
      return; // free users: block
    }

    const userMsg: ChatMessage = { id: Math.random().toString(36).slice(2) + Date.now().toString(36), role: "user", content: text.trim() };
    const assistantId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setPendingBtw([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const attachedImage = pendingImage;
    const attachedDocs = pendingDocsRef.current;
    pendingDocsRef.current = [];
    setPendingImage(null);
    if (attachedImage) setSessionImageCount(c => c + 1);
    setStreaming(true);
    abortRef.current = new AbortController();
    let btwTriggered = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: pendingBtw.length > 0
            ? `${text.trim()}\n\n[Context from /btw: ${pendingBtw.join(" | ")}]`
            : text.trim(),
          image: attachedImage ? { base64: attachedImage.base64, mediaType: attachedImage.mediaType } : undefined,
          documents: attachedDocs.length ? attachedDocs : undefined,
          courseId: runtimeCourseId,
          university: course?.university,
          course: course?.name,
          professor: course?.professor,
          semester: course?.semester ?? null,
          courseNumber: (course as any)?.course_number ?? null,
          subdomain: getSubdomain(),
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

      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "injection_attempt") {
          const warnMsg = data.message ?? "This type of message violates Proffy's terms of use. Repeated attempts may result in account suspension.";
          setMessages(prev => prev.filter(m => m.id !== assistantId).concat({
            id: assistantId,
            role: "assistant",
            content: `⚠️ **Message blocked.** ${warnMsg}`,
            streaming: false,
          }));
          setStreaming(false);
          return;
        }
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error ?? "Monthly free limit reached. Upgrade to Pro for more.";
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

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "thinking") {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, thinkingText: data.text } : m));
            } else if (data.type === "compacted") {
              setWasCompacted(true);
            } else if (data.type === "done") {
              if (data.usedTokens !== undefined) setUsedTokens(data.usedTokens);
              if (data.messageId) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, dbMessageId: data.messageId } : m
                ));
              }
              setAssistantMsgCount(c => c + 1);
            } else if (data.type === "course_created") {
              if (data.course?.id) setRuntimeCourseId(data.course.id);
              router.refresh();
            } else if (data.type === "profile_updated") {
              router.refresh();
            } else if (data.type === "sources") {
              sources = data.sources;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, sources } : m));
            } else if (data.type === "error") {
              content = data.message ?? "Something went wrong. Please try again.";
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, streaming: false } : m));
            } else if (data.type === "thinking_step") {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, thinkingText: (data.text as string).slice(0, 180) + "…" } : m));
            } else if (data.type === "token") {
              content += data.text;
              setHasFirstResponse(true);
              streamRef.current.full = content;
              scheduleStreamFlush(assistantId);
              // Paragraph break detected — flush pending /btw
              if (btwBreakRef.current && content.endsWith("\n\n")) {
                const btwCtx = btwBreakRef.current;
                btwBreakRef.current = null;
                btwTriggered = true;
                abortRef.current?.abort();
                const snapshot = content;
                const histSnapshot = [...messages];
                setTimeout(() => resumeWithBtw(snapshot, btwCtx, histSnapshot), 80);
                break outer;
              }
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

      flushStream();
      if (!btwTriggered && btwBreakRef.current) {
        const btwCtx = btwBreakRef.current;
        btwBreakRef.current = null;
        btwTriggered = true;
        const snapshot = content;
        const histSnapshot = [...messages];
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, streaming: false } : m));
        setTimeout(() => resumeWithBtw(snapshot, btwCtx, histSnapshot), 80);
      } else if (!btwTriggered) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content, streaming: false } : m
        ));
      }
    } catch (err: any) {
      flushStream();
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
      if (!btwTriggered) setStreaming(false);
    }
  }, [messages, course, sessionId, streaming, pendingImage]);

  const resumeWithBtw = useCallback(async (partial: string, btwCtx: string, historyMessages: ChatMessage[]) => {
    const assistantId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true }]);
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[/btw: ${btwCtx}]`,
          btwResume: true,
          partialResponse: partial,
          courseId: runtimeCourseId,
          university: course?.university,
          course: course?.name,
          professor: course?.professor,
          semester: course?.semester ?? null,
          courseNumber: (course as any)?.course_number ?? null,
          subdomain: getSubdomain(),
          sessionId,
          history: (() => {
            const hist = historyMessages
              .filter(m => m.id !== "greeting" && m.content)
              .slice(-12)
              .map(m => ({ role: m.role, content: m.content }));
            while (hist.length > 0 && hist[0].role === "assistant") hist.shift();
            return hist;
          })(),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              content += data.text;
              streamRef.current.full = content;
              scheduleStreamFlush(assistantId);
            } else if (data.type === "done") {
              if (data.usedTokens !== undefined) setUsedTokens(data.usedTokens);
              router.refresh();
            } else if (data.type === "course_created") {
              if (data.course?.id) setRuntimeCourseId(data.course.id);
              router.refresh();
            } else if (data.type === "profile_updated") {
              router.refresh();
            }
          } catch { /* ignore */ }
        }
      }

      flushStream();
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content, streaming: false } : m));
    } catch (err: any) {
      flushStream();
      if (err.name !== "AbortError") {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Something went wrong.", streaming: false } : m));
      } else {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m));
      }
    } finally {
      setStreaming(false);
    }
  }, [course, sessionId]);

  // Keep sendRef current so event listeners below can call send without stale closure
  useEffect(() => { sendRef.current = send; }, [send]);

  // Pending documents from upload (base64 PDFs to attach to next message)
  const pendingDocsRef = useRef<{ base64: string; mediaType: string; name: string }[]>([]);

  // Auto-send feature prompt after upload completes; attach documents if provided
  useEffect(() => {
    const handler = (e: Event) => {
      const { courseId: uploadedCourseId, prompt, files } = (e as CustomEvent).detail ?? {};
      if (!prompt) return;
      if (uploadedCourseId && runtimeCourseId && uploadedCourseId !== runtimeCourseId) return;
      if (files?.length) pendingDocsRef.current = files;
      setTimeout(() => sendRef.current?.(prompt), 400);
    };
    window.addEventListener("proffy:upload-complete", handler);
    return () => window.removeEventListener("proffy:upload-complete", handler);
  }, [runtimeCourseId]);

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
          padding: "10px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}>
          <a
            href="/dashboard"
            title="Back to general chat"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "28px", height: "28px", borderRadius: "7px", flexShrink: 0,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              color: "var(--text-muted)", textDecoration: "none", transition: "all 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </a>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
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
      <div ref={scrollBoxRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ padding: "20px 0 8px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {wasCompacted && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 20px", margin: "4px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ fontSize: "11px", color: "var(--text-disabled)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                Earlier conversation summarized to save context
              </span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              index={i}
              courseId={course?.id}
              onRetry={msg.role === "assistant" && msg.id !== "greeting" && i === messages.length - 1
                ? () => {
                    const lastUser = [...messages].reverse().find(m => m.role === "user");
                    if (lastUser) {
                      setMessages(prev => prev.slice(0, -1));
                      send(lastUser.content);
                    }
                  }
                : undefined}
              onSave={msg.role === "assistant" && msg.id !== "greeting" ? async (content) => {
                try {
                  await fetch("/api/notes/save-message", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content, courseId: runtimeCourseId, courseName: course?.name }),
                  });
                  setUserSavedToast(true);
                  setTimeout(() => setUserSavedToast(false), 3000);
                } catch { /* ignore */ }
              } : undefined}
            />
          ))}

          {/* Rating reminder — shows after 3rd assistant response, once per session */}
          {assistantMsgCount >= 3 && !ratingReminderDismissed && !streaming && (
            <div style={{ display: "flex", justifyContent: "center", padding: "0 20px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "8px 14px", borderRadius: "99px",
                background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.18)",
                maxWidth: "420px",
              }}>
                <span style={{ fontSize: "13px" }}>👍</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", flex: 1 }}>
                  Rate answers with <span style={{ color: "var(--blue)" }}>thumbs up/down</span> — it helps Proffy get smarter for everyone
                </span>
                <button
                  onClick={() => setRatingReminderDismissed(true)}
                  style={{ background: "none", border: "none", color: "var(--text-disabled)", cursor: "pointer", padding: 0, fontSize: "12px", lineHeight: 1, flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
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

      {/* ── Usage bar + /btw tip ── */}
      <div style={{ flexShrink: 0, padding: "6px 16px 0", display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* /btw tip — shown to all, locked for free */}
        {hasFirstResponse && !btwDismissed && !isBtw && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "5px 10px", borderRadius: "8px",
            background: canTypeWhileStreaming ? "rgba(79,142,247,0.06)" : "rgba(167,139,250,0.05)",
            border: `1px solid ${canTypeWhileStreaming ? "rgba(79,142,247,0.15)" : "rgba(167,139,250,0.18)"}`,
          }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: canTypeWhileStreaming ? "var(--blue)" : "var(--purple)" }}>
              {canTypeWhileStreaming ? "💡" : "🔒"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", flex: 1 }}>
              {canTypeWhileStreaming
                ? <><code style={{ background: "rgba(167,139,250,0.12)", padding: "1px 5px", borderRadius: "4px", fontSize: "10px", color: "var(--purple)" }}>/btw</code>{" your context"} — inject mid-stream without interrupting</>
                : <><code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: "4px", fontSize: "10px" }}>/btw</code>{" — inject context mid-stream · "}<a href="/pricing" style={{ color: "var(--purple)", textDecoration: "none", fontWeight: 600 }}>Pro feature →</a></>
              }
            </span>
            <button onClick={() => setBtwDismissed(true)} style={{ background: "none", border: "none", color: "var(--text-disabled)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "12px" }}>✕</button>
          </div>
        )}
        {/* /btw active indicator */}
        {isBtw && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "5px 10px", borderRadius: "8px",
            background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)",
          }}>
            <span style={{ fontSize: "11px", color: "var(--purple)", fontWeight: 700 }}>↩ inject</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Your message will be injected as context mid-stream</span>
          </div>
        )}
        {/* Usage bar — shown at 75%+ of monthly token budget */}
        {tokenLimit && usedTokens / tokenLimit >= 0.75 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 2px" }}>
            <div style={{ flex: 1, height: "3px", borderRadius: "99px", background: "var(--border)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "99px", transition: "width 0.4s",
                width: `${Math.min(100, Math.round(usedTokens / tokenLimit * 100))}%`,
                background: usedTokens / tokenLimit > 0.9 ? "#f87171" : "#fbbf24",
              }} />
            </div>
            <span style={{ fontSize: "10px", color: usedTokens / tokenLimit > 0.9 ? "#f87171" : "#fbbf24", whiteSpace: "nowrap", flexShrink: 0 }}>
              {(usedTokens / 1000).toFixed(0)}K / {(tokenLimit / 1000).toFixed(0)}K tokens · Resets {resetDate}
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Input area ── */}
      <div style={{ flexShrink: 0, padding: "6px 16px 14px", background: "var(--bg-surface)" }}>
        {/* Image preview */}
        {pendingImage && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", padding: "6px 8px", borderRadius: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <img src={pendingImage.preview} alt="attachment" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "7px", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "12px", color: "var(--text-muted)" }}>Image attached</span>
            <button onClick={() => setPendingImage(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "2px 4px" }}>✕</button>
          </div>
        )}
        {/* Hidden file input */}
        <input
          ref={imgInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (sessionImageCount >= imageLimit) return;
            const reader = new FileReader();
            reader.onload = ev => {
              const dataUrl = ev.target?.result as string;
              const base64 = dataUrl.split(",")[1];
              const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
              setPendingImage({ base64, mediaType, preview: dataUrl });
            };
            reader.readAsDataURL(file);
          }}
        />
        <div style={{
          display: "flex", alignItems: "flex-end", gap: "10px",
          padding: "10px 14px", borderRadius: "12px",
          background: "var(--bg-elevated)",
          border: `1px solid ${isBtw ? "rgba(167,139,250,0.35)" : pendingImage ? "rgba(79,142,247,0.35)" : "var(--border-light)"}`,
          transition: "border-color 0.15s",
        }}>
          {/* Image upload button */}
          <button
            onClick={() => {
              if (sessionImageCount >= imageLimit) return;
              imgInputRef.current?.click();
            }}
            title={sessionImageCount >= imageLimit ? `Image limit reached (${imageLimit}/session)` : "Attach image"}
            style={{
              background: "none", border: "none", cursor: sessionImageCount >= imageLimit ? "not-allowed" : "pointer",
              color: sessionImageCount >= imageLimit ? "var(--text-disabled)" : "var(--text-muted)",
              padding: "3px", display: "flex", alignItems: "center", flexShrink: 0,
              opacity: sessionImageCount >= imageLimit ? 0.4 : 1, transition: "color 0.15s",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            data-tour="chat-input"
            dir="auto"
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder={isBtw ? "Add context mid-stream…" : course ? `Ask about ${course.name}…` : "Ask anything…"}
            rows={1}
            disabled={streaming && !canTypeWhileStreaming}
            style={{
              flex: 1, background: "transparent", fontSize: "14px", outline: "none",
              resize: "none", maxHeight: "140px", lineHeight: 1.6, border: "none",
              color: isBtw ? "var(--purple)" : "var(--text-primary)", opacity: (streaming && !canTypeWhileStreaming) ? 0.5 : 1,
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
              disabled={!input.trim() && !pendingImage}
              style={{
                flexShrink: 0, width: "32px", height: "32px",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "9px",
                background: isBtw ? "var(--purple)" : "var(--blue)",
                cursor: (input.trim() || pendingImage) ? "pointer" : "default",
                boxShadow: (input.trim() || pendingImage) ? `0 2px 10px ${isBtw ? "rgba(167,139,250,0.4)" : "rgba(79,142,247,0.4)"}` : "none",
                opacity: (input.trim() || pendingImage) ? 1 : 0.3, transition: "opacity 0.15s, box-shadow 0.15s",
                border: "none",
              }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "10px", marginTop: "6px", color: "var(--text-disabled)" }}>
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
                { key: "pro", name: "Pro", price: "₪79", color: "var(--blue)", border: "rgba(79,142,247,0.35)", bg: "rgba(79,142,247,0.07)", features: ["Unlimited messages & courses", "Smarter AI (Claude Sonnet)", "General AI — coding, writing, anything", "Upload slides — answers from your material", "Professor pattern analysis"] },
                { key: "max", name: "Max", price: "₪149", color: "var(--purple)", border: "rgba(167,139,250,0.35)", bg: "rgba(167,139,250,0.07)", features: ["Everything in Pro", "Higher daily usage (~60-70 msgs)", "Exam predictions & topic likelihoods", "Deep professor fingerprinting", "Priority support"] },
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
