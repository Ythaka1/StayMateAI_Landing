import { PhotoField } from "./PhotoField";
import { Reveal } from "./Reveal";

/*
 * Section 2 — the type slab.
 *
 * One idea, one device: the card, and the sentence that names what it does.
 * Nothing else is on this screen, and nothing on it moves after the line has
 * arrived.
 *
 * ── Why the photograph is a panel and not a bleed ────────────────────────
 * This ran on desk.png until pass 06, which was the same plate as the hero,
 * four thousand pixels apart. card.png is the right subject for a line that
 * begins "One card", but it cannot be swapped in as a full bleed.
 *
 * Measured: the card occupies 18% to 79% of that photograph's width and 15%
 * to 84% of its height. Cropping a portrait plate into a full-width landscape
 * bleed throws away half its height, and the card is then still wide enough
 * to run underneath any type column set beside it. Pushing it aside with a
 * tighter crop needs roughly 2.9x zoom before the type has clear ground,
 * which cuts the card in half and turns the stock to mush.
 *
 * So the photograph keeps its own portrait format and takes one side of the
 * screen, feathered into the night at its inner edge, with the type in the
 * dark half. The whole card is visible, at a size worth looking at, which a
 * bleed could never have given it.
 *
 * Below the breakpoint there is no room for two columns: the panel goes full
 * width and the scrim turns vertical, so the type sits over the dark
 * foreground beneath the card instead of beside it.
 *
 * The section is a full viewport tall for a reason beyond composition: the
 * fixed WebGL canvas is behind the document, and the flat sections are what
 * cover it between segments. A short section here would show the 3D through
 * the gap.
 */
export function TypeSlab() {
  return (
    <section
      className="relative flex min-h-[100svh] items-end overflow-hidden bg-night px-6 py-24 sm:items-center sm:px-10 sm:py-28"
      aria-labelledby="slab-heading"
    >
      <PhotoField
        src="/media/card.png"
        className="absolute inset-0 sm:inset-y-0 sm:right-auto sm:w-[58%]"
        sizes="(min-width: 640px) 58vw, 100vw"
        // 45% rather than centre: the card sits left of the plate's middle,
        // and this brings it back to the middle of the panel.
        position="45% center"
        /*
         * Two ramps, and the breakpoint decides which one is doing the work.
         *
         * Horizontally: the card itself is barely touched, because it is the
         * subject; the panel's inner edge runs to solid night so there is no
         * visible seam where the photograph stops and the section starts.
         *
         * Vertically: a light deepening top and bottom, which does nothing on
         * a wide screen and is what makes the type legible on a narrow one,
         * where this is a full bleed and the copy sits over the foreground.
         */
        scrim={[
          "linear-gradient(90deg, rgba(11,12,14,0.55) 0%, rgba(11,12,14,0.16) 22%, rgba(11,12,14,0.16) 72%, rgba(11,12,14,0.78) 91%, rgba(11,12,14,1) 100%)",
          "linear-gradient(180deg, rgba(11,12,14,0.3) 0%, rgba(11,12,14,0) 34%, rgba(11,12,14,0.55) 100%)",
        ].join(",")}
      />

      {/*
        Narrow only. With two columns the copy is beside the card and the
        photograph needs no help; without them it is over the card, and the
        card is cream, so cream type on it is unreadable. This is the extra
        darkening under the copy, and it is switched off the moment there is
        room to put the type somewhere else. It cannot live in the scrim
        above, because that one string serves both layouts and this much
        darkening would crush the bottom of the card on a wide screen.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 sm:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,12,14,0) 36%, rgba(11,12,14,0.74) 66%, rgba(11,12,14,0.95) 100%)",
        }}
      />

      <div className="relative w-full max-w-[34rem] sm:ml-auto sm:w-[40%] lg:w-[38%]">
        {/* The id is on the h2, not on the Reveal: the section is labelled by
            it, and until pass 06 aria-labelledby here pointed at nothing. */}
        <h2
          id="slab-heading"
          className="font-display text-[clamp(2.4rem,5.4vw,4rem)] leading-[1.02] tracking-[-0.025em] text-paper"
        >
          <Reveal as="span" text="One card. Every question." className="block" />
        </h2>
        <Reveal
          as="p"
          text="The questions your front desk answers forty times a day, answered the moment they are asked, in the language they were asked in, at any hour."
          // Starts as the headline's last word lands, so the two read as one
          // gesture rather than two reveals stacked.
          delayMs={420}
          staggerMs={18}
          className="mt-7 block max-w-[30rem] font-body text-[0.9375rem] leading-relaxed text-paper/60 sm:text-base"
        />
      </div>
    </section>
  );
}
