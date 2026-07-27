import { WHATSAPP_HREF } from "@/components/stage/OfferBeat";

/*
 * Quiet. A wordmark, one line, the demo, and a way to reach a person. No
 * sitemap and no columns of links that go nowhere — there are no other pages.
 */
export default function Footer() {
  return (
    <footer className="border-t border-paper/10 bg-night px-6 py-14 sm:px-10">
      <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[0.9375rem] tracking-[0.2em] text-paper/90">
            STAYMATE
          </p>
          <p className="mt-3 max-w-[22rem] font-body text-[0.8125rem] leading-relaxed text-paper/45">
            A concierge that lives on a card on the desk.
          </p>
        </div>
        <nav className="flex gap-7 font-body text-[0.8125rem] text-paper/60">
          <a
            href={WHATSAPP_HREF}
            className="underline-offset-4 transition-colors hover:text-paper hover:underline"
          >
            See a demo
          </a>
          <a
            href="mailto:hello@staymate.ai"
            className="underline-offset-4 transition-colors hover:text-paper hover:underline"
          >
            hello@staymate.ai
          </a>
        </nav>
      </div>
    </footer>
  );
}
