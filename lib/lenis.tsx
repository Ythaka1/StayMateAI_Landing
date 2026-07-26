"use client";

import { useEffect } from "react";
import Lenis from "lenis";

let current: Lenis | null = null;

/** The active Lenis instance, or null (reduced motion / not yet mounted). */
export function getLenis(): Lenis | null {
  return current;
}

/**
 * Mounts Lenis for scroll normalisation. Renders nothing. Skipped entirely
 * under prefers-reduced-motion — that path is plain native scrolling.
 * Never preventDefaults wheel/touch; Lenis only smooths the value.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.12 });
    current = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      current = null;
    };
  }, []);

  return null;
}
