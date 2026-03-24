"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { unzipSync } from "fflate";
import type { Course } from "@/lib/types";

type DocType = "slides" | "exam" | "notes" | "textbook";
type UploadStatus = "idle" | "uploading" | "success" | "error";
type Tab = "files" | "drive";

const DOC_TYPES: { value: DocType; label: string; icon: string; desc: string; minPlan: "pro" | "max" }[] = [
  { value: "slides",   label: "Lecture slides",   icon: "📊", desc: "Answers grounded in your slides", minPlan: "pro" },
  { value: "notes",    label: "Study notes",       icon: "📖", desc: "Searchable by Proffy",            minPlan: "pro" },
  { value: "textbook", label: "Textbook chapter",  icon: "📚", desc: "Reference material",              minPlan: "pro" },
];
const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, max: 2 };
function planLabel(plan: "pro" | "max") { return plan === "max" ? "Max" : "Pro"; }

// Feature-specific prompts sent to the agent after upload
const UPLOAD_PROMPTS: Record<string, string> = {
  exam:     "I just uploaded a past exam for this course. Please analyze it thoroughly: identify the professor's top tested topics ranked by frequency, their preferred question styles, any recurring tricks or traps, and what I should prioritize to maximize my exam score.",
  slides:   "I just uploaded lecture slides. Pull out the 3 most important concepts, any definitions I must memorize, and flag which topics look like likely exam material.",
  notes:    "I just uploaded my study notes. Review them, identify gaps in my understanding, flag anything incomplete or unclear, and suggest what to study next.",
  textbook: "I just uploaded a textbook chapter. Give me a concise summary of the core theory, the key formulas or rules to know, and three practice problems to test my understanding.",
};

