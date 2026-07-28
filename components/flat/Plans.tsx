import { PhotoField } from "./PhotoField";
import { Reveal } from "./Reveal";
import { WHATSAPP_HREF } from "@/lib/contact";

/*
 * Section 8 — plans.
 *
 * ── The one pricing decision that matters ─────────────────────────────────
 * The tiers differ on rooms and properties. They do not differ on whether the
 * product works. Every plan gets the concierge, every language, booking
 * capture, the staff screen and the human handoff — and that is stated once,
 * above the cards, rather than repeated as ticks in three columns.
 *
 * Gating booking capture behind the middle tier would be the obvious way to
 * make Pro look necessary, and it is the mistake that kills this category. A
 * twelve-room property that cannot take a booking on the entry tier does not
 * upgrade; it churns, and then it tells every other hotelier it knows that
 * the thing did nothing. The tiers are a capacity ladder, not a feature
 * ladder, and the feature list exists to say so out loud.
 *
 * Pro is the default and is raised. Not by scaling it — a scaled card in a
 * grid throws the baselines out and every price sits on a different line —
 * but by lifting it, lighting it, and giving it the only filled button.
 *
 * No setup fee is shown. There is one, and it is a conversation, not a number
 * on a page next to three other numbers.
 */

const INCLUDED = [
  "the concierge itself",
  "every language",
  "booking capture",
  "the staff screen",
  "the handoff to a person",
];

type Plan = {
  name: string;
  price: string;
  rooms: string;
  extras: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Standard",
    price: "$39",
    rooms: "Up to 20 rooms",
    extras: [],
  },
  {
    name: "Pro",
    price: "$79",
    rooms: "Up to 60 rooms",
    extras: ["Tours and partner bookings", "Monthly content updates"],
    featured: true,
  },
  {
    name: "Estate",
    price: "$149",
    rooms: "Unlimited rooms",
    extras: ["Multiple properties", "Custom domain"],
  },
];

export function Plans() {
  return (
    <section
      className="relative overflow-hidden bg-night px-6 py-28 sm:px-10 sm:py-36"
      aria-labelledby="plans-heading"
    >
      {/*
        The brass 327 plate, taken almost to black. It is a texture and a
        colour temperature here, not a subject — the cards have to be the
        only legible thing on the section.
      */}
      <PhotoField
        src="/media/plate-327.png"
        tone="#0a0a0b"
        position="30% center"
        scrim="linear-gradient(180deg, rgba(11,12,14,0.82) 0%, rgba(11,12,14,0.93) 45%, rgba(11,12,14,0.97) 100%)"
      />

      <div className="relative mx-auto w-full max-w-[62rem]">
        <div className="mx-auto max-w-[36rem] text-center">
          <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
            Plans
          </p>
          <h2
            id="plans-heading"
            className="mt-5 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-tight tracking-[-0.02em] text-paper"
          >
            <Reveal
              as="span"
              text="Priced on rooms, not on features."
              className="block"
            />
          </h2>
          <p className="mt-6 font-body text-[0.9375rem] leading-relaxed text-paper/60">
            Every plan includes {INCLUDED.slice(0, -1).join(", ")} and{" "}
            {INCLUDED.at(-1)}. The tiers differ only on how many rooms and how
            many properties. Nothing that makes the product work is held back.
          </p>
        </div>

        {/* Stretch, so all three cards are the row's height and every button
            sits on the same line — see mt-auto below. The middle card is then
            lifted off that line by a transform, which raises it without
            making it a different size or a different shape. */}
        <ul role="list" className="mt-14 grid gap-5 sm:mt-16 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <li
              key={plan.name}
              className={[
                "flex h-full flex-col rounded-2xl border p-7",
                plan.featured
                  ? // Raised rather than scaled: a translate leaves the type
                    // untouched, where transform: scale would soften it and
                    // put every price on a different optical size.
                    "border-brass/40 bg-paper/[0.06] sm:-translate-y-5"
                  : "border-paper/12 bg-paper/[0.02]",
              ].join(" ")}
            >
              {plan.featured ? (
                <p className="mb-4 font-body text-[0.625rem] uppercase tracking-[0.2em] text-brass">
                  Most properties
                </p>
              ) : null}

              <h3 className="font-display text-[1.35rem] leading-none text-paper">
                {plan.name}
              </h3>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-[2.4rem] leading-none tracking-[-0.02em] text-paper tabular-nums">
                  {plan.price}
                </span>
                <span className="font-body text-[0.8125rem] text-paper/45">
                  /month
                </span>
              </p>

              <p className="mt-5 border-t border-paper/10 pt-5 font-body text-[0.9375rem] text-paper/80">
                {plan.rooms}
              </p>

              {plan.extras.length > 0 ? (
                <ul role="list" className="mt-4 space-y-2">
                  {plan.extras.map((extra) => (
                    <li
                      key={extra}
                      className="flex gap-3 font-body text-[0.875rem] leading-relaxed text-paper/55"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[0.6em] h-px w-2.5 shrink-0 bg-brass"
                      />
                      {extra}
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* mt-auto rather than a fixed top margin: the three cards
                  carry different amounts of copy, and a fixed gap would leave
                  the three buttons on three different lines. pt-8 is the
                  minimum breathing room when a card is the tallest one. */}
              <div className="mt-auto pt-8">
                <a
                  href={WHATSAPP_HREF}
                  className={[
                    "block rounded-full px-5 py-2.5 text-center font-body",
                    "text-[0.8125rem] font-medium tracking-wide transition-opacity",
                    "focus-visible:outline-2 focus-visible:outline-offset-2",
                    plan.featured
                      ? "bg-felt text-paper hover:opacity-90 focus-visible:outline-paper"
                      : "border border-paper/25 text-paper/85 hover:border-paper/50 focus-visible:outline-paper",
                  ].join(" ")}
                >
                  Start with {plan.name}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
