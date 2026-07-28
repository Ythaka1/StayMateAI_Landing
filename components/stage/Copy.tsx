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
 * The scroll cue — a brass hairline that draws itself downward, once.
 *
 * Not a bouncing chevron. A chevron repeats forever, which reads as the page
 * nagging; this happens a single time under the opening line, says there is
 * more below, and is gone. It never returns, including on scroll-back, and
 * under reduced motion it is not shown at all — the animation *is* the
 * message, and a static hairline under the copy would just be a stray rule.
 *
 * It sits in its own layer rather than inside DarknessCopy because that
 * layer's opacity is written every frame from the scroll handler, which would
 * multiply against the CSS fade and make the timing impossible to reason
 * about.
 */
export function ScrollCue() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-[6svh] flex justify-center motion-reduce:hidden"
      data-copy="cue"
    >
      <span className="animate-rule-draw block h-[7svh] w-px bg-gradient-to-b from-brass/0 via-brass/70 to-brass/0" />
    </div>
  );
}

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
          A guest scans it, and asks for whatever they need.
        </h2>
        <p className="mt-4 font-body text-[0.9375rem] leading-relaxed text-paper/60">
          StayMate answers, takes the booking, and puts it on the room. At any
          hour, with nobody at the desk.
        </p>
        {/*
          The line naming German has been removed. Section 6 turns the same
          question through eight languages, which makes the point without
          picking one, and naming a single language quietly undersells what
          the thing does.
        */}
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
          The same card, printed once for each room. Nothing to install,
          nothing fixed to a wall, and nothing for housekeeping to put on
          charge overnight.
        </p>
      </div>
    </div>
  );
});
