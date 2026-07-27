import { PhotoField } from "./PhotoField";
import { Reveal } from "./Reveal";
import { WHATSAPP_HREF } from "@/lib/contact";

/*
 * Section 9 — the pilot.
 *
 * The close, and the only place on the site with a real ask. One button. The
 * five lines under the offer are the whole commitment, written as things that
 * happen rather than as benefits, because the objection this section is
 * answering is not "is it good" — it is "how much of my week does this cost
 * me". Every line is there to take work off the reader.
 *
 * Over card.jpg, darkened: the site opened on this card in the dark and it
 * closes on the same card, which is the only bit of symmetry the page needs.
 */

const TERMS = [
  "No contract, no card, nothing to sign.",
  "Send a menu — the content gets loaded for you.",
  "Room cards printed and delivered.",
  "Staff learn one screen, which takes four minutes.",
  "After thirty days, keep it or take the cards out.",
];

export function Pilot() {
  return (
    <section
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-night px-6 py-28 sm:px-10"
      aria-labelledby="pilot-heading"
    >
      <PhotoField
        src="/media/card.png"
        position="center 35%"
        scrim="linear-gradient(180deg, rgba(11,12,14,0.88) 0%, rgba(11,12,14,0.78) 45%, rgba(11,12,14,0.92) 100%)"
      />

      <div className="relative mx-auto w-full max-w-[36rem] text-center">
        <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
          The pilot
        </p>

        <h2
          id="pilot-heading"
          className="mt-6 font-display text-[clamp(2rem,5.6vw,3.1rem)] leading-[1.06] tracking-[-0.02em] text-paper"
        >
          <Reveal
            as="span"
            text="Run it free at your property for 30 days."
            className="block"
          />
        </h2>

        <ul
          role="list"
          className="mx-auto mt-10 max-w-[27rem] space-y-3 text-left"
        >
          {TERMS.map((t) => (
            <li
              key={t}
              className="flex gap-3.5 font-body text-[0.9375rem] leading-relaxed text-paper/70"
            >
              <span
                aria-hidden="true"
                className="mt-[0.62em] h-px w-3.5 shrink-0 bg-brass"
              />
              {t}
            </li>
          ))}
        </ul>

        {/* The only conversion point on the site. */}
        <a
          href={WHATSAPP_HREF}
          className="mt-11 inline-block rounded-full bg-felt px-8 py-3.5 font-body text-[0.875rem] font-medium tracking-wide text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          Start the pilot on WhatsApp
        </a>
      </div>
    </section>
  );
}
