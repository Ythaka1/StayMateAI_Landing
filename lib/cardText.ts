/*
 * The words on the card, and the rules for what may become them.
 *
 * Split out of textures.ts, which imports three.js. Everything here is needed
 * by the property context and by two DOM components, none of which have any
 * business pulling a WebGL library into their bundle to find out how long a
 * hotel name may be.
 */

/**
 * The neutral property the card carries by default.
 *
 * Nowhere in particular, and pronounceable in most places. The card is never
 * blank: a mock-up with a placeholder box where the name goes is a mock-up,
 * and this has to read as a printed card that already exists.
 */
export const DEFAULT_PROPERTY = "The Laurel";

/** As much of a name as the card can carry before it stops being a card. */
export const PROPERTY_MAX = 28;

/**
 * Strip a typed property name down to something that can be printed.
 *
 * Two jobs. The first is physical: a card has no line breaks, no tabs, no
 * runs of twelve spaces, and no room for a paragraph, so those go. Letters,
 * marks, digits, spaces and the handful of characters that legitimately
 * appear in hotel names survive.
 *
 * The second is that this string is drawn into a canvas and rendered into the
 * DOM. React escapes it on the DOM side and a canvas has no parser at all, so
 * nothing here is load bearing for safety; it is defence in depth on a value
 * that reaches two very different sinks, and it costs one regular expression.
 */
export function cleanProperty(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}&'’.,\- ]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, PROPERTY_MAX);
}

/**
 * The exchange on the back of the card.
 *
 * The front is a printed object. The back is that same printed object holding
 * a live conversation, which is the entire product in one image and the
 * reason the card turns over at all.
 *
 * Deliberately generic: no currency, no place names, nothing that ties it to
 * one market. Towels are towels everywhere.
 */
export const BACK_GUEST = "Can I get extra towels?";
export const BACK_REPLY = "Of course. On their way up.";

/** The exchange, as plain text, for the reduced-motion path's DOM copy. */
export const BACK_FACE_LINES = [BACK_GUEST, BACK_REPLY] as const;

/**
 * Where the last word's arrival begins, on the 0..1 reveal. The shader gives
 * every word the same window past its ordinal, so the tail needs somewhere to
 * run: at 1.0 the final word would still be arriving when the reveal ends.
 */
export const BACK_LAST = 0.82;
