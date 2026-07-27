/*
 * The one place the site reaches a person.
 *
 * ── SWAP SEAM ─────────────────────────────────────────────────────────────
 * WHATSAPP_NUMBER is a placeholder. Replace it with the property-facing
 * number in full international form, digits only, no + and no spaces
 * (wa.me will not accept anything else). Nothing else on the site needs to
 * change — every button and link on the page reads from here.
 * ──────────────────────────────────────────────────────────────────────────
 */
export const WHATSAPP_NUMBER = "10000000000";

/** True while the placeholder is still in place. Used to mark it in dev. */
export const WHATSAPP_IS_PLACEHOLDER = WHATSAPP_NUMBER === "10000000000";

const message = "I'd like to try the StayMate 30-day pilot.";

export const WHATSAPP_HREF =
  `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent(message);

/** ── SWAP SEAM ── the address the footer writes to. */
export const CONTACT_EMAIL = "hello@staymate.ai";
