"use client";
import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/cn";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
} from "framer-motion";

interface InfiniteGridProps {
  className?: string;
  /** Reveal radius in px */
  revealRadius?: number;
  /** Grid cell size in px */
  cellSize?: number;
  /** Scroll speed (px per frame) */
  speed?: number;
}

const GridPattern = ({
  offsetX,
  offsetY,
  cellSize,
  id,
}: {
  offsetX: any;
  offsetY: any;
  cellSize: number;
  id: string;
}) => (
  <svg className="w-full h-full">
    <defs>
      <motion.pattern
        id={id}
        width={cellSize}
        height={cellSize}
        patternUnits="userSpaceOnUse"
        x={offsetX}
        y={offsetY}
      >
        <path
          d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </motion.pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
);

export function InfiniteGrid({
  className,
  revealRadius = 320,
  cellSize = 40,
  speed = 0.4,
}: InfiniteGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + speed) % cellSize);
    gridOffsetY.set((gridOffsetY.get() + speed) % cellSize);
  });

  // Track mouse globally so sections with z-index don't block the events
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const { left, top } = el.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  const maskImage = useMotionTemplate`radial-gradient(${revealRadius}px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
    >
      {/* Static dim layer */}
      <div className="absolute inset-0 opacity-10 text-white">
        <GridPattern id="grid-static" offsetX={gridOffsetX} offsetY={gridOffsetY} cellSize={cellSize} />
      </div>

      {/* Mouse-revealed bright layer */}
      <motion.div
        className="absolute inset-0 opacity-50 text-white"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern id="grid-reveal" offsetX={gridOffsetX} offsetY={gridOffsetY} cellSize={cellSize} />
      </motion.div>
    </div>
  );
}
