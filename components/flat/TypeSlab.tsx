import { PhotoField } from "./PhotoField";
import { Reveal } from "./Reveal";

/*
 * Section 2 — the type slab.
 *
 * One idea, one device: a photograph and a sentence. Nothing else is on this
 * screen, and nothing on it moves after the line has arrived.
 *
 * The photograph was composed weighted left with the right two-thirds empty,
 * so the type goes in the empty two-thirds and the scrim only has to darken
 * the side the type is on. Pushing object-position left keeps the lamp and
 * the desk edge in frame as the viewport narrows, rather than cropping to the
 * middle of a photograph whose subject is not in the middle.
 *
 * The section is a full viewport tall for a reason beyond composition: the
 * fixed WebGL canvas is behind the document, and the flat sections are what
 * cover it between segments. A short section here would show the 3D through
 * the gap.
 */
export function TypeSlab() {
  return (
    <section
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-night px-6 py-28 sm:px-10"
      aria-labelledby="slab-heading"
    >
      <PhotoField
        src="/media/desk.png"
        position="20% center"
        // Dark on the right, where the type is, and merely deepened on the
        // left, where the lamp and the key are. A flat wash over the whole
        // frame would flatten the one lit thing in the photograph.
        scrim="linear-gradient(90deg, rgba(11,12,14,0.35) 0%, rgba(11,12,14,0.62) 38%, rgba(11,12,14,0.86) 100%)"
      />

      <div className="relative ml-auto w-full max-w-[34rem] sm:w-[62%] lg:w-[55%]">
        <Reveal
          as="h2"
          text="One card. Every question."
          className="block font-display text-[clamp(2.4rem,6.4vw,4.5rem)] leading-[1.02] tracking-[-0.025em] text-paper"
        />
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
