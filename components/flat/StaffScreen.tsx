"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoField } from "./PhotoField";
import { Reveal } from "./Reveal";

/*
 * The staff screen.
 *
 * The site spent eight sections on what the guest sees and never once showed
 * what the hotel sees, which is the first thing a general manager asks and
 * the thing they are actually buying. It sits immediately after the corridor
 * and the number, so the sequence reads: here is what it does, here is what
 * it is worth, here is what it costs you to run.
 *
 * ── Static, and a demonstration ──────────────────────────────────────────
 * Every row is a literal. No fetch, no API route, no clock. The times below
 * are fixed strings rather than anything derived from Date, because a
 * marketing page whose demo data drifts with the visitor's timezone is a page
 * that reads differently in Nairobi and in New York for no reason anybody
 * chose.
 *
 * ── One row arrives ──────────────────────────────────────────────────────
 * The top row springs in from above as the section enters, once, and then the
 * panel is still. That is the whole animation, and it is doing a specific
 * job: it is the difference between a screenshot of a queue and a queue that
 * things arrive into. A panel where every row animated would be a dashboard
 * showing off; one row is a request coming in while you look at it.
 */

type Row = {
  room: string;
  request: string;
  at: string;
  /** Bare figure, in the property's own currency. Absent where there is none. */
  value?: string;
  /** Marked for a person rather than answered by the concierge. */
  toStaff?: boolean;
};

/** Newest first, which is the order a desk actually works in. */
const ROWS: Row[] = [
  {
    room: "327",
    request: "Deep tissue, 60 minutes, 7:30 tonight",
    at: "9:14pm",
    value: "4,500",
  },
  {
    room: "212",
    request: "Late checkout, 2pm",
    at: "9:02pm",
    toStaff: true,
  },
  {
    room: "104",
    request: "Table for two, 8pm tomorrow",
    at: "8:41pm",
    value: "2,800",
  },
  {
    room: "418",
    request: "Airport transfer, 6am",
    at: "8:20pm",
    value: "3,200",
  },
  {
    room: "201",
    request: "Extra towels",
    at: "8:06pm",
  },
];

const LINES = [
  "No new system, and no logins for every member of staff.",
  "Requests arrive with the room number already attached.",
  "Anything urgent, and anything that should be handled by a person, goes straight to a person.",
];

export function StaffScreen() {
  const ref = useRef<HTMLElement>(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Once, on enter. A row that re-arrives every time the section is
    // scrolled past stops being an arrival and becomes a loop.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setArrived(true);
        io.disconnect();
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-night px-6 py-28 sm:px-10 sm:py-32"
      aria-labelledby="staff-heading"
    >
      {/*
        The brass plate, taken almost to black. The panel has to be the only
        lit thing on the section, so this is a colour temperature and a grain
        rather than a subject.
      */}
      <PhotoField
        src="/media/plate-327.png"
        tone="#08090a"
        position="70% center"
        scrim="linear-gradient(180deg, rgba(11,12,14,0.94) 0%, rgba(11,12,14,0.97) 50%, rgba(11,12,14,0.99) 100%)"
      />

      <div className="relative mx-auto w-full max-w-[52rem]">
        <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
          Behind the desk
        </p>
        <h2
          id="staff-heading"
          className="mt-5 max-w-[26rem] font-display text-[clamp(1.9rem,4.6vw,2.75rem)] leading-tight tracking-[-0.02em] text-paper"
        >
          <Reveal as="span" text="Your team sees one screen." className="block" />
        </h2>

        {/* The panel. Styled as the staff view, not as a chart of it. */}
        <div className="mt-12 overflow-hidden rounded-xl border border-paper/14 bg-paper/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div className="flex items-baseline justify-between border-b border-paper/12 px-5 py-4 sm:px-6">
            <p className="font-body text-[0.8125rem] font-medium text-paper/85">
              Today
            </p>
            <p className="font-body text-[0.6875rem] uppercase tracking-[0.16em] text-paper/40">
              Newest first
            </p>
          </div>

          <ul role="list" className="divide-y divide-paper/10">
            {ROWS.map((row, i) => (
              <li
                key={row.room + row.at}
                className={[
                  "flex items-center gap-4 px-5 py-4 sm:px-6",
                  // Only the top row moves, and only once.
                  i === 0
                    ? arrived
                      ? "animate-row-in bg-brass/[0.07]"
                      : "opacity-0"
                    : "",
                ].join(" ")}
              >
                {/* The room number, which is the whole point of the row: it
                    is attached before anyone at the desk has to ask. */}
                <span className="w-12 shrink-0 font-display text-[1.05rem] leading-none text-brass tabular-nums">
                  {row.room}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-[0.9375rem] text-paper/90">
                    {row.request}
                  </span>
                  <span className="mt-1 block font-body text-[0.75rem] text-paper/40 tabular-nums">
                    {row.at}
                    {row.toStaff ? (
                      <span className="ml-2 text-paper/55">for the desk</span>
                    ) : null}
                  </span>
                </span>

                {/* A value where there is one, and nothing at all where there
                    is not. A dash or a zero would imply the row failed to
                    earn; most of what a concierge handles is not a sale. */}
                <span className="w-16 shrink-0 text-right font-body text-[0.9375rem] tabular-nums text-paper/85">
                  {row.value ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Left, on the heading's axis. Centred, they read as a caption to the
            panel rather than as the argument the section is making. */}
        <ul role="list" className="mt-12 max-w-[36rem] space-y-3">
          {LINES.map((line) => (
            <li
              key={line}
              className="flex gap-3.5 font-body text-[0.9375rem] leading-relaxed text-paper/65"
            >
              <span
                aria-hidden="true"
                className="mt-[0.62em] h-px w-3.5 shrink-0 bg-brass"
              />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
