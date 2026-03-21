"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Course } from "@/lib/types";

interface Props {
  courses: Course[];
}

type DocType = "slides" | "exam" | "notes" | "textbook";
type UploadStatus = "idle" | "uploading" | "success" | "error";

const DOC_TYPES: { value: DocType; label: string; icon: string; desc: string }[] = [
  { value: "exam",      label: "Past exam",       icon: "📝", desc: "AI extracts professor patterns" },
  { value: "slides",    label: "Lecture slides",  icon: "📊", desc: "Answers grounded in your slides" },
  { value: "notes",     label: "Study notes",     icon: "📖", desc: "Searchable by Proffy" },
  { value: "textbook",  label: "Textbook chapter", icon: "📚", desc: "Reference material" },
];

export default function UploadClient({ courses }: Props) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [docType, setDocType] = useState<DocType>("slides");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ chunkCount: number; patterns: { topic: string; pct: number }[] } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Upload material
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
          Upload past exams for{" "}
          <span style={{ color: "var(--blue)" }}>professor fingerprinting</span>
          {" "}— Proffy learns what your professor always asks.
          Slides and notes become searchable with exact citations.
        </p>
      </motion.div>

      {/* Course + type selectors */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "1.125rem",
          padding: "1.5rem",
          marginBottom: "1.25rem",
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
            {DOC_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setDocType(t.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: `1px solid ${docType === t.value ? "rgba(79,142,247,0.5)" : "var(--border)"}`,
                  background: docType === t.value ? "rgba(79,142,247,0.08)" : "var(--bg-elevated)",
                  color: docType === t.value ? "var(--blue)" : "var(--text-secondary)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "16px", marginBottom: "3px" }}>{t.icon}</div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>{t.label}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--blue)" : files.length ? "rgba(79,142,247,0.4)" : "var(--border)"}`,
          borderRadius: "1.125rem",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(79,142,247,0.04)" : "transparent",
          transition: "all 0.2s",
          marginBottom: "1.25rem",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          multiple
          style={{ display: "none" }}
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
      </motion.div>

      {/* Upload button + progress */}
      <AnimatePresence mode="wait">
        {status === "uploading" ? (
          <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ height: "4px", borderRadius: "4px", background: "var(--border)", overflow: "hidden", marginBottom: "8px" }}>
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
                style={{ height: "100%", background: "linear-gradient(90deg,#4f8ef7,#a78bfa)", borderRadius: "4px" }}
              />
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
              Extracting text and indexing… {progress}%
            </p>
          </motion.div>
        ) : status === "success" && result ? (
          <motion.div key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)",
              borderRadius: "1rem", padding: "1.25rem 1.5rem",
            }}>
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
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px" }}>
                  These patterns are now shown in the right panel while studying.
                </p>
              </>
            )}

            <button
              onClick={() => { setFiles([]); setStatus("idle"); setResult(null); }}
              style={{
                marginTop: "12px", padding: "8px 16px", borderRadius: "8px",
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer",
              }}
            >
              Upload more
            </button>
          </motion.div>
        ) : (
          <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {error && (
              <p style={{ fontSize: "12px", color: "var(--red)", marginBottom: "8px", textAlign: "center" }}>{error}</p>
            )}
            <button
              onClick={upload}
              disabled={!files.length || !courseId}
              style={{
                width: "100%", padding: "13px",
                borderRadius: "12px", border: "none",
                background: files.length && courseId
                  ? "linear-gradient(135deg,#4f8ef7,#a78bfa)"
                  : "var(--bg-elevated)",
                color: files.length && courseId ? "#fff" : "var(--text-muted)",
                fontSize: "14px", fontWeight: 700, cursor: files.length && courseId ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              {docType === "exam" ? "Upload & extract professor patterns" : "Upload & index"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info footer */}
      <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "1.5rem", lineHeight: 1.7 }}>
        Files are processed by AI and stored securely on Israeli infrastructure.
        Hebrew handwriting in scanned exams is supported.
      </p>
    </div>
  );
}
