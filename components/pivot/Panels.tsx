"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/*
 * The four horizontal panels — the guest journey, seen as the app.
 * Placeholder content this pass: flat cards, real copy, no images.
 * These get replaced later; the shell (Panel) is what's load-bearing.
 */

const rise = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0 },
};

const transition = { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] as const };

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-body text-[0.6875rem] uppercase tracking-[0.18em] text-brass">
      {children}
    </p>
  );
}

/**
 * One panel of the horizontal track. Focusable so keyboard users can tab
 * through the journey; onFocusPanel scrolls the page to bring it in.
 */
export function Panel({
  index,
  active,
  label,
  onFocusPanel,
  children,
}: {
  index: number;
  active: boolean;
  label: string;
  onFocusPanel: (index: number) => void;
  children: ReactNode;
}) {
  return (
    <section
      tabIndex={0}
      aria-label={label}
      onFocus={() => onFocusPanel(index)}
      className={[
        "relative flex w-1/4 shrink-0 flex-col justify-center",
        "h-full px-6 outline-none",
        "focus-visible:ring-2 focus-visible:ring-felt/50 focus-visible:ring-inset",
        // Reduced motion: stacked full-width static sections.
        "motion-reduce:h-auto motion-reduce:w-full",
        "motion-reduce:border-t motion-reduce:border-brass/20",
        "motion-reduce:py-20 sm:px-10",
      ].join(" ")}
    >
      <motion.div
        className="mx-auto w-full max-w-[26rem]"
        variants={rise}
        initial="hidden"
        animate={active ? "shown" : "hidden"}
        transition={transition}
      >
        {children}
      </motion.div>
    </section>
  );
}

export function PanelQuestion() {
  return (
    <>
      <Eyebrow>Room 214 · 6:48pm</Eyebrow>
      <h2 className="mt-5 font-display text-[clamp(1.9rem,7vw,2.75rem)] leading-[1.12] tracking-[-0.015em] text-ink">
        “What’s good for dinner tonight?”
      </h2>
      <p className="mt-6 max-w-[22rem] font-body text-[0.9375rem] leading-relaxed text-muted">
        Typed four seconds after scanning the card on the desk. No app to
        download, no front desk to call.
      </p>
    </>
  );
}

export function PanelAnswer() {
  const dishes = [
    {
      name: "Swahili fish curry",
      note: "Red snapper, coconut, tamarind. From the coast menu.",
      price: "KES 1,850",
    },
    {
      name: "Charcoal nyama choma",
      note: "Goat ribs, kachumbari, ugali. About 25 minutes.",
      price: "KES 2,400",
    },
  ];
  return (
    <>
      <Eyebrow>StayMate</Eyebrow>
      <p className="mt-5 font-display text-[clamp(1.25rem,4.6vw,1.6rem)] leading-snug text-ink">
        Two things the kitchen is doing well tonight.
      </p>
      <ul className="mt-7 space-y-3">
        {dishes.map((d) => (
          <li
            key={d.name}
            className="rounded-xl border border-brass/20 bg-paper-2 p-4"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-body text-[0.9375rem] font-medium text-ink">
                {d.name}
              </span>
              <span className="shrink-0 font-body text-sm font-semibold tabular-nums text-felt">
                {d.price}
              </span>
            </div>
            <p className="mt-1.5 font-body text-[0.8125rem] leading-relaxed text-muted">
              {d.note}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PanelOffer() {
  return (
    <>
      <Eyebrow>Because you landed at 4am</Eyebrow>
      <div className="mt-5 rounded-2xl border border-brass/20 bg-paper-2 p-5 sm:p-6">
        <h3 className="font-display text-[clamp(1.3rem,4.8vw,1.65rem)] leading-tight text-ink">
          Deep tissue massage, 60 minutes
        </h3>
        <p className="mt-2 font-body text-[0.875rem] leading-relaxed text-muted">
          Spa on the second floor. One slot left at 8:00pm, after dinner.
        </p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="font-body text-lg font-semibold tabular-nums text-felt">
            KES 4,500
          </span>
          <button
            type="button"
            className="rounded-full bg-felt px-5 py-2.5 font-body text-[0.8125rem] font-medium tracking-wide text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-felt"
          >
            Add to my stay
          </button>
        </div>
      </div>
      <p className="mt-4 font-body text-[0.8125rem] text-muted">
        Charged to room 214. Nobody had to ask.
      </p>
    </>
  );
}

export function PanelConfirmation() {
  const rows = [
    ["Table for two", "7:30pm"],
    ["Massage, spa", "8:00pm"],
    ["Room", "214"],
  ];
  return (
    <>
      <Eyebrow>Confirmed</Eyebrow>
      <h2 className="mt-5 font-display text-[clamp(2.2rem,9vw,3.25rem)] leading-none tracking-[-0.02em] text-ink">
        Booked.
      </h2>
      <dl className="mt-7 divide-y divide-brass/20 border-y border-brass/20">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between py-3">
            <dt className="font-body text-[0.875rem] text-muted">{k}</dt>
            <dd className="font-body text-[0.9375rem] font-medium tabular-nums text-ink">
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 font-body text-[0.8125rem] leading-relaxed text-muted">
        Added to the room account. The whole exchange took ninety seconds and
        no staff time at all.
      </p>
    </>
  );
}

export const PANELS = [
  { label: "The question", Body: PanelQuestion },
  { label: "The answer", Body: PanelAnswer },
  { label: "The offer", Body: PanelOffer },
  { label: "The confirmation", Body: PanelConfirmation },
] as const;
