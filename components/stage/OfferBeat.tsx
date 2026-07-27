"use client";

import { forwardRef } from "react";

/*
 * Beat 6 — the close. The pilot offer, over the fan.
 *
 * The fan is dealt across the lower frame, so this sits in the upper half and
 * the two never share pixels. One button, and nothing else to click.
 */

/** SWAP SEAM — placeholder number. Replace with the property-facing line. */
export const WHATSAPP_NUMBER = "10000000000";
export const WHATSAPP_HREF =
  `https://wa.me/${WHATSAPP_NUMBER}?text=` +
  encodeURIComponent("I'd like to try the StayMate 30-day pilot.");

const TERMS = [
  "You send a menu and a room list.",
  "We print the cards and deliver them.",
  "Your staff learn one screen.",
  "After thirty days you keep it, or take the cards out.",
];

export const OfferBeat = forwardRef<HTMLDivElement>(function OfferBeat(_, ref) {
  return (
    <div
      ref={ref}
      className={[
        "absolute inset-0 flex flex-col items-center px-6 pt-[9svh] sm:px-10",
        "opacity-0 pointer-events-none",
        "motion-reduce:static motion-reduce:opacity-100",
        "motion-reduce:pointer-events-auto motion-reduce:bg-night",
        "motion-reduce:py-24 motion-reduce:pt-24",
      ].join(" ")}
      data-copy="offer"
    >
      <div className="mx-auto w-full max-w-[34rem] text-center">
        <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
          The pilot
        </p>
        <h2 className="mt-5 font-display text-[clamp(1.7rem,5.6vw,2.5rem)] leading-tight tracking-[-0.015em] text-paper">
          Thirty days, free. No contract, no card.
        </h2>

        <ul className="mx-auto mt-7 max-w-[26rem] space-y-2.5 text-left">
          {TERMS.map((t) => (
            <li
              key={t}
              className="flex gap-3 font-body text-[0.9375rem] leading-relaxed text-paper/65"
            >
              <span aria-hidden="true" className="mt-[0.55em] h-px w-3 shrink-0 bg-brass" />
              {t}
            </li>
          ))}
        </ul>

        {/* The only button on the site. */}
        <a
          href={WHATSAPP_HREF}
          className="pointer-events-auto mt-9 inline-block rounded-full bg-felt px-7 py-3 font-body text-[0.875rem] font-medium tracking-wide text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          Start the pilot on WhatsApp
        </a>
      </div>
    </div>
  );
});
