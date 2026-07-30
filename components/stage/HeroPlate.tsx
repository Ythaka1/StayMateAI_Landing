"use client";

import Image from "next/image";
import { forwardRef } from "react";

/*
 * The hero's photographic plate: the room the card stands in.
 *
 * ── Where this sits ──────────────────────────────────────────────────────
 * Two fixed layers underneath the WebGL canvas, which since pass 06 is
 * transparent. Back to front the hero is now:
 *
 *   z-0   desk.png, scaled a little past the viewport
 *   z-0   the lamp gradient and the vignette
 *   z-[1] the canvas, with the card standing in it
 *   z-10  the document, and all the DOM copy
 *
 * Fixed rather than inside the descent segment, because the canvas it has to
 * sit behind is itself fixed, and two fixed layers are the only arrangement
 * where the plate cannot slide out from under the card. Stage drives its
 * opacity: full while the card is in the room, gone by the time the camera
 * converges on the pivot, and never painted at all once another segment owns
 * the frame.
 *
 * ── The scaling ──────────────────────────────────────────────────────────
 * 106%, centred. That is the parallax headroom: the plate travels up to about
 * 10px against the cursor, and without the overscale a 10px shift would drag
 * the photograph's edge into frame.
 *
 * ── First paint ──────────────────────────────────────────────────────────
 * desk.png is 1.9MB and it is the first thing on the page, so it must not be
 * what the first frame waits for. Three things handle that: a solid tone
 * underneath in the right key, so the hero reads correctly before the
 * photograph arrives; `priority`, so next/image preloads it rather than
 * lazy-loading the largest thing above the fold; and a blurred placeholder
 * inlined as a data URI, so the transition is a photograph resolving rather
 * than a rectangle appearing.
 */

/**
 * Tiny blurred stand-in for desk.png. Not generated from the file at build
 * time (that needs a static import, which would put the 1.9MB decode on the
 * server render) but hand-matched to its key: warm lamp upper-left, walnut
 * falling to near-black on the right.
 */
const DESK_BLUR =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10">
      <filter id="b"><feGaussianBlur stdDeviation="3"/></filter>
      <rect width="16" height="10" fill="#0b0906"/>
      <ellipse cx="2" cy="2.5" rx="5" ry="4" fill="#6b4f28" filter="url(#b)"/>
      <ellipse cx="5" cy="6" rx="6" ry="4" fill="#3a281a" filter="url(#b)"/>
    </svg>`
  ).toString("base64");

export const HeroPlate = forwardRef<
  HTMLDivElement,
  { gradientRef: React.Ref<HTMLDivElement>; plateRef: React.Ref<HTMLDivElement> }
>(function HeroPlate({ gradientRef, plateRef }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-night opacity-0 tier-static:opacity-100"
      data-hero="plate"
    >
      {/* The photograph. */}
      <div
        ref={plateRef}
        className="absolute inset-0 will-change-transform"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        <Image
          src="/media/desk.png"
          alt=""
          fill
          sizes="106vw"
          priority
          placeholder="blur"
          blurDataURL={DESK_BLUR}
          className="scale-[1.06] object-cover object-[35%_center]"
        />
      </div>

      {/*
        The lamp, and the vignette. One element, two gradients: the warm pool
        from upper-left where the photograph's lamp actually is, and a radial
        darkening that closes the corners so the wordmark and the line have
        somewhere to sit.

        It breathes: 3% of intensity over 8 seconds. Almost imperceptible, and
        entirely the point. A completely static frame reads as a screenshot,
        and the one thing a hero must not read as is a screenshot.
      */}
      <div
        ref={gradientRef}
        className="absolute -inset-8 animate-lamp-breathe will-change-transform"
        style={{
          transform: "translate3d(0,0,0)",
          background: [
            "radial-gradient(48% 46% at 16% 12%, rgba(196,150,86,0.24) 0%, rgba(196,150,86,0.10) 42%, rgba(196,150,86,0) 72%)",
            "radial-gradient(120% 105% at 50% 45%, rgba(11,12,14,0) 32%, rgba(11,12,14,0.55) 76%, rgba(11,12,14,0.86) 100%)",
          ].join(","),
        }}
      />
    </div>
  );
});
