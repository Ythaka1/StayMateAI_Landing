"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { animate } from "framer-motion";

/*
 * Beat 5 — the money beat, and the quietest thing on the site.
 *
 * One figure on black and one line naming it. Nothing else: no card, no rule,
 * no eyebrow, no button. DOM rather than canvas, because a crisp DOM number is
 * sharper than anything that can be rendered into a texture — and because the
 * canvas is dark here and its loop is stopped.
 *
 * The figure is illustrative and says so. There is no measured result from a
 * real property yet, and the site must not imply one.
 */

/** A plausible month of ancillary revenue for a small property. */
const TARGET = 18_400;

const format = (v: number) => Math.round(v).toLocaleString("en-US");

export interface NumberBeatHandle {
  /** Start the count. Runs once and ignores every later call. */
  run(): void;
}

export const NumberBeat = forwardRef<
  HTMLDivElement,
  { countRef?: React.Ref<NumberBeatHandle> }
>(function NumberBeat({ countRef }, ref) {
  const figureRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useImperativeHandle(countRef, () => ({
    run() {
      if (started.current) return;
      started.current = true;
      const el = figureRef.current;
      if (!el) return;

      /*
       * Reduced motion: the figure, not the counting.
       *
       * A number rolling up from zero is autonomous by definition — it starts
       * on a scroll position and then runs on its own clock, which is exactly
       * what the preference is about. The beat is the figure, so the figure
       * is what stays. It is already rendered at its final value, so this is
       * simply declining to disturb it.
       *
       * Read here rather than at mount because run() fires once, on the way
       * past, and the preference may have changed since the page loaded.
       */
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = format(TARGET);
        return;
      }

      el.textContent = format(0);
      // Spring rather than a tween: it should arrive and settle, not stop
      // dead. ~1.2s, and barely any overshoot — this beat is not excitable.
      animate(0, TARGET, {
        type: "spring",
        duration: 1.2,
        bounce: 0.12,
        onUpdate: (v) => {
          el.textContent = format(v);
        },
      });
    },
  }));

  return (
    <div
      ref={ref}
      className={[
        "absolute inset-0 flex flex-col items-center justify-center px-6",
        "pointer-events-none select-none opacity-0",
        "tier-static:static tier-static:opacity-100",
        "tier-static:bg-night tier-static:py-28",
      ].join(" ")}
      data-copy="number"
    >
      {/* Rendered at its final value, so the server output and the
          reduced-motion path simply print the number rather than counting
          it. run() is what replaces it with a zero to count from, and only
          when it is going to count. */}
      <span
        ref={figureRef}
        className="font-display text-[clamp(3.25rem,13vw,6.5rem)] leading-none tracking-[-0.03em] text-paper tabular-nums"
      >
        {format(TARGET)}
      </span>
      <p className="mt-8 max-w-[28rem] text-center font-body text-[0.875rem] leading-relaxed text-paper/55">
        An illustrative month of ancillary revenue at a forty-room property, in
        whatever currency it keeps its books in. Not a measured result.
      </p>
    </div>
  );
});
