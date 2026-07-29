"use client";

import { useProperty } from "@/lib/property";

/*
 * The property's name, set onto the card in the photograph.
 *
 * card.png is a real tent card, blank, at an angle, on a lamplit desk. This
 * puts the typed name onto its face so that a general manager who types his
 * hotel two sections earlier finds it here, printed, on a photograph of an
 * actual object rather than on another rendering.
 *
 * ── Registration ─────────────────────────────────────────────────────────
 * Everything below is in percentages of the plate's own box, and TypeSlab
 * sizes that box to the photograph's exact aspect with container query units
 * rather than leaving object-fit to crop it. That is the whole reason for the
 * arrangement over there: with object-cover, percentages are percentages of a
 * container that crops the image by an amount that changes with viewport, and
 * an overlay laid out in them slides off the card the moment the window is
 * resized. Against a box that is the photograph, they cannot.
 *
 * The transform is a plane in space rather than a homography solved from four
 * corners. The card's face in this photograph is very close to a rectangle
 * rotated in plane and turned away from the lens, which is exactly what
 * rotateZ and rotateY produce, and a hand-fitted plane stays legible if the
 * photograph is ever re-cropped where solved matrix3d coefficients would not.
 *
 * ── Why it is small and quiet ────────────────────────────────────────────
 * There is no QR here, no rule and no footer. This is a photograph of a card
 * being addressed, not a second rendering of the card: the name alone, in the
 * ink and the face it would be printed in, is the whole point of the moment.
 */

/*
 * Fitted against the photograph, by measuring the card's face in it.
 *
 * Its four corners sit at roughly (0.273, 0.149), (0.800, 0.230),
 * (0.182, 0.754) and (0.695, 0.847) in image fractions, which puts the centre
 * of the face at (0.488, 0.495) and makes the face about 0.52 of the image
 * wide.
 *
 * Two things fall out of those numbers. The top edge rises 84 over 440, so
 * the card is turned about eleven degrees in plane. And the left and right
 * edges are 631 and 644 long while the top and bottom are 440 and 428: within
 * a couple of percent of each other, which means there is almost no
 * perspective foreshortening in this shot at all: the right edge is longer
 * than the left by two percent, so that side is very slightly nearer.
 *
 * The rotateY therefore has to be tiny. Nineteen degrees was the first
 * attempt and ten the second, and both bent the name into a visible arc
 * across a face that is very nearly a parallelogram. Three and a half degrees
 * against a long perspective reproduces the two percent and nothing more.
 */
const FIT = {
  /** Centre of the type block, in fractions of the plate box. */
  left: "48%",
  top: "49%",
  /** Width of the measure on the card's face, about two thirds of it. */
  width: "34%",
  transform:
    "translate(-50%, -50%) perspective(2400px) rotateZ(10.8deg) rotateY(-3.5deg)",
} as const;

export function PlateName() {
  const { name } = useProperty();

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute select-none"
      style={{
        left: FIT.left,
        top: FIT.top,
        width: FIT.width,
        transform: FIT.transform,
        transformOrigin: "center",
      }}
    >
      <span
        className="block text-center font-display leading-tight text-ink/80"
        style={{
          // Sized from the plate box rather than the viewport, so the type
          // stays the same size relative to the card at every window size.
          fontSize: "clamp(0.6rem, 4.2cqw, 3.2rem)",
          letterSpacing: "0.1em",
          // The stock is cream and lamplit, not white. Pure ink sits on top of
          // the photograph; a little transparency lets the paper's own tone
          // and grain come through, which is what makes it read as printed on
          // the card rather than composited over it.
          mixBlendMode: "multiply",
        }}
      >
        {name}
      </span>
    </span>
  );
}