export default function UploadModal() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [serviceAccountEmail, setServiceAccountEmail] = useState("");
  const userPlan = (session?.user as any)?.plan ?? "free";

  const [tab, setTab] = useState<Tab>("files");
  const [courseId, setCourseId] = useState("");
  const [docType, setDocType] = useState<DocType>("slides");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [zipExtracting, setZipExtracting] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ chunkCount: number; patterns: { topic: string; pct: number }[] } | null>(null);
  const [error, setError] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [driveNote, setDriveNote] = useState("");
  const [driveStatus, setDriveStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [driveError, setDriveError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Listen for open event from anywhere
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("proffy:open-upload", handler);
    return () => window.removeEventListener("proffy:open-upload", handler);
  }, []);

  // Fetch courses + config when opened
  useEffect(() => {
    if (!open || !session) return;
    fetch("/api/courses").then(r => r.json()).then(d => {
      const list: Course[] = d.courses ?? [];
      setCourses(list);
      if (list.length > 0 && !courseId) setCourseId(list[0].id);
    }).catch(() => {});
    fetch("/api/upload-config").then(r => r.json()).then(d => {
      setServiceAccountEmail(d.serviceAccountEmail ?? "");
    }).catch(() => {});
  }, [open, session]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  function resetState() {
    setFiles([]); setStatus("idle"); setResult(null); setError("");
    setDriveUrl(""); setDriveNote(""); setDriveStatus("idle"); setDriveError("");
  }

  function close() { setOpen(false); resetState(); }

  const canUseDocType = (dt: DocType) =>
    PLAN_RANK[userPlan] >= PLAN_RANK[DOC_TYPES.find(d => d.value === dt)!.minPlan];

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const list = Array.from(newFiles);
    const zips = list.filter(f => f.name.toLowerCase().endsWith(".zip") || f.type === "application/zip" || f.type === "application/x-zip-compressed");
    const direct = list.filter(f => !zips.includes(f) && (
      f.type === "application/pdf" || f.name.endsWith(".pdf") || f.name.endsWith(".txt")
    ));

    let extracted: File[] = [];
    if (zips.length > 0) {
      setZipExtracting(true);
      try {
        for (const zip of zips) {
          const buf = await zip.arrayBuffer();
          const unzipped = unzipSync(new Uint8Array(buf));
          for (const [path, data] of Object.entries(unzipped)) {
            if (path.startsWith("__MACOSX/") || path.startsWith(".")) continue;
            const ext = path.split(".").pop()?.toLowerCase() ?? "";
            if (!["pdf", "txt", "jpg", "jpeg", "png", "webp"].includes(ext)) continue;
            const mime = ext === "pdf" ? "application/pdf" : ext === "txt" ? "text/plain" : `image/${ext}`;
            const name = path.split("/").pop() ?? path;
            extracted.push(new File([data.buffer as ArrayBuffer], name, { type: mime }));
          }
        }
      } finally {
        setZipExtracting(false);
      }
    }

    setFiles(prev => [...prev, ...direct, ...extracted].slice(0, 20));
  }, []);

  async function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function upload() {
    if (!files.length || !courseId) return;
    setStatus("uploading"); setError(""); setResult(null);

    try {
      // Attach up to 5 PDFs to chat (Claude reads them directly)
      const pdfFiles = files.filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
      const filesData = await Promise.all(
        pdfFiles.slice(0, 5).map(async f => ({
          base64: await readAsBase64(f),
          mediaType: "application/pdf" as const,
          name: f.name,
        }))
      );

      // Background-index ALL files (for future RAG sessions)
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("courseId", courseId);
        fd.append("type", docType);
        fetch("/api/upload", { method: "POST", body: fd }).catch(() => {});
      }

      setResult({ chunkCount: files.length, patterns: [] });
      setStatus("success");

      // Dispatch to chat with file content — Claude reads directly, no waiting
      window.dispatchEvent(new CustomEvent("proffy:upload-complete", {
        detail: { courseId, docType, prompt: UPLOAD_PROMPTS[docType], files: filesData },
      }));
      setTimeout(() => close(), 800);
    } catch (err: any) {
      setError(err.message ?? "Failed to read files");
      setStatus("error");
    }
  }

  async function submitDrive() {
    if (!driveUrl.trim() || !courseId) return;
    setDriveStatus("submitting"); setDriveError("");
    try {
      const resp = await fetch("/api/material-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: driveUrl.trim(), courseId, note: driveNote.trim() || null }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Failed to submit");
      setDriveStatus("success");
    } catch (err: any) {
      setDriveError(err.message ?? "Failed to submit");
      setDriveStatus("error");
    }
  }

  async function copyEmail() {
    if (!serviceAccountEmail) return;
    await navigator.clipboard.writeText(serviceAccountEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1001,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "1rem", pointerEvents: "none",
            }}
          >
            <div style={{
              width: "100%", maxWidth: "600px", maxHeight: "90vh",
              background: "var(--bg-base)", border: "1px solid var(--border)",
              borderRadius: "1.25rem", overflow: "hidden", display: "flex",
              flexDirection: "column", pointerEvents: "auto",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}>
              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", flexShrink: 0,
              }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Add course material</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                    Upload files or share a Drive folder — Proffy indexes everything
                  </p>
                </div>
                <button onClick={close} style={{
                  width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border)",
                  background: "var(--bg-elevated)", color: "var(--text-muted)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                  flexShrink: 0,
                }}>✕</button>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "6px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "4px" }}>
                  {(["files", "drive"] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      flex: 1, padding: "8px", borderRadius: "9px", border: "none",
                      background: tab === t ? "var(--bg-elevated)" : "transparent",
                      color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
                      fontSize: "13px", fontWeight: tab === t ? 700 : 400,
                      cursor: "pointer", transition: "all 0.15s",
                      boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                    }}>
                      {t === "files" ? "⬆️  Upload files" : "📁  Share Drive folder"}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {tab === "files" ? (
                    <motion.div key="files" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                      {/* Course + type */}
                      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Course</label>
                          <select value={courseId} onChange={e => setCourseId(e.target.value)} style={inputStyle}>
                            {courses.map(c => (
                              <option key={c.id} value={c.id}>{c.name}{c.professor ? ` — ${c.professor}` : ""}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Document type</label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {DOC_TYPES.map(t => {
                              const locked = !canUseDocType(t.value);
                              const active = docType === t.value && !locked;
                              return (
                                <button key={t.value} onClick={() => { if (!locked) setDocType(t.value); }} style={{
                                  padding: "10px 12px", borderRadius: "10px", textAlign: "left", cursor: locked ? "default" : "pointer",
                                  border: `1px solid ${active ? "rgba(79,142,247,0.5)" : "var(--border)"}`,
                                  background: active ? "rgba(79,142,247,0.08)" : locked ? "var(--bg-surface)" : "var(--bg-elevated)",
                                  color: active ? "var(--blue)" : locked ? "var(--text-muted)" : "var(--text-secondary)",
                                  transition: "all 0.15s", opacity: locked ? 0.65 : 1, position: "relative",
                                }}>
                                  <div style={{ fontSize: "16px", marginBottom: "3px" }}>{t.icon}</div>
                                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{t.label}</div>
                                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{t.desc}</div>
                                  {locked && (
                                    <span style={{ position: "absolute", top: "8px", right: "8px", fontSize: "9px", fontWeight: 700, background: "rgba(167,139,250,0.15)", color: "#a78bfa", borderRadius: "4px", padding: "2px 5px" }}>
                                      {planLabel(t.minPlan)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {!canUseDocType(docType) && (
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                              Uploading requires Pro or Max. <a href="/pricing" style={{ color: "var(--blue)", textDecoration: "none" }}>Upgrade →</a>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Drop zone */}
                      <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                        onClick={() => fileRef.current?.click()}
                        style={{
                          border: `2px dashed ${dragging ? "var(--blue)" : files.length ? "rgba(79,142,247,0.4)" : "var(--border)"}`,
                          borderRadius: "1rem", padding: "2rem 1.5rem", textAlign: "center",
                          cursor: "pointer", background: dragging ? "rgba(79,142,247,0.04)" : "transparent",
                          transition: "all 0.2s",
                        }}
                      >
                        <input ref={fileRef} type="file" accept=".pdf,.txt,.zip" multiple style={{ display: "none" }}
                          onChange={e => e.target.files && addFiles(e.target.files)} />
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                          {zipExtracting ? "⏳" : files.length ? "📂" : "⬆️"}
                        </div>
                        {zipExtracting ? (
                          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Extracting ZIP…</p>
                        ) : files.length > 0 ? (
                          <div>
                            {files.map((f, i) => (
                              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 10px", margin: "3px" }}>
                                📄 {f.name}
                                <button onClick={ev => { ev.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)); }}
                                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, fontSize: "12px" }}>×</button>
                              </div>
                            ))}
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                              {files.length} file{files.length > 1 ? "s" : ""} — click to add more
                            </p>
                          </div>
                        ) : (
                          <>
                            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Drop files here or click to browse</p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>PDF · TXT · ZIP (of PDFs)</p>
                          </>
                        )}
                      </div>

                      {/* Upload button / progress / result */}
                      <AnimatePresence mode="wait">
                        {status === "uploading" ? (
                          <motion.div key="prog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ height: "4px", borderRadius: "4px", background: "var(--border)", overflow: "hidden", marginBottom: "8px" }}>
                              <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
                                style={{ height: "100%", background: "linear-gradient(90deg,#4f8ef7,#a78bfa)", borderRadius: "4px" }} />
                            </div>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>Extracting and indexing… {progress}%</p>
                          </motion.div>
                        ) : status === "success" && result ? (
                          <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "1rem", padding: "1.25rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                              <span>✅</span>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--green)" }}>Indexed — {result.chunkCount} searchable chunks</span>
                            </div>
                            {result.patterns.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
                                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
                                  {selectedCourse?.professor ? `Prof. ${selectedCourse.professor} patterns` : "Patterns detected"}
                                </p>
                                {result.patterns.map(p => (
                                  <div key={p.topic}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                      <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>{p.topic}</span>
                                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.pct}%</span>
                                    </div>
                                    <div style={{ height: "3px", borderRadius: "3px", background: "var(--border)", overflow: "hidden" }}>
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.7 }}
                                        style={{ height: "100%", background: "var(--blue)", borderRadius: "3px" }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={resetState} style={{ padding: "7px 14px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}>Upload more</button>
                              <button onClick={close} style={{ padding: "7px 14px", borderRadius: "8px", background: "var(--blue)", border: "none", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Done</button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {error && <p style={{ fontSize: "12px", color: "var(--red)", marginBottom: "8px", textAlign: "center" }}>{error}</p>}
                            <button onClick={upload} disabled={!files.length || !courseId || !canUseDocType(docType)} style={{
                              width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                              background: files.length && courseId && canUseDocType(docType) ? "linear-gradient(135deg,#4f8ef7,#a78bfa)" : "var(--bg-elevated)",
                              color: files.length && courseId && canUseDocType(docType) ? "#fff" : "var(--text-muted)",
                              fontSize: "14px", fontWeight: 700, cursor: files.length && courseId && canUseDocType(docType) ? "pointer" : "not-allowed",
                            }}>
                              {docType === "exam" ? "Upload & extract professor patterns" : "Upload & index"}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    /* Drive tab */
                    <motion.div key="drive" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.25rem" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Course</label>
                        <select value={courseId} onChange={e => setCourseId(e.target.value)} style={inputStyle}>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.name}{c.professor ? ` — ${c.professor}` : ""}</option>)}
                        </select>
                      </div>

                      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                          Share any Google Drive folder with Proffy — slides, past exams, notes — and it will be indexed automatically.
                        </p>
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Step 1 — Copy the Proffy service email</p>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <code style={{ flex: 1, padding: "9px 12px", borderRadius: "9px", background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--text-primary)", overflowX: "auto", whiteSpace: "nowrap" }}>
                              {serviceAccountEmail || "—"}
                            </code>
                            <button onClick={copyEmail} disabled={!serviceAccountEmail} style={{ padding: "9px 14px", borderRadius: "9px", border: "1px solid var(--border)", background: copied ? "rgba(79,142,247,0.1)" : "var(--bg-elevated)", color: copied ? "var(--blue)" : "var(--text-secondary)", fontSize: "12px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                              {copied ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Step 2 — Share the folder (Viewer access)</p>
                          <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {["Open Google Drive → right-click your folder → Share", "Paste the email above, set role to Viewer, click Send"].map((s, i) => (
                              <li key={i} style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55 }}>{s}</li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Step 3 — Paste the folder URL</p>
                          <input type="url" placeholder="https://drive.google.com/drive/folders/..." value={driveUrl} onChange={e => setDriveUrl(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />
                          <input type="text" placeholder="Note (optional) — e.g. 'Prof. Cohen slides 2024'" value={driveNote} onChange={e => setDriveNote(e.target.value)} style={inputStyle} />
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {driveStatus === "success" ? (
                          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "1rem", padding: "1.25rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                              <span>✅</span>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--green)" }}>Folder queued for ingestion</span>
                            </div>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 12px" }}>The platform team will index it shortly.</p>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => { setDriveUrl(""); setDriveNote(""); setDriveStatus("idle"); }} style={{ padding: "7px 14px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}>Submit another</button>
                              <button onClick={close} style={{ padding: "7px 14px", borderRadius: "8px", background: "var(--blue)", border: "none", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Done</button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div key="sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {driveError && <p style={{ fontSize: "12px", color: "var(--red)", marginBottom: "8px" }}>{driveError}</p>}
                            <button onClick={submitDrive} disabled={!driveUrl.trim() || !courseId || driveStatus === "submitting"} style={{
                              width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                              background: driveUrl.trim() && courseId ? "linear-gradient(135deg,#4f8ef7,#a78bfa)" : "var(--bg-elevated)",
                              color: driveUrl.trim() && courseId ? "#fff" : "var(--text-muted)",
                              fontSize: "14px", fontWeight: 700, cursor: driveUrl.trim() && courseId ? "pointer" : "not-allowed",
                            }}>
                              {driveStatus === "submitting" ? "Submitting…" : "Submit folder for ingestion"}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
