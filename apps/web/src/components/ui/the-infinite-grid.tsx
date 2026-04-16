"use client";
import React, { useRef } from "react";
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
}: {
  offsetX: any;
  offsetY: any;
  cellSize: number;
}) => (
  <svg className="w-full h-full">
    <defs>
      <motion.pattern
        id="grid-pattern"
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
    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
  </svg>
);

export function InfiniteGrid({
  className,
  revealRadius = 320,
  cellSize = 40,
  speed = 0.4,
}: InfiniteGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + speed) % cellSize);
    gridOffsetY.set((gridOffsetY.get() + speed) % cellSize);
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const maskImage = useMotionTemplate`radial-gradient(${revealRadius}px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      {/* Static dim layer */}
      <div className="absolute inset-0 opacity-[0.04] text-white">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} cellSize={cellSize} />
      </div>

      {/* Mouse-revealed bright layer */}
      <motion.div
        className="absolute inset-0 opacity-30 text-white"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} cellSize={cellSize} />
      </motion.div>
    </div>
  );
}
