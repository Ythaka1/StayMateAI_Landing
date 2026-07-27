"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/*
 * The blur cascade — the one reveal the flat sections share.
 *
 * A line is split into words and each word rises out of a blur, one after the
 * next. It is the same gesture the concierge answer uses when it types itself
 * in (section 4), which is deliberate: the site's reveal and the product's
 * reveal are the same motion, so the page reads as a demonstration of the
 * thing rather than a wrapper around it.
 *
 * Implementation notes:
 *
 *  - CSS animations, not framer-motion. There are up to a few dozen words per
 *    section and six flat sections; a spring per word is a lot of JS for a
 *    gesture that is a fixed curve and never interrupted. The keyframes live
 *    in globals.css.
 *  - Fires once, on enter, and never on scroll-back. An IntersectionObserver
 *    that disconnects itself is the whole mechanism — a reveal that replays
 *    every time you scroll past turns a page into a fairground.
 *  - Under prefers-reduced-motion the words are simply present. That is
 *    handled in CSS (motion-reduce:animate-none plus a static opacity) rather
 *    than by branching the tree, so there is no hydration mismatch.
 *  - The text is one string in the DOM's accessibility tree: the wrapper
 *    carries the whole line and the per-word spans are aria-hidden, so a
 *    screen reader never hears it word by word.
 */

const STAGGER_MS = 40;

export function Reveal({
  text,
  className,
  wordClassName,
  delayMs = 0,
  staggerMs = STAGGER_MS,
  as: Tag = "span",
  play,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delayMs?: number;
  staggerMs?: number;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  /**
   * Force the cascade rather than waiting to be scrolled into view. Used by
   * section 4, where the answer arrives because a chip was pressed and the
   * section is already on screen.
   */
  play?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const controlled = play !== undefined;

  useEffect(() => {
    if (controlled) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect(); // once, on enter — never on the way back up
      },
      // A third of the block has to be on screen. Triggering at one pixel
      // means the cascade is finished before the line is readable.
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [controlled]);

  const on = controlled ? play : shown;
  const words = text.split(" ");

  return (
    <Tag
      // @ts-expect-error — one ref across a small union of intrinsic tags.
      ref={ref}
      className={className}
      data-reveal={on ? "shown" : "waiting"}
    >
      {/* The line, intact, for assistive tech. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className={[
              "inline-block whitespace-pre",
              on ? "animate-word-rise" : "opacity-0",
              "motion-reduce:animate-none motion-reduce:opacity-100",
              "motion-reduce:blur-none motion-reduce:translate-y-0",
              wordClassName ?? "",
            ].join(" ")}
            style={
              {
                animationDelay: `${delayMs + i * staggerMs}ms`,
              } as CSSProperties
            }
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </Tag>
  );
}
