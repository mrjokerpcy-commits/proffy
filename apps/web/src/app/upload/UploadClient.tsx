"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Course } from "@/lib/types";

interface Props {
  courses: Course[];
  userPlan?: "free" | "pro" | "max";
  serviceAccountEmail?: string;
}

type DocType = "slides" | "exam" | "notes" | "textbook";
type UploadStatus = "idle" | "uploading" | "success" | "error";
type Tab = "files" | "drive";

const DOC_TYPES: { value: DocType; label: string; icon: string; desc: string; minPlan: "pro" | "max" }[] = [
  { value: "exam",      label: "Past exam",        icon: "📝", desc: "AI extracts professor patterns",    minPlan: "max" },
  { value: "slides",    label: "Lecture slides",   icon: "📊", desc: "Answers grounded in your slides",   minPlan: "pro" },
  { value: "notes",     label: "Study notes",      icon: "📖", desc: "Searchable by Proffy",              minPlan: "pro" },
  { value: "textbook",  label: "Textbook chapter", icon: "📚", desc: "Reference material",                minPlan: "pro" },
];

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, max: 2 };

function planLabel(plan: "pro" | "max") {
  return plan === "max" ? "Max" : "Pro";
}

export default function UploadClient({ courses, userPlan = "free", serviceAccountEmail = "" }: Props) {
  const [tab, setTab] = useState<Tab>("files");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [docType, setDocType] = useState<DocType>("slides");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ chunkCount: number; patterns: { topic: string; pct: number }[] } | null>(null);
  const [error, setError] = useState("");

  // Drive tab state
  const [driveUrl, setDriveUrl] = useState("");
  const [driveNote, setDriveNote] = useState("");
  const [driveStatus, setDriveStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [driveError, setDriveError] = useState("");
  const [copied, setCopied] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const canUseDocType = (dt: DocType) =>
    PLAN_RANK[userPlan] >= PLAN_RANK[DOC_TYPES.find(d => d.value === dt)!.minPlan];

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter(f =>
      f.type === "application/pdf" || f.name.endsWith(".pdf") || f.name.endsWith(".txt")
    );
    setFiles(prev => [...prev, ...valid].slice(0, 5));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  async function upload() {
    if (!files.length || !courseId) return;
    if (!canUseDocType(docType)) return;
    setStatus("uploading");
    setProgress(0);
    setError("");
    setResult(null);

    let lastPatterns: { topic: string; pct: number }[] = [];
    let totalChunks = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const fd = new FormData();
      fd.append("file", f);
      fd.append("courseId", courseId);
      fd.append("type", docType);

      try {
        const resp = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error ?? "Upload failed");
        totalChunks += data.chunkCount ?? 0;
        if (data.patterns?.length) lastPatterns = data.patterns;
      } catch (err: any) {
        setError(err.message ?? "Upload failed");
        setStatus("error");
        return;
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setResult({ chunkCount: totalChunks, patterns: lastPatterns });
    setStatus("success");
  }

  async function submitDrive() {
    if (!driveUrl.trim() || !courseId) return;
    setDriveStatus("submitting");
    setDriveError("");
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
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontSize: "14px",
    outline: "none",
    appearance: "none" as any,
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
          <a href="/" style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            fontSize: "13px", color: "var(--text-muted)", textDecoration: "none",
            padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border)",
            background: "var(--bg-elevated)", transition: "color 0.15s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to chat
          </a>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Add course material
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
          Upload files directly or share a Google Drive folder — Proffy indexes everything and answers from your exact material.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
        style={{ display: "flex", gap: "6px", marginBottom: "1.25rem", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "4px" }}>
        {(["files", "drive"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "9px", borderRadius: "9px", border: "none",
              background: tab === t ? "var(--bg-elevated)" : "transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "13px", fontWeight: tab === t ? 700 : 400,
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t === "files" ? "⬆️  Upload files" : "📁  Share Drive folder"}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {tab === "files" ? (
          <motion.div key="files" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Course + type selectors */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "1.125rem", padding: "1.5rem", marginBottom: "1.25rem",
              display: "flex", flexDirection: "column", gap: "1rem",
            }}>
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

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                  Document type
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {DOC_TYPES.map(t => {
                    const locked = !canUseDocType(t.value);
                    const active = docType === t.value && !locked;
                    return (
                      <button
                        key={t.value}
                        onClick={() => { if (!locked) setDocType(t.value); }}
                        style={{
                          padding: "10px 12px", borderRadius: "10px",
                          border: `1px solid ${active ? "rgba(79,142,247,0.5)" : "var(--border)"}`,
                          background: active ? "rgba(79,142,247,0.08)" : locked ? "var(--bg-surface)" : "var(--bg-elevated)",
                          color: active ? "var(--blue)" : locked ? "var(--text-muted)" : "var(--text-secondary)",
                          textAlign: "left", cursor: locked ? "default" : "pointer",
                          transition: "all 0.15s", opacity: locked ? 0.65 : 1,
                          position: "relative",
                        }}
                      >
                        <div style={{ fontSize: "16px", marginBottom: "3px" }}>{t.icon}</div>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>{t.label}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{t.desc}</div>
                        {locked && (
                          <span style={{
                            position: "absolute", top: "8px", right: "8px",
                            fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em",
                            background: "rgba(167,139,250,0.15)", color: "#a78bfa",
                            borderRadius: "4px", padding: "2px 5px",
                          }}>
                            {planLabel(t.minPlan)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {!canUseDocType(docType) && (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                    Uploading files requires a Pro or Max plan.{" "}
                    <a href="/pricing" style={{ color: "var(--blue)", textDecoration: "none" }}>Upgrade →</a>
                  </p>
                )}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--blue)" : files.length ? "rgba(79,142,247,0.4)" : "var(--border)"}`,
                borderRadius: "1.125rem", padding: "2.5rem 1.5rem", textAlign: "center",
                cursor: "pointer", background: dragging ? "rgba(79,142,247,0.04)" : "transparent",
                transition: "all 0.2s", marginBottom: "1.25rem",
              }}
            >
              <input
                ref={fileRef} type="file" accept=".pdf,.txt" multiple style={{ display: "none" }}
                onChange={e => e.target.files && addFiles(e.target.files)}
              />
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                {files.length ? "📂" : "⬆️"}
              </div>
              {files.length > 0 ? (
                <div>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      fontSize: "12px", color: "var(--text-secondary)",
                      background: "var(--bg-elevated)", border: "1px solid var(--border)",
                      borderRadius: "6px", padding: "4px 10px", margin: "3px",
                    }}>
                      📄 {f.name}
                      <button
                        onClick={ev => { ev.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)); }}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, fontSize: "12px" }}
                      >×</button>
                    </div>
                  ))}
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                    Click to add more (max 5 files)
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Drop PDF files here or click to browse
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    PDF · TXT · Up to 5 files at once
                  </p>
                </>
              )}
            </div>

            {/* Upload button + progress */}
            <AnimatePresence mode="wait">
              {status === "uploading" ? (
                <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ height: "4px", borderRadius: "4px", background: "var(--border)", overflow: "hidden", marginBottom: "8px" }}>
                    <motion.div
                      animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
                      style={{ height: "100%", background: "linear-gradient(90deg,#4f8ef7,#a78bfa)", borderRadius: "4px" }}
                    />
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                    Proffy is reading your material... extracting and indexing ({progress}%)
                  </p>
                </motion.div>
              ) : status === "success" && result ? (
                <motion.div key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "1rem", padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "18px" }}>✅</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--green)" }}>
                      Uploaded and indexed — {result.chunkCount} searchable chunks
                    </span>
                  </div>
                  {result.patterns.length > 0 && (
                    <>
                      <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                        {selectedCourse?.professor ? `Prof. ${selectedCourse.professor} always asks` : "Professor patterns detected"}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {result.patterns.map(p => (
                          <div key={p.topic}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>{p.topic}</span>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.pct}%</span>
                            </div>
                            <div style={{ height: "3px", borderRadius: "3px", background: "var(--border)", overflow: "hidden" }}>
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                                transition={{ duration: 0.7, delay: 0.1 }}
                                style={{ height: "100%", background: "var(--blue)", borderRadius: "3px" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => { setFiles([]); setStatus("idle"); setResult(null); }}
                    style={{ marginTop: "12px", padding: "8px 16px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}
                  >
                    Upload more
                  </button>
                </motion.div>
              ) : (
                <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {error && <p style={{ fontSize: "12px", color: "var(--red)", marginBottom: "8px", textAlign: "center" }}>{error}</p>}
                  <button
                    onClick={upload}
                    disabled={!files.length || !courseId || !canUseDocType(docType)}
                    style={{
                      width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                      background: files.length && courseId && canUseDocType(docType)
                        ? "linear-gradient(135deg,#4f8ef7,#a78bfa)"
                        : "var(--bg-elevated)",
                      color: files.length && courseId && canUseDocType(docType) ? "#fff" : "var(--text-muted)",
                      fontSize: "14px", fontWeight: 700,
                      cursor: files.length && courseId && canUseDocType(docType) ? "pointer" : "not-allowed",
                      transition: "all 0.2s",
                    }}
                  >
                    {docType === "exam" ? "Upload & extract professor patterns" : "Upload & index"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ── Drive tab ── */
          <motion.div key="drive" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Course selector */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "1.125rem", padding: "1.5rem" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                Course
              </label>
              <select value={courseId} onChange={e => setCourseId(e.target.value)} style={inputStyle}>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.professor ? ` — ${c.professor}` : ""}</option>
                ))}
              </select>
            </div>

            {/* Steps */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "1.125rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                Share any Google Drive folder with Proffy — slides, past exams, notes — and it will be indexed automatically. Read-only access, safe and secure.
              </p>

              {/* Step 1 — copy email */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Step 1 — Copy the Proffy service account email
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <code style={{
                    flex: 1, padding: "9px 12px", borderRadius: "9px",
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    fontSize: "12px", color: "var(--text-primary)", overflowX: "auto", whiteSpace: "nowrap",
                  }}>
                    {serviceAccountEmail || "—"}
                  </code>
                  <button
                    onClick={copyEmail}
                    disabled={!serviceAccountEmail}
                    style={{
                      padding: "9px 14px", borderRadius: "9px",
                      border: "1px solid var(--border)", background: copied ? "rgba(79,142,247,0.1)" : "var(--bg-elevated)",
                      color: copied ? "var(--blue)" : "var(--text-secondary)",
                      fontSize: "12px", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Step 2 — share instructions */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Step 2 — Share the folder in Google Drive
                </p>
                <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "5px" }}>
                  {[
                    "Open Google Drive (drive.google.com)",
                    "Right-click the folder with your course material → Share",
                    "In the \"Add people\" field, paste the email above",
                    "Set the role to Viewer",
                    "Click Send",
                  ].map((step, i) => (
                    <li key={i} style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55 }}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Step 3 — paste URL */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Step 3 — Paste the folder URL
                </p>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveUrl}
                  onChange={e => setDriveUrl(e.target.value)}
                  style={{ ...inputStyle, marginBottom: "8px" }}
                />
                <input
                  type="text"
                  placeholder="Note (optional) — e.g. 'Prof. Cohen slides 2024'"
                  value={driveNote}
                  onChange={e => setDriveNote(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Submit */}
            <AnimatePresence mode="wait">
              {driveStatus === "success" ? (
                <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "1rem", padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "18px" }}>✅</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--green)" }}>
                      Folder queued for ingestion
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                    The platform team will index it shortly. Once done, Proffy will answer directly from your material.
                  </p>
                  <button
                    onClick={() => { setDriveUrl(""); setDriveNote(""); setDriveStatus("idle"); }}
                    style={{ marginTop: "12px", padding: "8px 16px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}
                  >
                    Submit another folder
                  </button>
                </motion.div>
              ) : (
                <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {driveError && <p style={{ fontSize: "12px", color: "var(--red)", marginBottom: "8px", textAlign: "center" }}>{driveError}</p>}
                  <button
                    onClick={submitDrive}
                    disabled={!driveUrl.trim() || !courseId || driveStatus === "submitting"}
                    style={{
                      width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                      background: driveUrl.trim() && courseId ? "linear-gradient(135deg,#4f8ef7,#a78bfa)" : "var(--bg-elevated)",
                      color: driveUrl.trim() && courseId ? "#fff" : "var(--text-muted)",
                      fontSize: "14px", fontWeight: 700,
                      cursor: driveUrl.trim() && courseId ? "pointer" : "not-allowed",
                      transition: "all 0.2s",
                    }}
                  >
                    {driveStatus === "submitting" ? "Submitting…" : "Submit folder for ingestion"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "1.5rem", lineHeight: 1.7 }}>
        Files are processed by AI and stored securely on Israeli infrastructure.
        Hebrew handwriting in scanned exams is supported.
      </p>
    </div>
  );
}
