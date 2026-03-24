"use client";
import { useEffect, useRef, useState } from "react";

// Smooth glowing blue circle cursor.
// Uses `pointermove` (not mousemove) so it tracks correctly during click-drag.
// Snaps instantly on pointerdown so it doesn't lag while holding a click.
// Hidden on touch/mobile devices where there is no cursor.
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -999, y: -999 });
  const cur = useRef({ x: -999, y: -999 });
  const dragging = useRef(false);
  const rafRef = useRef<number>(0);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) {
      setIsTouch(true);
      return;
    }
    const el = glowRef.current;
    if (!el) return;

    function onPointerMove(e: PointerEvent) {
      pos.current = { x: e.clientX, y: e.clientY };
      el!.style.opacity = "1";

      // Hover expand on interactive elements
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const isHover = !!target?.closest("a, button, [role='button'], input, textarea, select, label");
      el!.classList.toggle("hovering", isHover);
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

    function onScroll() {
      // Hide glow on any scroll — native scrollbar doesn't fire pointerdown
      el!.style.opacity = "0";
    }

    function loop() {
      // Faster lerp when dragging to avoid stuck feeling
      const lerpFactor = dragging.current ? 1 : 0.2;
      cur.current.x += (pos.current.x - cur.current.x) * lerpFactor;
      cur.current.y += (pos.current.y - cur.current.y) * lerpFactor;
      el!.style.transform = `translate3d(${cur.current.x}px, ${cur.current.y}px, 0)`;
      rafRef.current = requestAnimationFrame(loop);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (isTouch) return null;
  return <div id="cursor-glow" ref={glowRef} aria-hidden="true" />;
}
