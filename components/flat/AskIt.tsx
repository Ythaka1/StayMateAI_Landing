"use client";

import Image from "next/image";
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
 * transcript, and the sheet carries a min-height sized to the tallest of the
 * four. Switching between questions therefore moves nothing at all, which
 * matters here more than on most pages: everything below this section
 * includes three scroll-driven 3D segments.
 *
 * The one thing that does grow the sheet is booking the massage, which adds
 * the name block. That is a deliberate press, the growth happens below the
 * line the reader is on, and every scroll-driven measurement on the page is
 * taken per frame rather than cached, so it self-corrects on the next scroll
 * event. Reflow on an explicit action is a conversation getting longer;
 * reflow on passive scroll is a bug.
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
      "Rooftop, level six. Open from 6am until 9pm. Towels are stacked by the loungers, so there is no need to bring one up from the room.",
  },
  {
    chip: "Breakfast times",
    question: "What time is breakfast?",
    reply:
      "Breakfast is served from 6:30 until 10:30 in the courtyard, on the ground floor. Room service carries the same menu until 11, if you would rather not come down.",
  },
  {
    chip: "Book me a massage",
    question: "Anywhere I can get a massage tonight?",
    reply: "The spa has one slot left tonight.",
    offer: {
      title: "Deep tissue, 60 minutes",
      detail: "Tonight at 7:30, in the spa on the second floor.",
      price: "4,500",
      action: "Add to my stay",
    },
    note: "In a real stay this goes straight onto the room account. Here it is a demonstration, and pressing it books nothing.",
  },
  {
    chip: "What's nearby?",
    question: "What's nearby?",
    reply:
      "Five minutes on foot, the old market, two cafés and a pharmacy that keeps late hours. Fifteen by car, the botanical gardens. I can call you a taxi whenever you would like one.",
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
      className="relative overflow-hidden bg-paper px-6 py-20 sm:px-10 sm:py-24"
      aria-labelledby="ask-heading"
    >
      {/*
        The field has a surface. blotter.png, taken almost all the way out and
        multiplied into the cream, so the section reads as a sheet of stock
        rather than as an empty div with things on it. At this opacity nobody
        will identify it as leather; what it does is stop the flattest, largest
        area of the site from being literally flat.

        next/image rather than a background-image, because the source is
        1.9MB and the optimiser will hand back an AVIF two orders of magnitude
        smaller. Not priority, and not preloaded: it is texture, and it is
        allowed to arrive late.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.055] mix-blend-multiply"
      >
        {/* Zoomed well into the middle of the hide and softened. At 1:1 the
            photograph's own edge, where the leather meets the wood, crosses
            the section as a visible diagonal smudge; nothing here is meant to
            be identifiable as an object. */}
        <Image
          src="/media/blotter.png"
          alt=""
          fill
          sizes="100vw"
          className="scale-[2.4] object-cover object-[62%_46%] blur-[0.5px]"
        />
      </div>

      {/*
        One composition, not two screens. The lead-in and the chips sit beside
        the exchange rather than a scroll above it, so pressing a chip changes
        something already in view. Stacked below the breakpoint, where there is
        no width for two columns and the order still reads correctly.
      */}
      <div className="relative mx-auto grid w-full max-w-[66rem] gap-12 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
        <div>
          <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
            Try it
          </p>
          <h2
            id="ask-heading"
            className="mt-4 font-display text-[clamp(2rem,4.4vw,2.9rem)] leading-[1.05] tracking-[-0.02em] text-ink"
          >
            <Reveal as="span" text="Ask it something." className="block" />
          </h2>
          <p className="mt-4 max-w-[26rem] font-body text-[0.9375rem] leading-relaxed text-muted">
            This is the concierge itself, not a picture of it. Choose a
            question. The answers are the ones your property would have
            written.
          </p>

          {/*
            The chips. Real buttons, in the tab order, and operated by Enter
            and Space for free because they are buttons.

            They used to be a hairline on cream, which read as static labels:
            nothing on this section looked like it could be touched. They are
            now raised off the field with a real border, a shadow and a lift
            on hover, and they carry a small arrow so the affordance survives
            for anyone who never moves a mouse over them.
          */}
          <div
            className="mt-8 flex flex-wrap gap-2.5"
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
                  "group inline-flex items-center gap-2 rounded-full border",
                  "px-4 py-2.5 font-body text-[0.8125rem] font-medium",
                  "transition-all duration-200 focus-visible:outline-2",
                  "focus-visible:outline-offset-2 focus-visible:outline-felt",
                  "active:translate-y-0",
                  started && index === i
                    ? "border-felt bg-felt text-paper shadow-[0_2px_10px_rgba(30,59,49,0.28)]"
                    : [
                        "border-ink/20 bg-paper-2 text-ink",
                        "shadow-[0_1px_2px_rgba(21,23,27,0.08)]",
                        "hover:-translate-y-px hover:border-ink/45",
                        "hover:shadow-[0_3px_10px_rgba(21,23,27,0.12)]",
                      ].join(" "),
                ].join(" ")}
              >
                {a.chip}
                <span
                  aria-hidden="true"
                  className={[
                    "text-[0.9em] transition-transform duration-200",
                    started && index === i
                      ? "text-paper/70"
                      : "text-ink/35 group-hover:translate-x-0.5",
                  ].join(" ")}
                >
                  &rsaquo;
                </span>
              </button>
            ))}
          </div>
        </div>

        {/*
          The exchange. min-height is set to the tallest state, which is the
          offer once it has been booked, so switching between a two-line
          answer and the full booking never moves the page.

          aria-live="polite" rather than "assertive": the answer is a
          response to something the visitor just did, so it should be read
          after whatever they are already hearing, not over it.
        */}
        <div
          className="min-h-[27rem] rounded-2xl border border-ink/10 bg-paper-2 p-6 shadow-[0_1px_3px_rgba(21,23,27,0.05)] sm:p-8"
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

                {/*
                  ── The name moment ────────────────────────────────────────
                  The single most common objection to a concierge on a card is
                  that it does not know who is asking, so a booking made
                  through it is anonymous and somebody at the desk has to
                  reconcile it. It is not: the name is taken once, on the
                  first message of the stay, and every booking after that
                  carries it.

                  Shown as a filled field rather than as a claim in a
                  paragraph, because a field with a name already in it says
                  "this was asked and answered" in a way no sentence about it
                  can. It arrives only after the button has been pressed, so
                  it is the consequence of the booking rather than another
                  thing sitting on the sheet waiting.
                */}
                {pressed && answer.offer ? (
                  <div className="animate-word-rise mt-6 border-t border-ink/10 pt-6">
                    <p className="font-body text-[0.6875rem] uppercase tracking-[0.18em] text-brass">
                      Booked
                    </p>
                    <div className="mt-4 rounded-lg border border-ink/15 bg-paper px-4 py-3">
                      <p className="font-body text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                        Name on the booking
                      </p>
                      <p className="mt-1.5 font-display text-[1.15rem] leading-none text-ink">
                        Amara Ndegwa
                      </p>
                    </div>
                    <p className="mt-3 font-body text-[0.8125rem] leading-relaxed text-muted">
                      Asked once, on the first message of the stay, and
                      remembered for every booking after it.
                    </p>
                  </div>
                ) : null}

                {answer.note ? (
                  <p className="mt-5 font-body text-[0.8125rem] leading-relaxed text-muted">
                    {answer.note}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="font-body text-[0.9375rem] leading-relaxed text-muted">
              Choose a question above.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
