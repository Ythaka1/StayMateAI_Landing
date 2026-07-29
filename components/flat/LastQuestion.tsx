import { Reveal } from "./Reveal";

/*
 * The last question.
 *
 * At checkout the concierge asks one thing, privately, and the hotel hears it
 * while the guest is still standing in the lobby.
 *
 * ── The argument, which is deliberately not stated ───────────────────────
 * A hotel that hears its complaints privately can fix them. One that does not
 * reads them in public, a fortnight late, under a star rating, with no way to
 * answer. That is the whole case and it is left for the reader to arrive at:
 * the exchange shows a guest saying two specific, fixable things, and the
 * three lines underneath say when it arrives, how often it is asked, and
 * where it does not go. Anyone who runs a property completes the thought
 * without help, and completing it themselves is what makes it land.
 *
 * Saying it out loud would turn the strongest thing on the page into a
 * slogan about reviews, and a slogan about reviews is what every other
 * supplier in this category leads with.
 *
 * ── Not interactive ──────────────────────────────────────────────────────
 * Section 4 is the one place on the site anything can be pressed. This looks
 * like it because the shape is familiar by now, but it is a printed record of
 * a conversation that already happened. Making it pressable would invite
 * someone to play with a complaint, which is the wrong register entirely.
 *
 * Serious in tone, so it is dark and quiet, with no photograph behind it.
 * This is the one section on the site that is about something going wrong.
 */

const LINES = [
  "It reaches the manager the same morning, not a fortnight later.",
  "The guest is asked once, and only at the end.",
  "Nothing is published anywhere.",
];

export function LastQuestion() {
  return (
    <section
      className="relative overflow-hidden bg-night px-6 py-28 sm:px-10 sm:py-32"
      aria-labelledby="last-heading"
    >
      <div className="relative mx-auto w-full max-w-[46rem]">
        <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
          At checkout
        </p>
        <h2
          id="last-heading"
          className="mt-5 font-display text-[clamp(1.9rem,4.6vw,2.75rem)] leading-tight tracking-[-0.02em] text-paper"
        >
          <Reveal as="span" text="The last question." className="block" />
        </h2>

        {/*
          The exchange. Same shape as section 4's sheet so the site has one
          way of showing a conversation, but darker and without a single
          control on it.
        */}
        <div className="mt-12 rounded-2xl border border-paper/12 bg-paper/[0.035] p-7 sm:p-9">
          <p className="font-body text-[0.6875rem] uppercase tracking-[0.18em] text-brass">
            StayMate
          </p>
          <p className="mt-3 max-w-[30rem] font-display text-[clamp(1.1rem,2.6vw,1.4rem)] leading-snug text-paper">
            Before you go, was there anything we could have done better?
          </p>

          <div className="mt-8 flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-felt px-5 py-3 text-right font-body text-[0.9375rem] leading-relaxed text-paper">
              The room was ready late, and nobody mentioned the pool closes at
              seven.
            </p>
          </div>
        </div>

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
