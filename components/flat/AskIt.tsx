"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

/*
 * Section 4 — ask it something.
 *
 * The most important new section on the site, and the only interactive one.
 * It is the product, on the page, working — not a screenshot of the product
 * and not a video of someone using it.
 *
 * ── Hardcoded, and permanently so ─────────────────────────────────────────
 * Every answer below is a literal in this file. There is no fetch, no API
 * route, no key, and nothing here that can be made to talk to a model later
 * without someone deliberately rewriting the component. A marketing page that
 * calls an LLM is a page with a bill, a latency budget, a moderation surface
 * and an outage mode — and this one has to be able to answer at all four
 * chips instantly, offline, and identically every time it is demonstrated.
 *
 * These four are the scripted Tier 1 intents: the questions a concierge
 * answers from the property's own content without reasoning about anything.
 *
 * ── One exchange at a time ────────────────────────────────────────────────
 * Pressing a chip replaces the exchange rather than appending to a growing
 * transcript, and the transcript box has a fixed min-height. A section that
 * grows as you press things moves everything below it — and on this page
 * "everything below it" includes a fixed WebGL canvas whose segments are
 * positioned by scroll offset. Nothing here is allowed to reflow the page.
 *
 * ── Bright on purpose ─────────────────────────────────────────────────────
 * Cream paper and deep ink. It is the only bright moment between the opening
 * darkness and the plans, and the contrast is the point: this is the part of
 * the site where something is actually happening, so it is lit.
 */

type Answer = {
  /** What the guest asked, verbatim, as they would have typed it. */
  question: string;
  /** The chip's label, which is shorter than the question. */
  chip: string;
  /** The concierge's reply. */
  reply: string;
  /** An offer, where the intent ends in one. */
  offer?: {
    title: string;
    detail: string;
    price: string;
    action: string;
  };
  /** The quiet line under the exchange, naming what just happened. */
  note?: string;
};

const ANSWERS: Answer[] = [
  {
    chip: "Where's the pool?",
    question: "Where's the pool?",
    reply:
      "Rooftop, level six. It's open from 6am until 9pm. Towels are stacked by the loungers, so there's no need to carry any up from your room.",
  },
  {
    chip: "Breakfast times",
    question: "What time is breakfast?",
    reply:
      "Breakfast runs 6:30 to 10:30 in the courtyard on the ground floor. Room service serves the same menu until 11 if you'd rather not come down.",
  },
  {
    chip: "Book me a massage",
    question: "Anywhere I can get a massage tonight?",
    reply: "The spa has one slot left tonight.",
    offer: {
      title: "Deep tissue, 60 minutes",
      detail: "Tonight at 7:30pm, spa on the second floor.",
      price: "4,500",
      action: "Add to my stay",
    },
    note: "In a real stay this goes straight onto the room account. Here it is a demonstration — pressing it books nothing.",
  },
  {
    chip: "What's nearby?",
    question: "What's nearby?",
    reply:
      "Five minutes on foot: the old market, two cafés and a pharmacy that stays open late. Fifteen by car: the botanical gardens. I can call you a taxi whenever you want one.",
  },
];

/** Word-by-word cascade cadence, matching the reveal used across the site. */
const CASCADE_MS = 40;

