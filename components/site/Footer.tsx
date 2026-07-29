import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  PRIMARY_CTA,
  WHATSAPP_HREF,
} from "@/lib/contact";

/*
 * Quiet. A wordmark, one line, the demo, and a way to reach a person. No
 * sitemap and no columns of links that go nowhere — there are no other pages
 * on this site, and a footer that pretends otherwise is just furniture.
 *
 * z-10 because the WebGL canvas is fixed behind the whole document; without
 * it the footer would sit in the same stacking context as the canvas rather
 * than over it.
 */
export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-paper/10 bg-night px-6 py-14 sm:px-10">
      <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[0.9375rem] tracking-[0.2em] text-paper/90">
            STAYMATE
          </p>
          <p className="mt-3 max-w-[22rem] font-body text-[0.8125rem] leading-relaxed text-paper/45">
            A concierge that lives on a card on the desk.
          </p>
        </div>
        {/* Wraps rather than scrolls: the address is long, and on a narrow
            window three items in a row would push the phone off the edge. */}
        <nav className="flex flex-wrap gap-x-7 gap-y-2 font-body text-[0.8125rem] text-paper/60">
          <a
            href={WHATSAPP_HREF}
            className="underline-offset-4 transition-colors hover:text-paper hover:underline"
          >
            {PRIMARY_CTA}
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline-offset-4 transition-colors hover:text-paper hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={CONTACT_PHONE_HREF}
            className="whitespace-nowrap underline-offset-4 transition-colors hover:text-paper hover:underline"
          >
            {CONTACT_PHONE_DISPLAY}
          </a>
        </nav>
      </div>
    </footer>
  );
}
