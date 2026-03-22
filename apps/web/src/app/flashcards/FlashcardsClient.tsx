"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Course } from "@/lib/types";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  review_count: number;
}

interface Props {
  courses: Course[];
  initialCards: Flashcard[];
  courseId: string | null;
  totalCounts: Record<string, number>;
  onCourseChange?: (courseId: string) => void;
}

const RATINGS = [
  { q: 0, label: "Blackout",  bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)",   color: "var(--red)" },
  { q: 2, label: "Hard",      bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.3)",  color: "var(--amber)" },
  { q: 4, label: "Good",      bg: "rgba(79,142,247,0.10)",  border: "rgba(79,142,247,0.3)",  color: "var(--blue)" },
  { q: 5, label: "Easy",      bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.3)",  color: "var(--green)" },
];

export default function FlashcardsClient({ courses, initialCards, courseId, totalCounts, onCourseChange }: Props) {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(initialCards.length === 0);
  const [generating, setGenerating] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState(courseId ?? courses[0]?.id ?? "");
  const [generateTopic, setGenerateTopic] = useState("");

  const card = cards[index];

  useEffect(() => {
    setCards(initialCards);
    setIndex(0);
    setFlipped(false);
    setDone(initialCards.length === 0);
    setReviewed(0);
  }, [initialCards]);

  useEffect(() => {
    if (courseId !== selectedCourse) {
      if (onCourseChange) {
        onCourseChange(selectedCourse);
      } else {
        router.push(`/flashcards?courseId=${selectedCourse}`);
      }
    }
  }, [selectedCourse]);

  async function rate(quality: number) {
    if (!card) return;
    await fetch("/api/flashcards/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: card.id, quality }),
    });
    setReviewed(r => r + 1);
    const next = index + 1;
    if (next >= cards.length) {
      setDone(true);
    } else {
      setIndex(next);
      setFlipped(false);
    }
  }

  async function generateCards() {
    if (!selectedCourse) return;
    setGenerating(true);
    try {
      const resp = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedCourse, topic: generateTopic || undefined }),
      });
      const data = await resp.json();
      if (data.flashcards?.length) {
        setCards(data.flashcards);
        setIndex(0);
        setFlipped(false);
        setDone(false);
        setReviewed(0);
      }
    } finally {
      setGenerating(false);
    }
  }

  const activeCourse = courses.find(c => c.id === selectedCourse);

  return (
    <div style={{ padding: "2rem", maxWidth: "640px", margin: "0 auto", minHeight: "100%" }}>

      {/* Header + course picker */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "4px" }}>Flashcards</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Spaced repetition (SM-2) schedules your reviews automatically
          </p>
        </div>
        <select
          value={selectedCourse}
          onChange={e => setSelectedCourse(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: "10px",
            border: "1px solid var(--border)", background: "var(--bg-elevated)",
            color: "var(--text-primary)", fontSize: "13px", cursor: "pointer",
          }}
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{totalCounts[c.id] ? ` (${totalCounts[c.id]})` : ""}
            </option>
          ))}
        </select>
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "1.25rem", padding: "2.5rem", textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {reviewed > 0 ? "🎉" : "📭"}
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "8px" }}>
              {reviewed > 0 ? `Session complete — ${reviewed} cards reviewed` : "No cards due"}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              {reviewed > 0
                ? "Come back later for your next scheduled review. Spaced repetition builds long-term memory."
                : `No cards are due right now for ${activeCourse?.name ?? "this course"}.`}
            </p>

            {/* Generate new cards */}
            <div style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: "1rem", padding: "1.25rem", marginBottom: "1rem", textAlign: "left",
            }}>
              <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                Generate new cards with AI
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={generateTopic}
                  onChange={e => setGenerateTopic(e.target.value)}
                  placeholder={`Topic (e.g. AVL Trees) — or leave blank for ${activeCourse?.name ?? "course"}`}
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: "8px",
                    border: "1px solid var(--border)", background: "var(--bg-base)",
                    color: "var(--text-primary)", fontSize: "13px", outline: "none",
                  }}
                />
                <button
                  onClick={generateCards}
                  disabled={generating}
                  style={{
                    padding: "9px 16px", borderRadius: "8px", border: "none",
                    background: "linear-gradient(135deg,#4f8ef7,#a78bfa)",
                    color: "#fff", fontSize: "13px", fontWeight: 700,
                    cursor: generating ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                    opacity: generating ? 0.7 : 1,
                  }}
                >
                  {generating ? "Generating…" : "Generate 10 cards"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key={`card-${index}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {/* Progress */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {index + 1} / {cards.length}
              </span>
              <div style={{ flex: 1, height: "3px", borderRadius: "3px", background: "var(--border)", margin: "0 12px", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#4f8ef7,#a78bfa)", borderRadius: "3px", width: `${((index) / cards.length) * 100}%`, transition: "width 0.4s" }} />
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {card?.review_count === 0 ? "New" : `Review #${card?.review_count}`}
              </span>
            </div>

            {/* Card */}
            <div
              onClick={() => setFlipped(f => !f)}
              style={{
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "1.25rem", padding: "2.5rem",
                minHeight: "240px", cursor: "pointer",
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                textAlign: "center", marginBottom: "1rem", position: "relative",
                userSelect: "none",
              }}
            >
              <AnimatePresence mode="wait">
                {!flipped ? (
                  <motion.div key="front" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--blue)", marginBottom: "1rem" }}>Question</p>
                    <p style={{ fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.6, color: "var(--text-primary)" }}>{card?.front}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1.5rem" }}>Click to reveal answer</p>
                  </motion.div>
                ) : (
                  <motion.div key="back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--purple)", marginBottom: "1rem" }}>Answer</p>
                    <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--text-primary)" }}>{card?.back}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rating buttons — only after flip */}
            <AnimatePresence>
              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}
                >
                  {RATINGS.map(r => (
                    <button
                      key={r.q}
                      onClick={() => rate(r.q)}
                      style={{
                        padding: "12px 8px", borderRadius: "10px",
                        border: `1px solid ${r.border}`,
                        background: r.bg,
                        color: r.color,
                        fontSize: "12px", fontWeight: 700,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!flipped && (
              <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "8px" }}>
                Tap the card to flip
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
