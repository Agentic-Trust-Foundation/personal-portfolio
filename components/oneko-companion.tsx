"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const ONEKO_EVENT = "cv:oneko";
const SESSION_KEY = "hossein-cv-oneko-enabled";

/** A tiny website-only companion. Nothing can track the cursor outside this site. */
export function setOnekoEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ enabled: boolean }>(ONEKO_EVENT, {
    detail: { enabled },
  }));
}

/**
 * Adapted from the sprite directions of adryd325/oneko.js (MIT).
 * The 32px cat sprite sheet is vendored locally in public/oneko.gif.
 * No remote scripts, backend calls, or user tracking.
 */
const FRAMES: Record<string, readonly (readonly [number, number])[]> = {
  idle: [[-3, -3]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
};

function allowCatMotion(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function OnekoCompanion() {
  const [enabled, setEnabled] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const restore = window.requestAnimationFrame(() => {
      try { setEnabled(window.sessionStorage.getItem(SESSION_KEY) === "yes"); }
      catch { /* A blocked storage API should never break the CV. */ }
    });
    const control = (event: Event) => {
      const next = (event as CustomEvent<{ enabled: boolean }>).detail?.enabled;
      if (typeof next !== "boolean") return;
      setEnabled(next);
      try {
        if (next) window.sessionStorage.setItem(SESSION_KEY, "yes");
        else window.sessionStorage.removeItem(SESSION_KEY);
      } catch { /* The cat can still run without persistence. */ }
    };
    window.addEventListener(ONEKO_EVENT, control);
    return () => {
      window.cancelAnimationFrame(restore);
      window.removeEventListener(ONEKO_EVENT, control);
    };
  }, []);

  useEffect(() => {
    // Unlike Snake this applies to all Next.js routes, including /resume/.
    document.documentElement.classList.toggle("cv-oneko-enabled", enabled);
    return () => document.documentElement.classList.remove("cv-oneko-enabled");
  }, [enabled]);

  useEffect(() => {
    const cat = catRef.current;
    if (!enabled || !cat || !allowCatMotion()) return;

    let catX = 36;
    let catY = 55;
    let targetX = catX;
    let targetY = catY;
    let moved = false;
    let frame = 0;
    let resting = 0;

    const pose = (name: string, frameNumber: number) => {
      const positions = FRAMES[name] ?? FRAMES.idle;
      const [col, row] = positions[frameNumber % positions.length];
      cat.style.backgroundPosition = `${col * 32}px ${row * 32}px`;
    };
    const onMove = (event: MouseEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      moved = true;
    };
    const onResize = () => {
      catX = Math.max(16, Math.min(window.innerWidth - 16, catX));
      catY = Math.max(16, Math.min(window.innerHeight - 16, catY));
    };
    const animate = () => {
      if (document.hidden || !moved) return;
      const dx = targetX - catX;
      const dy = targetY - catY;
      const distance = Math.hypot(dx, dy);
      frame += 1;

      if (distance <= 42) {
        resting += 1;
        pose(resting > 40 ? "sleeping" : "idle", Math.floor(resting / 5));
        return;
      }
      resting = 0;
      const direction =
        (dy < -distance * 0.45 ? "N" : dy > distance * 0.45 ? "S" : "") +
        (dx < -distance * 0.45 ? "W" : dx > distance * 0.45 ? "E" : "");
      pose(direction, frame);
      const step = Math.min(10, distance - 42);
      catX = Math.max(16, Math.min(window.innerWidth - 16, catX + dx / distance * step));
      catY = Math.max(16, Math.min(window.innerHeight - 16, catY + dy / distance * step));
      cat.style.transform = `translate3d(${catX - 16}px, ${catY - 16}px, 0)`;
    };

    pose("idle", 0);
    cat.style.transform = `translate3d(${catX - 16}px, ${catY - 16}px, 0)`;
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    const timer = window.setInterval(animate, 100);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled]);

  const stop = useCallback(() => setOnekoEnabled(false), []);
  if (!enabled) return null;

  return (
    <>
      <div ref={catRef} className="cv-oneko-cat" aria-hidden="true" />
      <button className="cv-oneko-dismiss" type="button" onClick={stop}
        aria-label="Turn off Oneko and restore regular cursor"
        title="Turn off Oneko and restore regular cursor">
        <span aria-hidden="true">✕</span> Oneko
      </button>
    </>
  );
}
