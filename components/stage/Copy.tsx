"use client";

import { forwardRef } from "react";

/*
 * The DOM copy for beats 1 and 2. These sit over the canvas and their opacity
 * is written imperatively from the scroll handler — no per-frame React state.
 *
 * In the reduced-motion fallback they become ordinary stacked sections ahead
 * of the panels, which is why every pinned-mode style has a motion-reduce:
 * counterpart rather than the tree being swapped out.
 */

const layerClass = [
  "absolute inset-0 flex flex-col px-6 sm:px-10",
  "pointer-events-none select-none",
  "motion-reduce:static motion-reduce:opacity-100 motion-reduce:bg-night",
  "motion-reduce:py-24",
].join(" ");

/** Beat 1 — one line, small, low. Nothing else on screen. */
export const DarknessCopy = forwardRef<HTMLDivElement>(function DarknessCopy(
  _,
  ref
) {
  return (
    <div
      ref={ref}
      className={`${layerClass} justify-end pb-[14svh] opacity-0 motion-reduce:justify-start`}
      data-copy="darkness"
    >
      {/* text-muted is a colour for cream surfaces; on near-black it reads as
          barely-there. Everything in these two beats is a tint of paper. */}
      <p className="mx-auto w-full max-w-[30rem] text-center font-body text-[0.9375rem] leading-relaxed text-paper/55">
        A card on the desk. That is the whole installation.
      </p>
    </div>
  );
});

/**
 * Beat 2 — what the product is, in two short lines, plus the multilingual
 * behaviour. No button: the landing is the emotional beat, not a conversion
 * point.
 */
export const DescentCopy = forwardRef<HTMLDivElement>(function DescentCopy(
  _,
  ref
) {
  return (
    <div
      ref={ref}
      className={`${layerClass} justify-end pb-[10svh] opacity-0 motion-reduce:justify-start`}
      data-copy="descent"
    >
      <div className="mx-auto w-full max-w-[34rem] text-center">
        <h2 className="font-display text-[clamp(1.35rem,4.6vw,1.85rem)] leading-snug text-paper">
          A guest scans it and asks for whatever they need.
        </h2>
        <p className="mt-4 font-body text-[0.9375rem] leading-relaxed text-paper/60">
          StayMate answers, books it, and puts it on the room — at any hour,
          without anyone at the desk.
        </p>
        <p className="mt-7 font-body text-[0.9375rem] leading-relaxed text-brass">
          Your guest writes in German. It answers in German.
        </p>
      </div>
    </div>
  );
});

/** Beat 4 — one line about the whole property, not one room. */
export const PullbackCopy = forwardRef<HTMLDivElement>(function PullbackCopy(
  _,
  ref
) {
  return (
    <div
      ref={ref}
      className={`${layerClass} justify-end pb-[9svh] opacity-0 motion-reduce:justify-start`}
      data-copy="pullback"
    >
      <div className="mx-auto w-full max-w-[34rem] text-center">
        <h2 className="font-display text-[clamp(1.35rem,4.6vw,1.85rem)] leading-snug text-paper">
          One card in every room, answering all of them at once.
        </h2>
        <p className="mt-4 font-body text-[0.9375rem] leading-relaxed text-paper/60">
          The same card, printed once per room. Nothing to install, nothing on
          the wall, nothing for housekeeping to charge overnight.
        </p>
      </div>
    </div>
  );
});