export function AskIt() {
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  // Bumped on every press so the cascade remounts and replays even when the
  // same chip is pressed twice.
  const [turn, setTurn] = useState(0);
  // The exchange is not revealed until the section has been reached, so a
  // visitor who never presses anything still sees it happen once rather than
  // arriving at an answer that was always there.
  const [started, setStarted] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setStarted(true);
        io.disconnect();
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const answer = ANSWERS[index];

  const ask = (i: number) => {
    setIndex(i);
    setTurn((t) => t + 1);
    setStarted(true);
    setPressed(false);
  };

  return (
    <section
      ref={sectionRef}
      className="relative bg-paper px-6 py-28 sm:px-10 sm:py-36"
      aria-labelledby="ask-heading"
    >
      <div className="mx-auto w-full max-w-[42rem]">
        <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
          Try it
        </p>
        <h2
          id="ask-heading"
          className="mt-5 font-display text-[clamp(2rem,5.4vw,3rem)] leading-[1.05] tracking-[-0.02em] text-ink"
        >
          <Reveal as="span" text="Ask it something." className="block" />
        </h2>
        <p className="mt-4 max-w-[30rem] font-body text-[0.9375rem] leading-relaxed text-muted">
          This is the concierge, not a picture of it. Pick a question — the
          answers are the ones your property would have loaded.
        </p>

        {/* The chips. Real buttons, in the tab order, operated by Enter and
            Space for free because they are buttons. */}
        <div
          className="mt-9 flex flex-wrap gap-2.5"
          role="group"
          aria-label="Example questions"
        >
          {ANSWERS.map((a, i) => (
            <button
              key={a.chip}
              type="button"
              onClick={() => ask(i)}
              aria-pressed={started && index === i}
              className={[
                "rounded-full border px-4 py-2 font-body text-[0.8125rem]",
                "transition-colors focus-visible:outline-2",
                "focus-visible:outline-offset-2 focus-visible:outline-felt",
                started && index === i
                  ? "border-felt bg-felt text-paper"
                  : "border-ink/15 bg-paper-2 text-ink hover:border-ink/35",
              ].join(" ")}
            >
              {a.chip}
            </button>
          ))}
        </div>

        {/*
          The exchange. min-height is set to the tallest state (the offer),
          so switching between a two-line answer and the offer card never
          moves the page.

          aria-live="polite" rather than "assertive": the answer is a
          response to something the visitor just did, so it should be read
          after whatever they are already hearing, not over it.
        */}
        <div
          className="mt-10 min-h-[24rem] rounded-2xl border border-ink/10 bg-paper-2 p-6 sm:min-h-[22rem] sm:p-8"
          aria-live="polite"
        >
          {started ? (
            <div key={turn}>
              {/* The guest. Right-aligned, because that is which side of a
                  conversation it is — not because a bubble needs decorating. */}
              <div className="flex justify-end">
                <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-felt px-4 py-2.5 text-right font-body text-[0.9375rem] leading-snug text-paper">
                  {answer.question}
                </p>
              </div>

              <div className="mt-6">
                <p className="font-body text-[0.6875rem] uppercase tracking-[0.18em] text-brass">
                  StayMate
                </p>
                <Reveal
                  as="p"
                  key={`reply-${turn}`}
                  play
                  text={answer.reply}
                  staggerMs={CASCADE_MS}
                  className="mt-3 block max-w-[30rem] font-display text-[clamp(1.1rem,3.2vw,1.35rem)] leading-snug text-ink"
                />

                {answer.offer ? (
                  <div
                    // Delayed past the reply's cascade so the card arrives
                    // after the sentence that introduces it, the way it does
                    // in the product.
                    className="animate-word-rise mt-6 rounded-xl border border-brass/25 bg-paper p-5"
                    style={{
                      animationDelay: `${
                        answer.reply.split(" ").length * CASCADE_MS + 160
                      }ms`,
                    }}
                  >
                    <h3 className="font-display text-[1.15rem] leading-tight text-ink">
                      {answer.offer.title}
                    </h3>
                    <p className="mt-2 font-body text-[0.875rem] leading-relaxed text-muted">
                      {answer.offer.detail}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <span className="font-body text-lg font-semibold tabular-nums text-felt">
                        {answer.offer.price}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPressed(true)}
                        className="rounded-full bg-felt px-5 py-2.5 font-body text-[0.8125rem] font-medium tracking-wide text-paper transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-felt"
                      >
                        {answer.offer.action}
                      </button>
                    </div>
                    {/* The price carries no symbol anywhere on this site. The
                        property sets its own currency at runtime and the site
                        does not get to pick one for it. */}
                    <p className="mt-4 font-body text-[0.75rem] leading-relaxed text-muted">
                      Priced and charged in your property&rsquo;s own currency.
                    </p>
                  </div>
                ) : null}

                {answer.note ? (
                  <p className="mt-5 font-body text-[0.8125rem] leading-relaxed text-muted">
                    {answer.note}
                  </p>
                ) : null}

                {pressed ? (
                  <p className="mt-3 font-body text-[0.8125rem] leading-relaxed text-brass">
                    Nothing was booked — this page has no connection to a
                    property.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="font-body text-[0.9375rem] leading-relaxed text-muted">
              Pick a question above.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
