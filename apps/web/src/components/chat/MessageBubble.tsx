"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage, Source } from "@/lib/types";

interface Props {
  message: ChatMessage;
  index: number;
  courseId?: string;
  onRetry?: () => void;
  onSave?: (content: string) => void;
}

const DEFAULT_THINKING = "Thinking…";

function ProffyAvatar({ thinking = false }: { index: number; thinking?: boolean }) {
  return (
    <div
      className={thinking ? "thinking-avatar" : undefined}
      style={{
        width: "32px", height: "32px", flexShrink: 0,
        borderRadius: "10px", overflow: "hidden",
        background: "linear-gradient(135deg, #4f46e5, #9333ea)",
        boxShadow: thinking ? undefined : "0 2px 10px rgba(99,102,241,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-owl.png"
        alt="Proffy"
        width={64} height={64}
        style={{ objectFit: "contain", width: "100%", height: "100%" }}
        draggable={false}
      />
    </div>
  );
}

const isThinking = (msg: ChatMessage) => msg.streaming && !msg.content;

function ThinkingBlock({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "180px" }}>
      <motion.span
        key={text}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic", flex: 1 }}
      >
        {text}
      </motion.span>
      <span style={{ display: "flex", gap: "3px" }}>
        <span className="thinking-dot" style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "var(--blue)" }} />
        <span className="thinking-dot" style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "var(--blue)" }} />
        <span className="thinking-dot" style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "var(--blue)" }} />
      </span>
    </div>
  );
}

