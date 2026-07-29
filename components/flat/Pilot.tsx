import { PhotoField } from "./PhotoField";
import { Reveal } from "./Reveal";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  PRIMARY_CTA,
  WHATSAPP_HREF,
} from "@/lib/contact";

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
  "Send us a menu, and the content is loaded for you.",
  "Room cards printed and delivered to the door.",
  "Your staff learn one screen, which takes four minutes.",
  "After thirty days, keep it, or take the cards off the desks.",
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
        {/*
          Was "The pilot", which is the same opaque word the nav link carried
          and for the same reason: it names a thing this site invented. It is
          not replaced with "Book a demo" here, though, because that is what
          the button forty lines below already says, and an eyebrow that
          repeats its own call to action is furniture. This names the offer
          instead, which is what the heading under it goes on to explain.
        */}
        <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
          Thirty days, free
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

        {/*
          WhatsApp stays the primary action: it is the one channel a hotelier
          in this market will already have open, and it needs no address book
          entry, no subject line and no ringing phone.

          Email and phone sit under it, quiet and small. They are there for
          the manager who does not use WhatsApp for business, or who wants to
          forward something to an owner, and for the simple reason that a page
          asking a stranger for thirty days of his hotel should be willing to
          show him a way to call.
        */}
        <a
          href={WHATSAPP_HREF}
          className="mt-11 inline-block rounded-full bg-felt px-8 py-3.5 font-body text-[0.875rem] font-medium tracking-wide text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          {PRIMARY_CTA} on WhatsApp
        </a>

        <p className="mt-7 font-body text-[0.8125rem] leading-relaxed text-paper/45">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline-offset-4 transition-colors hover:text-paper/80 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          <span aria-hidden="true" className="px-2.5 text-paper/25">
            &middot;
          </span>
          <a
            href={CONTACT_PHONE_HREF}
            className="whitespace-nowrap underline-offset-4 transition-colors hover:text-paper/80 hover:underline"
          >
            {CONTACT_PHONE_DISPLAY}
          </a>
        </p>
      </div>
    </section>
  );
}
