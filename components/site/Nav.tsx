"use client";

import { forwardRef } from "react";
import { WHATSAPP_HREF } from "@/components/stage/OfferBeat";

/*
 * Transparent, floating, no fill and no border. It fades in only once beat 1
 * has released, so the opening frame is the card and nothing else — the Stage
 * writes its opacity from the same scroll handler that drives everything.
 */
export const Nav = forwardRef<HTMLElement>(function Nav(_, ref) {
  return (
    <header
      ref={ref}
      className={[
        "fixed inset-x-0 top-0 z-40 flex items-center justify-between",
        "px-6 py-5 sm:px-10",
        "opacity-0 motion-reduce:opacity-100",
      ].join(" ")}
      data-site="nav"
    >
      <a
        href="#top"
        className="pointer-events-auto font-display text-[0.9375rem] tracking-[0.2em] text-paper/90"
      >
        STAYMATE
      </a>
      <a
        href={WHATSAPP_HREF}
        className="pointer-events-auto font-body text-[0.8125rem] text-paper/70 underline-offset-4 transition-colors hover:text-paper hover:underline"
      >
        The pilot
      </a>
    </header>
  );
});
