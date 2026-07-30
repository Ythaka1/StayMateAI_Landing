/*
 * The three ways this site reaches a person.
 *
 * ── The WhatsApp number ───────────────────────────────────────────────────
 * Full international form, digits only, no plus and no spaces: wa.me will
 * not accept anything else, and a wa.me link with a leading plus or a space
 * in it resolves to a page that says the number is invalid rather than
 * failing visibly at build time.
 *
 * Every WhatsApp button on the site reads from here — the nav, the plans
 * table, the pilot, the footer — so this is the only line to change if the
 * number ever moves. It carried a placeholder (10000000000) from pass 04
 * until now, which meant every one of those buttons reached nobody.
 *
 * Same subscriber as CONTACT_PHONE_HREF below, written the way each
 * destination wants it. If one changes, change both.
 * ──────────────────────────────────────────────────────────────────────────
 */
export const WHATSAPP_NUMBER = "254704925908";

const message = "I'd like to book a StayMate demo.";

export const WHATSAPP_HREF =
  `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent(message);

export const CONTACT_EMAIL = "hakimcastro41@gmail.com";

/**
 * The phone, written and dialled in full international form.
 *
 * Displayed with the country code visible rather than as the local 07 form.
 * This site is aimed at properties well outside Kenya, and a number that
 * begins 07 is either unreachable or quietly wrong from anywhere else: a
 * hotelier in Lisbon reading it has no way to know what to put in front of
 * it, and most will not go looking.
 *
 * DISPLAY carries the spaces a person reads by; HREF carries none, because
 * spaces in a tel: URI are not reliably handled and the dialler only wants
 * the digits.
 */
export const CONTACT_PHONE_DISPLAY = "+254 704 925 908";
export const CONTACT_PHONE_HREF = "tel:+254704925908";

/**
 * What the one link in the nav says, and what the pilot's button says.
 *
 * "The pilot" was opaque. It names a thing this site invented and a general
 * manager has no reason to recognise; it could be a plan, a programme, or a
 * page about aviation. "Book a demo" says what pressing it does. The pilot
 * itself keeps its framing further down the page, thirty days free and no
 * contract, where there is room to explain it.
 */
export const PRIMARY_CTA = "Book a demo";
