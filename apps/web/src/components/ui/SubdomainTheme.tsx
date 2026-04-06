"use client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { SubdomainKey } from "@/lib/constants";

// ─── Subdomain detection ──────────────────────────────────────────────────────
export function getSubdomain(): SubdomainKey {
  if (typeof window === "undefined") return "root";
  const host = window.location.hostname;
  if (host.startsWith("app.")) return "app";
  if (host.startsWith("psycho.")) return "psycho";
  if (host.startsWith("yael.")) return "yael";
  if (host.startsWith("bagrut.")) return "bagrut";
  return "root";
}

// ─── Background: app.proffy.study — constellation canvas ─────────────────────
function ConstellationBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const nodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw edges between close nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,102,241,0.5)";
        ctx.fill();
        // Move
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.6,
      }}
    />
  );
}

// ─── Background: psycho.proffy.study — slow pulsing radial gradient ───────────
function RadialPulseBg() {
  return (
    <motion.div
      aria-hidden="true"
      animate={{
        opacity: [0.4, 0.7, 0.4],
        scale: [1, 1.08, 1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        background:
          "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(212,160,23,0.08) 0%, rgba(34,197,94,0.04) 50%, transparent 80%)",
      }}
    />
  );
}

// ─── Background: yael.proffy.study — flowing SVG wave ────────────────────────
function WaveBg() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        height: "220px",
      }}
    >
      <motion.svg
        viewBox="0 0 1440 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ width: "200%", height: "100%", display: "block" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <path
          d="M0 80 C180 20, 360 140, 540 80 C720 20, 900 140, 1080 80 C1260 20, 1440 140, 1620 80 C1800 20, 1980 140, 2160 80 L2160 220 L0 220 Z"
          fill="rgba(245,158,11,0.05)"
        />
        <path
          d="M0 120 C200 60, 400 180, 600 120 C800 60, 1000 180, 1200 120 C1400 60, 1600 180, 1800 120 C2000 60, 2200 180, 2400 120 L2400 220 L0 220 Z"
          fill="rgba(239,68,68,0.04)"
        />
      </motion.svg>
    </div>
  );
}

// ─── Background: bagrut.proffy.study — gradient mesh ─────────────────────────
function GradientMeshBg() {
  return (
    <motion.div
      aria-hidden="true"
      animate={{
        background: [
          "radial-gradient(ellipse 80% 50% at 20% 30%, rgba(139,92,246,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 70%, rgba(6,182,212,0.08) 0%, transparent 60%)",
          "radial-gradient(ellipse 80% 50% at 80% 30%, rgba(139,92,246,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 70%, rgba(6,182,212,0.08) 0%, transparent 60%)",
          "radial-gradient(ellipse 80% 50% at 50% 80%, rgba(139,92,246,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 20%, rgba(6,182,212,0.08) 0%, transparent 60%)",
          "radial-gradient(ellipse 80% 50% at 20% 30%, rgba(139,92,246,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 70%, rgba(6,182,212,0.08) 0%, transparent 60%)",
        ],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// ─── "Powered by Proffy" footer for subdomain sites ──────────────────────────
function PoweredByProffy() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "20px",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "99px",
        padding: "5px 12px 5px 8px",
        fontSize: "11px",
        color: "var(--text-muted)",
        textDecoration: "none",
        pointerEvents: "auto",
      }}
      role="complementary"
      aria-label="Powered by Proffy"
    >
      <span style={{
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        background: "linear-gradient(135deg, #fff 0%, var(--blue-hover) 60%, var(--purple) 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>
        Proffy
      </span>
      <span>·</span>
      <a
        href="https://proffy.study"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        proffy.study
      </a>
    </div>
  );
}

// ─── Main provider ────────────────────────────────────────────────────────────
export default function SubdomainTheme() {
  const [subdomain, setSubdomain] = useState<SubdomainKey>("root");

  useEffect(() => {
    const sd = getSubdomain();
    setSubdomain(sd);
    document.documentElement.setAttribute("data-subdomain", sd);
  }, []);

  if (subdomain === "root") return null;

  return (
    <>
      {subdomain === "app" && <ConstellationBg />}
      {subdomain === "psycho" && <RadialPulseBg />}
      {subdomain === "yael" && <WaveBg />}
      {subdomain === "bagrut" && <GradientMeshBg />}
      {subdomain !== "app" && <PoweredByProffy />}
    </>
  );
}
