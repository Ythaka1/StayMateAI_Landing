"use client";

import { useId } from "react";
import Image from "next/image";
import { PropertyCard } from "./PropertyCard";
import { Reveal } from "./Reveal";
import { DEFAULT_PROPERTY, PROPERTY_MAX } from "@/lib/cardText";
import { useProperty } from "@/lib/property";

/*
 * Put your property on it.
 *
 * Probably the most persuasive thing on the site, and it is one input and one
 * card. A general manager types his hotel's name and watches it appear,
 * printed, in the display face, on the object that is going to sit in his
 * rooms. Every argument the rest of the page makes is an argument; this is the
 * thing itself, with his name on it, ten seconds after he arrived.
 *
 * ── Live, and only live ──────────────────────────────────────────────────
 * Every keystroke. Not on submit, not on blur, and there is no submit: there
 * is no form, no button, and no endpoint. What is typed goes into React state,
 * through cleanProperty, and onto a card. It is never stored, never sent, and
 * gone the moment the tab closes. That is worth being able to say plainly, and
 * the way to be able to say it plainly is to build it so it is true.
 *
 * ── Why the card here is DOM ─────────────────────────────────────────────
 * See PropertyCard. Briefly: the 3D card is not on screen at this point in
 * the page, and repainting a canvas texture from an input event would put a
 * texture upload on the keystroke path of a scroll-driven timeline that is
 * measured to a hex value at its handoff. The brief allows a separate card
 * and this is the case it was allowing for.
 *
 * ── Placeholder, not empty ───────────────────────────────────────────────
 * The card carries The Laurel until something is typed. An empty card with a
 * dotted box where the name goes is a mock-up; a card with a name on it is a
 * card, and the visitor's job is then to replace a name rather than to
 * imagine one.
 */
export function PutYourName() {
  const inputId = useId();
  // One string, shared by every card on the site. `raw` controls the field so
  // a trailing space someone is mid-way through typing does not vanish from
  // under the cursor; `name` is what the cards print, cleaned and never empty.
  const { name, raw, setRaw } = useProperty();

  return (
    <section
      className="relative overflow-hidden bg-paper px-6 py-20 sm:px-10 sm:py-24"
      aria-labelledby="name-heading"
    >
      {/* The same paper grain the other cream section carries, so the two
          bright moments on the site are the same surface. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.055] mix-blend-multiply"
      >
        <Image
          src="/media/blotter.png"
          alt=""
          fill
          sizes="100vw"
          className="scale-[2.4] object-cover object-[62%_46%] blur-[0.5px]"
        />
      </div>

      <div className="relative mx-auto grid w-full max-w-[64rem] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)] lg:gap-20">
        <div>
          <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
            Your card
          </p>
          <h2
            id="name-heading"
            className="mt-4 font-display text-[clamp(2rem,4.4vw,2.9rem)] leading-[1.05] tracking-[-0.02em] text-ink"
          >
            <Reveal
              as="span"
              text="Put your property on it."
              className="block"
            />
          </h2>

          <div className="mt-9">
            <label
              htmlFor={inputId}
              className="block font-body text-[0.75rem] uppercase tracking-[0.16em] text-muted"
            >
              Property name
            </label>
            {/*
              A real input, generously sized, and the only one on the site.
              Set in the display face because what is being typed is going to
              be printed in the display face, and seeing it change shape at
              the moment of typing is half the effect.

              autoComplete off and spellCheck off: this is a proper noun going
              onto a printing plate, not a form field, and a red underline
              under somebody's hotel is a poor welcome.
            */}
            <input
              id={inputId}
              type="text"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={DEFAULT_PROPERTY}
              maxLength={PROPERTY_MAX}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              className={[
                "mt-3 w-full max-w-[26rem] border-0 border-b border-ink/25 bg-transparent",
                "pb-3 font-display text-[clamp(1.5rem,3.4vw,2.1rem)] leading-tight",
                "tracking-[0.04em] text-ink",
                "placeholder:text-ink/25",
                "transition-colors focus:border-felt focus:outline-none",
              ].join(" ")}
            />
            <p className="mt-5 max-w-[26rem] font-body text-[0.9375rem] leading-relaxed text-muted">
              The cards are printed and delivered. The property never touches a
              printer.
            </p>
          </div>
        </div>

        {/*
          The card. aria-hidden and mirrored by a live region below, rather
          than left for a screen reader to walk: the visual effect is watching
          the name land on the object, and reading out a code block, a rule
          and a footer on every keystroke is not that.
        */}
        <div className="mx-auto w-full max-w-[19rem] lg:mx-0" aria-hidden="true">
          <PropertyCard property={name} />
        </div>

        <p className="sr-only" aria-live="polite">
          The card now reads {name}.
        </p>
      </div>
    </section>
  );
}
