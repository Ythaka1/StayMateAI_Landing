"use client";

import { forwardRef } from "react";
import { BACK_FACE_LINES } from "./textures";

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

/**
 * Beat 1, the hero.
 *
 * Not a line adrift in a void any more. The card stands in a photographed
 * room (see HeroPlate) and this is the type set into it: the wordmark held
 * high on the left where the lamp actually falls, and one line low on the
 * right, in the empty walnut the photograph was composed to leave.
 *
 * The two are diagonally opposed and neither is centred, so the card can
 * stand in the middle of the frame without either of them sharing pixels
 * with it. Centring anything here would put it straight through the card.
 *
 * This is the hero wordmark, not the nav mark. The floating nav is held at
 * zero for the whole time this is on screen and only comes up once it has
 * gone; the two are never on screen together and there is no crossfade
 * between them, because two wordmarks of different sizes dissolving into
 * each other reads as a mistake.
 */
export const HeroCopy = forwardRef<HTMLDivElement>(function HeroCopy(_, ref) {
  return (
    <div
      ref={ref}
      className={[
        "absolute inset-0 px-8 py-10 sm:px-14 sm:py-14",
        "pointer-events-none select-none opacity-0",
        "motion-reduce:static motion-reduce:opacity-100",
        "motion-reduce:min-h-[70svh] motion-reduce:py-24",
      ].join(" ")}
      data-copy="hero"
    >
      {/*
        The entrance is a CSS animation on the children, not a scroll-driven
        fade on the layer: this has to play on load, and the layer's opacity
        belongs to the scroll handler.
      */}
      <h1 className="animate-hero-in font-display text-[clamp(2.6rem,7.6vw,6rem)] font-normal leading-none tracking-[0.14em] text-paper/95">
        STAYMATE
      </h1>

      {/* Lower right, offset from the card. text-paper at low alpha rather
          than text-muted: muted is a colour for cream surfaces and on walnut
          it turns to mud. */}
      <p
        className={[
          "absolute bottom-[16svh] right-8 max-w-[19rem] text-right sm:right-14",
          "animate-hero-in [animation-delay:520ms]",
          "font-body text-[0.9375rem] leading-relaxed text-paper/60",
          "motion-reduce:static motion-reduce:mt-10 motion-reduce:text-left",
        ].join(" ")}
      >
        A card on the desk. A concierge behind it.
      </p>
    </div>
  );
});

/**
 * The scroll cue: a brass hairline with SCROLL set small beneath it.
 *
 * Not a bouncing chevron. It draws itself downward once, then stays, pulsing
 * so slowly that it reads as breathing rather than as blinking, and it goes
 * for good on the first scroll input. A cue that vanishes on a timer leaves
 * anyone who paused to read the hero with no invitation at all; a cue that
 * bounces forever is the page nagging. This waits, quietly, until it has been
 * answered.
 *
 * It lives in its own layer rather than inside HeroCopy because that layer's
 * opacity is written every frame from the scroll handler, and multiplying a
 * CSS animation against a scroll-driven opacity makes the timing impossible
 * to reason about. `data-gone` is set once, from Stage, on the first input.
 *
 * Hidden entirely under reduced motion: the drawing *is* the message, and a
 * static hairline with a word under it is just a stray rule.
 */
export function ScrollCue({ ref }: { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-x-0 bottom-[5svh]",
        "flex flex-col items-center gap-3",
        "transition-opacity duration-700 data-[gone=true]:opacity-0",
        "motion-reduce:hidden",
      ].join(" ")}
      data-copy="cue"
      data-gone="false"
    >
      <span className="animate-rule-draw block h-[6svh] w-px bg-gradient-to-b from-brass/0 via-brass/70 to-brass/70" />
      <span className="animate-cue-pulse font-body text-[0.625rem] uppercase tracking-[0.34em] text-paper/45">
        Scroll
      </span>
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

        {/*
          The card's back, for anyone who will never see it turn.

          Under reduced motion there is no WebGL at all, so the flip and the
          line that fades onto the settled card do not exist. The line still
          has to: it is the concierge's first reply and the point of the whole
          beat. Set here as a quiet static block instead, in the display face,
          the way it is set on the card itself.
        */}
        <div className="mt-10 hidden motion-reduce:block">
          <p className="font-display text-[1rem] leading-snug text-paper/50">
            {BACK_FACE_LINES[0]}
          </p>
          <p className="mt-2 font-display text-[1.15rem] leading-snug text-paper/85">
            {BACK_FACE_LINES[1]}
          </p>
        </div>
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
