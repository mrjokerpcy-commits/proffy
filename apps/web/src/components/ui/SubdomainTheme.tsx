"use client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { SubdomainKey } from "@/lib/constants";

// ─── Subdomain detection ──────────────────────────────────────────────────────
export function getSubdomain(): SubdomainKey {
  if (typeof window === "undefined") return "root";
  const host = window.location.hostname;
  if (host.startsWith("uni.") || host.startsWith("app.")) return "app";
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

// ─── Background: yael.proffy.study — full-page diagonal S ribbon ─────────────
function WaveBg() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* Layer 1 — wide filled S ribbon, slow vertical breathe */}
      <motion.div
        style={{ position: "absolute", inset: 0 }}
        animate={{ y: [0, -50, 0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="sg1" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%"   stopColor="rgba(245,158,11,0.22)" />
              <stop offset="50%"  stopColor="rgba(245,158,11,0.14)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0.02)" />
            </linearGradient>
          </defs>
          {/* Diagonal S ribbon from bottom-left to top-right */}
          <path
            d="M -200 1100
               C  100  900,  400  740,  720  540
               C 1040  340, 1340  180, 1640 -100
               L 1820 -100
               C 1520  180, 1220  340,  900  540
               C  580  740,  280  900,  -20 1100 Z"
            fill="url(#sg1)"
          />
        </svg>
      </motion.div>

      {/* Layer 2 — narrower ribbon, opposite phase */}
      <motion.div
        style={{ position: "absolute", inset: 0 }}
        animate={{ y: [40, 0, 40, 0, 40] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M -200 1000
               C  100  800,  500  640,  720  470
               C  940  300, 1340  140, 1640  -60
               L 1720  -60
               C 1420  140, 1020  300,  800  470
               C  580  640,  180  800, -120 1000 Z"
            fill="rgba(245,158,11,0.08)"
          />
        </svg>
      </motion.div>

      {/* Layer 3 — thin bright S stroke edge, slight horizontal drift */}
      <motion.div
        style={{ position: "absolute", inset: 0 }}
        animate={{ x: [0, 18, 0, -18, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M -200 1050
               C  100  850,  400  700,  720  510
               C 1040  320, 1340  170, 1640  -80"
            stroke="rgba(245,158,11,0.45)"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </motion.div>
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
