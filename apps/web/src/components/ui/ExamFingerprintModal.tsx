"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import type { Course } from "@/lib/types";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface Pattern { topic: string; pct: number }

export default function ExamFingerprintModal() {
  const { data: session } = useSession();
  const userPlan = (session?.user as any)?.plan ?? "free";
  const canUse = userPlan === "max";

  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [chunkCount, setChunkCount] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("proffy:open-fingerprint", handler);
    return () => window.removeEventListener("proffy:open-fingerprint", handler);
  }, []);

  useEffect(() => {
    if (!open || !session) return;
    fetch("/api/courses").then(r => r.json()).then(d => {
      const list: Course[] = d.courses ?? [];
      setCourses(list);
      if (list.length > 0 && !courseId) setCourseId(list[0].id);
    }).catch(() => {});
  }, [open, session]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  function close() {
    setOpen(false);
    setFiles([]); setStatus("idle"); setProgress(0);
    setPatterns([]); setChunkCount(0); setError("");
  }

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter(f =>
      f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    setFiles(prev => [...prev, ...valid].slice(0, 5));
  }, []);

  async function upload() {
    if (!files.length || !courseId) return;
    setStatus("uploading"); setProgress(0); setError("");
    let allPatterns: Pattern[] = [];
    let total = 0;

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      fd.append("courseId", courseId);
      fd.append("type", "exam");
      try {
        const resp = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error ?? "Upload failed");
        total += data.chunks_created ?? 0;
        if (data.patterns?.length) allPatterns = data.patterns;
      } catch (err: any) {
        setError(err.message ?? "Upload failed");
        setStatus("error");
        return;
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setPatterns(allPatterns);
    setChunkCount(total);
    setStatus("success");

    // Dispatch auto-message to agent
    window.dispatchEvent(new CustomEvent("proffy:upload-complete", {
      detail: {
        courseId,
        docType: "exam",
        prompt: "I just uploaded past exams for this course. Analyze the professor's exam patterns thoroughly: rank the top tested topics by frequency, identify their preferred question styles and formats, flag any recurring traps or tricks, and tell me exactly what to prioritize to maximize my exam score.",
      },
    }));
  }

  const selectedCourse = courses.find(c => c.id === courseId);
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1px solid var(--border)", background: "var(--bg-elevated)",
    color: "var(--text-primary)", fontSize: "14px", outline: "none",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "fixed", inset: 0, zIndex: 1101, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", pointerEvents: "none" }}
          >
            <div style={{
              width: "100%", maxWidth: "520px", maxHeight: "90vh",
              background: "var(--bg-base)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1.5rem", overflow: "hidden", display: "flex",
              flexDirection: "column", pointerEvents: "auto",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}>
              {/* Header */}
              <div style={{
                padding: "1.5rem", borderBottom: "1px solid var(--border)",
                background: "linear-gradient(135deg, rgba(248,113,113,0.06) 0%, rgba(167,139,250,0.04) 100%)",
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "22px" }}>🧬</span>
                      <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                        Professor Fingerprint
                      </h2>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                      Upload past exams — Proffy maps exactly what your professor tests, how often, and how to beat them.
                    </p>
                  </div>
                  <button onClick={close} style={{
                    width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--bg-elevated)", color: "var(--text-muted)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>✕</button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

                {!canUse ? (
                  /* Upgrade prompt */
                  <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                      Max plan required
                    </h3>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                      Professor Fingerprint uses advanced AI to analyze exam patterns across years. Available on Max plan.
                    </p>
                    <a href="/checkout" style={{
                      display: "inline-block", padding: "10px 24px", borderRadius: "10px",
                      background: "linear-gradient(135deg,#f87171,#a78bfa)",
                      color: "#fff", fontSize: "13px", fontWeight: 700, textDecoration: "none",
                    }}>
                      Upgrade to Max →
                    </a>
                  </div>
                ) : (
                  <>
                    {/* Course selector */}
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                        Course
                      </label>
                      <select value={courseId} onChange={e => setCourseId(e.target.value)} style={inputStyle}>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.professor ? ` — ${c.professor}` : ""}</option>
                        ))}
                      </select>
                    </div>

                    {/* Upload zone */}
                    <AnimatePresence mode="wait">
                      {status === "success" ? (
                        <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "1rem", padding: "1.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <span>🧬</span>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "#f87171" }}>
                              Fingerprint mapped — {chunkCount} exam chunks indexed
                            </span>
                          </div>

                          {patterns.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
                                {selectedCourse?.professor ? `Prof. ${selectedCourse.professor} always asks` : "Topic frequency"}
                              </p>
                              {patterns.map(p => (
                                <div key={p.topic}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>{p.topic}</span>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#f87171" }}>{p.pct}%</span>
                                  </div>
                                  <div style={{ height: "4px", borderRadius: "4px", background: "rgba(248,113,113,0.15)", overflow: "hidden" }}>
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${p.pct}%` }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                      style={{ height: "100%", background: "linear-gradient(90deg,#f87171,#a78bfa)", borderRadius: "4px" }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                              Exam indexed. Ask the agent what to expect on your next exam.
                            </p>
                          )}

                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => { setFiles([]); setStatus("idle"); setPatterns([]); }} style={{ padding: "7px 14px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}>
                              Upload more
                            </button>
                            <button onClick={close} style={{ padding: "7px 14px", borderRadius: "8px", background: "linear-gradient(135deg,#f87171,#a78bfa)", border: "none", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                              Ask Proffy now →
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {/* Drop zone */}
                          <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                            onClick={() => fileRef.current?.click()}
                            style={{
                              border: `2px dashed ${dragging ? "#f87171" : files.length ? "rgba(248,113,113,0.5)" : "var(--border)"}`,
                              borderRadius: "1rem", padding: "2rem 1.5rem", textAlign: "center",
                              cursor: "pointer", background: dragging ? "rgba(248,113,113,0.04)" : "transparent",
                              transition: "all 0.2s",
                            }}
                          >
                            <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: "none" }}
                              onChange={e => e.target.files && addFiles(e.target.files)} />
                            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                              {files.length ? "📂" : "📝"}
                            </div>
                            {files.length > 0 ? (
                              <div>
                                {files.map((f, i) => (
                                  <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 10px", margin: "3px" }}>
                                    📄 {f.name}
                                    <button onClick={ev => { ev.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)); }}
                                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>×</button>
                                  </div>
                                ))}
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>Click to add more (max 5 exams)</p>
                              </div>
                            ) : (
                              <>
                                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                                  Drop past exam PDFs here
                                </p>
                                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                  Upload multiple years for better pattern accuracy
                                </p>
                              </>
                            )}
                          </div>

                          {status === "uploading" && (
                            <div>
                              <div style={{ height: "4px", borderRadius: "4px", background: "var(--border)", overflow: "hidden", marginBottom: "8px" }}>
                                <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
                                  style={{ height: "100%", background: "linear-gradient(90deg,#f87171,#a78bfa)", borderRadius: "4px" }} />
                              </div>
                              <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>Fingerprinting… {progress}%</p>
                            </div>
                          )}

                          {error && <p style={{ fontSize: "12px", color: "var(--red)", textAlign: "center" }}>{error}</p>}

                          <button
                            onClick={upload}
                            disabled={!files.length || !courseId || status === "uploading"}
                            style={{
                              width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                              background: files.length && courseId ? "linear-gradient(135deg,#f87171,#a78bfa)" : "var(--bg-elevated)",
                              color: files.length && courseId ? "#fff" : "var(--text-muted)",
                              fontSize: "14px", fontWeight: 700,
                              cursor: files.length && courseId ? "pointer" : "not-allowed",
                            }}
                          >
                            {status === "uploading" ? "Analyzing…" : "🧬 Run Professor Fingerprint"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
