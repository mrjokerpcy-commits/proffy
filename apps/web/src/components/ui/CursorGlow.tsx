"use client";
import { useEffect, useRef } from "react";

// Smooth glowing blue circle cursor.
// Uses `pointermove` (not mousemove) so it tracks correctly during click-drag.
// Snaps instantly on pointerdown so it doesn't lag while holding a click.
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -999, y: -999 });
  const cur = useRef({ x: -999, y: -999 });
  const dragging = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    function onPointerMove(e: PointerEvent) {
      pos.current = { x: e.clientX, y: e.clientY };

      // Hover expand on interactive elements
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const isHover = !!target?.closest("a, button, [role='button'], input, textarea, select, label");
      el.classList.toggle("hovering", isHover);
    }

    function onPointerDown(e: PointerEvent) {
      dragging.current = true;
      // Snap immediately so it doesn't lag during drag
      cur.current = { x: e.clientX, y: e.clientY };
      pos.current = { x: e.clientX, y: e.clientY };
    }

    function onPointerUp() {
      dragging.current = false;
    }

    function loop() {
      // Faster lerp when dragging to avoid stuck feeling
      const lerpFactor = dragging.current ? 1 : 0.2;
      cur.current.x += (pos.current.x - cur.current.x) * lerpFactor;
      cur.current.y += (pos.current.y - cur.current.y) * lerpFactor;
      el.style.transform = `translate3d(${cur.current.x}px, ${cur.current.y}px, 0)`;
      rafRef.current = requestAnimationFrame(loop);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <div id="cursor-glow" ref={glowRef} aria-hidden="true" />;
}
