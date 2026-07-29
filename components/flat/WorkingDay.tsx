import { Reveal } from "./Reveal";

/*
 * Nothing new to watch. Nothing new to learn.
 *
 * The site had shown what the product does and never once explained how a
 * hotel actually runs it, which is the gap every general manager falls into
 * the moment he hears the word screen. He has been sold a dashboard before.
 * It came with a login for every member of staff, a person who had to sit and
 * watch it, and a training afternoon, and six weeks later nobody opened it.
 *
 * So this is three steps and one paragraph, and the paragraph is the point:
 * the screen is a record of the day, not a station somebody has to sit at.
 * It is set apart rather than buried in the list, because it is the sentence
 * that answers the objection, and an objection answered in the middle of a
 * bulleted list has not been answered.
 *
 * Horizontal at desktop, because three steps in a row read as a sequence and
 * three stacked blocks read as three features. Stacked below the breakpoint,
 * where a row of three would be three columns of two words.
 */

const STEPS = [
  {
    n: "01",
    text: "The guest asks. Most questions are answered outright and never reach the hotel at all.",
  },
  {
    n: "02",
    text: "A request arrives on the phone you already use. Not a new system. The room number is already attached.",
  },
  {
    n: "03",
    text: "It goes on the room. Charged and settled at checkout, exactly as it is now.",
  },
];

export function WorkingDay() {
  return (
    <section
      className="relative overflow-hidden bg-night px-6 py-28 sm:px-10 sm:py-32"
      aria-labelledby="day-heading"
    >
      <div className="relative mx-auto w-full max-w-[62rem]">
        <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
          The working day
        </p>
        <h2
          id="day-heading"
          className="mt-5 max-w-[30rem] font-display text-[clamp(1.9rem,4.6vw,2.75rem)] leading-tight tracking-[-0.02em] text-paper"
        >
          <Reveal
            as="span"
            text="Nothing new to watch. Nothing new to learn."
            className="block"
          />
        </h2>

        <ol
          role="list"
          className="mt-14 grid gap-10 sm:mt-16 sm:grid-cols-3 sm:gap-8"
        >
          {STEPS.map((step) => (
            <li key={step.n} className="border-t border-paper/15 pt-6">
              <p className="font-display text-[0.9375rem] leading-none tracking-[0.12em] text-brass tabular-nums">
                {step.n}
              </p>
              <p className="mt-5 font-body text-[0.9375rem] leading-relaxed text-paper/75">
                {step.text}
              </p>
            </li>
          ))}
        </ol>

        {/*
          Set apart, in the display face, at the size of a statement rather
          than a caption. This is the sentence that answers the objection, and
          an objection answered inside a bulleted list has not been answered.
        */}
        <p className="mt-16 max-w-[38rem] border-l border-brass/50 pl-6 font-display text-[clamp(1.15rem,2.6vw,1.5rem)] leading-snug text-paper sm:mt-20">
          The screen is a record of the day, not a station somebody has to sit
          at.
        </p>
      </div>
    </section>
  );
}