export default function MessageBubble({ message, index, courseId, onRetry, onSave }: Props) {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [saved, setSaved] = useState(false);

  async function submitFeedback(rating: "like" | "dislike") {
    const newRating = feedback === rating ? null : rating;
    setFeedback(newRating);
    if (!message.dbMessageId || !newRating) return;
    fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: message.dbMessageId,
        rating: newRating === "like" ? "up" : "down",
        courseId: courseId ?? undefined,
      }),
    }).catch(() => {});
  }
  const isUser = message.role === "user";
  const thinking = !isUser && isThinking(message);
  const isError = !isUser && !message.streaming && message.content?.startsWith("Something went wrong");

  const userInitial = session?.user?.name?.[0]?.toUpperCase()
    ?? session?.user?.email?.[0]?.toUpperCase()
    ?? "U";

  async function copy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    onSave?.(message.content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.2) }}
      style={{
        display: "flex", gap: "10px",
        padding: "0 20px",
        justifyContent: isUser ? "flex-end" : "flex-start",
        alignItems: "flex-start",
      }}
    >
      {/* Proffy avatar */}
      {!isUser && <ProffyAvatar index={index} thinking={thinking} />}

      <div style={{
        display: "flex", flexDirection: "column", gap: "6px",
        alignItems: isUser ? "flex-end" : "flex-start",
        maxWidth: isUser ? "72%" : "82%",
        flex: isUser ? "unset" : 1,
        minWidth: 0,
      }}>
        {/* Bubble */}
        <div style={{
          padding: "10px 14px",
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          fontSize: "14px", lineHeight: 1.65,
          ...(isUser
            ? { background: "var(--blue)", color: "#fff" }
            : { background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }
          ),
        }}>
          {/* Thinking state */}
          {thinking ? (
            <ThinkingBlock text={message.thinkingText ?? DEFAULT_THINKING} />
          ) : isUser ? (
            <p dir="auto" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{message.content}</p>
          ) : message.streaming ? (
            // Plain text while streaming — skip expensive markdown/KaTeX parsing
            <p dir="auto" style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{message.content}</p>
          ) : (
            <div className="prose-chat" dir="auto">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                components={{
                  pre({ children }) {
                    return <pre style={{ margin: 0 }}>{children}</pre>;
                  },
                  code({ className, children }) {
                    const isBlock = !!className;
                    const codeStr = String(children).replace(/\n$/, "");
                    if (!isBlock) return <code style={{ background: "rgba(79,142,247,0.1)", borderRadius: "4px", padding: "1px 5px", fontSize: "13px", fontFamily: "monospace" }}>{children}</code>;
                    return (
                      <div style={{ position: "relative", margin: "10px 0", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)" }}>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "6px 14px", borderBottom: "1px solid var(--border)",
                          background: "var(--bg-hover)", fontSize: "11px", color: "var(--text-muted)",
                        }}>
                          <span>{className?.replace("language-", "") || "code"}</span>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(codeStr);
                              setCopiedCode(codeStr);
                              setTimeout(() => setCopiedCode(null), 2000);
                            }}
                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", padding: 0 }}
                          >
                            {copiedCode === codeStr ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <code className={className} style={{ display: "block", padding: "14px", overflowX: "auto", fontSize: "12px", lineHeight: 1.6 }}>
                          {children}
                        </code>
                      </div>
                    );
                  },
                  table({ children }) {
                    return (
                      <div style={{ overflowX: "auto", margin: "12px 0" }}>
                        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return <thead style={{ background: "rgba(79,142,247,0.08)" }}>{children}</thead>;
                  },
                  th({ children }) {
                    return <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-primary)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>{children}</th>;
                  },
                  td({ children }) {
                    return <td style={{ padding: "7px 14px", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)", verticalAlign: "top" }}>{children}</td>;
                  },
                  tr({ children }) {
                    return <tr style={{ transition: "background 0.1s" }}>{children}</tr>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote style={{
                        margin: "10px 0", padding: "10px 14px",
                        borderLeft: "3px solid var(--purple)", borderRadius: "0 8px 8px 0",
                        background: "rgba(167,139,250,0.07)", color: "var(--text-secondary)",
                        fontStyle: "italic",
                      }}>
                        {children}
                      </blockquote>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.streaming && (
                <span className="cursor-blink" style={{
                  display: "inline-block", width: "2px", height: "15px",
                  marginLeft: "2px", borderRadius: "2px", verticalAlign: "text-bottom",
                  background: "var(--blue)",
                }} />
              )}
            </div>
          )}
        </div>

        {/* Action row */}
        {!isUser && !message.streaming && message.content && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "2px" }}>
            {/* Copy */}
            <button
              onClick={copy}
              title={copied ? "Copied!" : "Copy"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "3px", color: copied ? "var(--blue)" : "var(--text-muted)", display: "flex", alignItems: "center" }}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </button>

            {/* Like */}
            <button
              onClick={() => submitFeedback("like")}
              title="Helpful"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "3px", color: feedback === "like" ? "var(--blue)" : "var(--text-muted)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
            </button>

            {/* Dislike */}
            <button
              onClick={() => submitFeedback("dislike")}
              title="Not helpful"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "3px", color: feedback === "dislike" ? "#f87171" : "var(--text-muted)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
              </svg>
            </button>

            {/* Retry */}
            {onRetry && (
              <button
                onClick={onRetry}
                title="Regenerate answer"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "3px", color: "var(--text-muted)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                </svg>
              </button>
            )}

            {/* Save to memory */}
            {onSave && (
              <button
                onClick={handleSave}
                title={saved ? "Saved!" : "Save to my notes"}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "3px", color: saved ? "var(--blue)" : "var(--text-muted)", display: "flex", alignItems: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            )}

          </div>
        )}

        {/* Retry on error */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              fontSize: "12px", color: "var(--blue)", background: "none", border: "1px solid var(--border)",
              borderRadius: "8px", cursor: "pointer", padding: "5px 10px", marginTop: "2px",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
            Retry
          </button>
        )}

      </div>

      {/* User avatar */}
      {isUser && (
        <div style={{
          width: "30px", height: "30px", flexShrink: 0, borderRadius: "9px",
          background: "linear-gradient(135deg, #4f8ef7, #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: 700, color: "#fff", marginTop: "1px",
        }}>
          {userInitial}
        </div>
      )}
    </motion.div>
  );
}

function SourceCard({ source, index }: { source: Source; index: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "8px",
      padding: "8px 12px", borderRadius: "9px",
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      fontSize: "12px",
    }}>
      <span style={{ fontFamily: "monospace", fontWeight: 700, flexShrink: 0, marginTop: "1px", color: "var(--blue)" }}>
        [{index}]
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 500, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
          {source.filename || "Course material"}
        </p>
        <p style={{ color: "var(--text-muted)", margin: "2px 0 0", fontSize: "11px" }}>
          {[source.type, source.professor].filter(Boolean).join(" · ")}
          {source.score ? ` · ${Math.round(source.score * 100)}% match` : ""}
        </p>
      </div>
    </div>
  );
}
