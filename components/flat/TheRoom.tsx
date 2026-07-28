"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AmbientVideo } from "./AmbientVideo";
import { Reveal } from "./Reveal";
import { getLenis } from "@/lib/lenis";

/*
 * Section 5 — the room, as a horizontal strip.
 *
 * One idea: the three things a guest actually asks for. One device: a strip of
 * tall portrait clips that travels sideways while the section is pinned, with
 * the copy standing still on the left as it passes.
 *
 * ── Why horizontal ────────────────────────────────────────────────────────
 * Three stacked rows made three video loops read as a spec table — same shape
 * three times, each one arriving and leaving on its own. A strip makes them
 * one continuous object that the page moves through, which is both a better
 * use of looping footage and the only arrangement where a clip can be seen
 * arriving before it is read.
 *
 * The strip deliberately runs off the right edge at rest, and off the left
 * edge once travelled, so at no point does it look like a set of three items
 * that has finished.
 *
 * ── Scroll ───────────────────────────────────────────────────────────────
 * The same technique as the pivot: a tall spacer with a sticky child, and one
 * transform on one container driven by the spacer's own progress. Nothing
 * preventDefaults wheel or touch — the page scrolls normally and only the
 * visual is pinned, so trackpad, keyboard, scrollbar and find-in-page all
 * behave.
 *
 * ── Two layouts, one DOM ─────────────────────────────────────────────────
 * Under prefers-reduced-motion the effect returns before touching anything,
 * no transform is ever written, and CSS lays the same elements out as three
 * stacked panels showing poster frames at the footage's native 4:3. The
 * captions move with them. Nothing is swapped at the React level, so there is
 * no hydration flash.
 *
 * The captions exist twice on purpose, and only one of the two is ever in the
 * accessibility tree: the copy inside each panel is the real one and is
 * correctly associated with its clip (sr-only while pinned, visible when
 * stacked), and the cross-fading stack in the left column is aria-hidden
 * decoration of it.
 */

/**
 * Spacer height in svh. Travel is this minus the one sticky viewport, so 180
 * gives 80svh of vertical scroll for roughly 300px of lateral drift at a
 * desktop width — about 2.5:1. Deliberately slower than the scroll: the strip
 * should read as drifting past, not as being dragged. Shorter than the 200
 * this started at, because a pinned section that outstays the three things it
 * has to show is the exact failure this whole pass exists to fix.
 */
const SECTION_VH = 180;

const PANELS = [
  {
    src: "/media/water.mp4",
    poster: "/media/water-poster.jpg",
    alt: "A hotel pool at dusk, the surface barely moving.",
    question: "Where's the pool?",
    lines: [
      "Rooftop, level six. Open 6am to 9pm.",
      "Towels are by the loungers, so there is nothing to carry up.",
    ],
  },
  {
    src: "/media/steam.mp4",
    poster: "/media/steam-poster.jpg",
    alt: "Steam rising on a breakfast terrace in early light.",
    question: "When's breakfast?",
    lines: [
      "6:30 to 10:30, in the courtyard on the ground floor.",
      "Room service carries the same menu until 11.",
    ],
  },
  {
    src: "/media/candle.mp4",
    poster: "/media/candle-poster.jpg",
    alt: "A candle burning in a darkened spa room.",
    question: "Anywhere I can get a massage?",
    lines: [
      "Deep tissue or aromatherapy, sixty minutes.",
      "Two appointments left tonight, at 7:30 and at 9:00.",
    ],
  },
] as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function TheRoom() {
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(false);

  /*
   * Geometry, measured once per resize rather than per frame. Everything the
   * scroll handler and the keyboard handler need is derived from these four
   * numbers, so neither of them ever calls getBoundingClientRect on the track
   * or on a panel — which on a will-change:transform element forces the
   * layout the transform exists to avoid.
   */
  const geo = useRef({ travel: 0, pitch: 0, first: 0 });

  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);

  /**
   * The spacer progress at which panel `i` sits closest to the middle of the
   * strip. Shared by the scroll handler (to pick the lit panel) and by focus
   * handling (to pull the strip to a panel someone tabbed into).
   */
  const progressForPanel = useCallback((i: number) => {
    const { travel, pitch, first } = geo.current;
    if (travel <= 0) return 0;
    return clamp01((first + pitch * i) / travel);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!section || !strip || !track) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Stacked panels, no transform, no travel. CSS has already done it.
      reducedRef.current = true;
      setFocus(-1);
      return;
    }

    const measure = () => {
      const panels = Array.from(
        track.querySelectorAll<HTMLElement>("[data-panel]")
      );
      if (panels.length < 2) return;
      // offsetLeft difference rather than width + gap: it is one number and
      // it stays correct whatever the gap resolves to at this viewport.
      const pitch = panels[1].offsetLeft - panels[0].offsetLeft;
      const width = panels[0].offsetWidth;
      // How far the first panel's centre is from the middle of the strip at
      // rest. Positive: it starts left of centre and travels into it.
      const first = panels[0].offsetLeft + width / 2 - strip.clientWidth / 2;
      geo.current = {
        travel: Math.max(0, track.scrollWidth - strip.clientWidth),
        pitch,
        first,
      };
    };

    let lastX = NaN;

    const apply = () => {
      const rect = section.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      // Off screen entirely: leave the transform where it is. Writing it
      // would be a style recalc for something nobody can see.
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const p = span > 0 ? clamp01(-rect.top / span) : 0;
      const { travel } = geo.current;

      const x = Math.round(-travel * p * 100) / 100;
      if (x !== lastX) {
        lastX = x;
        track.style.transform = `translate3d(${x}px, 0, 0)`;
      }

      // The lit panel is the one nearest the middle of the strip. Derived
      // from the same geometry as the transform, so the caption can never
      // disagree with what is actually centred.
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < PANELS.length; i++) {
        const d = Math.abs(p - progressForPanel(i));
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best !== focusRef.current) {
        focusRef.current = best;
        setFocus(best);
      }
    };

    const onResize = () => {
      measure();
      lastX = NaN;
      apply();
    };

    measure();
    apply();

    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", onResize);
    };
  }, [progressForPanel]);

  /**
   * A panel that receives focus pulls the strip to itself.
   *
   * Immediate rather than animated, and re-asserted for two frames: the
   * browser runs its own scroll-into-view for the newly focused element after
   * the focus event, and an in-flight smooth scroll swallows the next
   * keypress — which is how Tab ends up appearing to do nothing.
   */
  const pullTo = (i: number) => {
    if (reducedRef.current) return;
    const section = sectionRef.current;
    if (!section) return;
    const span = section.offsetHeight - window.innerHeight;
    if (span <= 0) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const target = top + span * progressForPanel(i);
    if (Math.abs(window.scrollY - target) < 8) return;

    const goTo = () => {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
      else window.scrollTo({ top: target, behavior: "instant" });
    };
    goTo();
    requestAnimationFrame(() => {
      goTo();
      requestAnimationFrame(goTo);
    });
  };

  return (
    <section
      ref={sectionRef}
      className="relative bg-night motion-reduce:!h-auto"
      style={{ height: `${SECTION_VH}svh` }}
      aria-labelledby="room-heading"
      data-flat="room"
    >
      {/* overflow-clip rather than hidden, for the same reason as the pivot:
          a hidden box is still a scroll container, so the browser can
          scrollLeft it when focus lands on an off-frame panel. clip creates
          no scrollport at all. */}
      <div className="sticky top-0 flex h-[100svh] items-center overflow-clip motion-reduce:static motion-reduce:h-auto motion-reduce:block motion-reduce:overflow-visible motion-reduce:py-28">
        <div className="flex h-full w-full items-center motion-reduce:block motion-reduce:h-auto">
          {/* The copy, standing still while the strip passes it. */}
          <div className="relative z-10 w-[38%] shrink-0 px-6 sm:px-10 lg:w-[34%] motion-reduce:mb-16 motion-reduce:w-full">
            <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
              In the room
            </p>
            <h2
              id="room-heading"
              className="mt-5 font-display text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight tracking-[-0.015em] text-paper"
            >
              <Reveal
                as="span"
                text="What a guest actually asks for."
                className="block"
              />
            </h2>

            {/*
              The cross-fading caption. Decoration of the copy that already
              lives inside each panel, so it is out of the accessibility tree
              entirely — a screen reader hears each question once, attached to
              its own clip, not three times from a stack of absolute divs.

              Fixed height, because three captions of different lengths
              cross-fading in the same box must not resize it.
            */}
            <div
              aria-hidden="true"
              className="relative mt-10 h-[8.5rem] motion-reduce:hidden"
            >
              {PANELS.map((panel, i) => (
                <div
                  key={panel.src}
                  className={[
                    "absolute inset-0 transition-opacity duration-500",
                    focus === i ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                >
                  <p className="font-display text-[clamp(1.15rem,2.3vw,1.5rem)] leading-snug text-paper">
                    {panel.question}
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {panel.lines.map((line) => (
                      <p
                        key={line}
                        className="font-body text-[0.875rem] leading-relaxed text-paper/55"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* The strip. */}
          {/* min-w-0 is load-bearing. A flex item defaults to min-width:auto,
              which means this box refuses to be narrower than the track it
              contains — so it would size itself to the full 3-panel width,
              clientWidth would equal scrollWidth, and the travel computed
              from their difference would be exactly zero. The strip would sit
              there, pinned and motionless, with no error anywhere. */}
          <div
            ref={stripRef}
            className="relative flex h-full min-w-0 flex-1 items-center overflow-clip motion-reduce:block motion-reduce:h-auto motion-reduce:overflow-visible motion-reduce:px-6 sm:motion-reduce:px-10"
          >
            <div
              ref={trackRef}
              // The reduced-motion max-width is not decoration: stacked at the
              // full content width these become 4:3 videos over a thousand
              // pixels wide, and the section triples in height for no gain.
              className="flex shrink-0 gap-6 will-change-transform sm:gap-8 motion-reduce:mx-auto motion-reduce:w-full motion-reduce:max-w-[44rem] motion-reduce:flex-col motion-reduce:gap-20 motion-reduce:transform-none motion-reduce:will-change-auto"
            >
              {PANELS.map((panel, i) => (
                <div
                  key={panel.src}
                  data-panel=""
                  tabIndex={0}
                  role="group"
                  aria-label={panel.question}
                  onFocus={() => pullTo(i)}
                  className={[
                    "shrink-0 outline-none",
                    // Against the 78svh height below this is roughly 1:1.9 —
                    // properly portrait. Wider and the panels read as stills
                    // in a gallery; much narrower and they read as phone
                    // screenshots, and there is not enough total track width
                    // left for the strip to have anywhere to travel.
                    "w-[clamp(16rem,26vw,25rem)] motion-reduce:w-full",
                    "transition-opacity duration-500",
                    // The panel being read is fully lit; the ones arriving
                    // and leaving sit back. -1 is the reduced-motion state,
                    // where all three are simply present.
                    focus === i || focus === -1 ? "opacity-100" : "opacity-55",
                    "focus-visible:opacity-100",
                    "focus-visible:ring-2 focus-visible:ring-brass/60",
                    "focus-visible:ring-offset-4 focus-visible:ring-offset-night",
                  ].join(" ")}
                >
                  {/* Tall portrait while pinned — a strip wants verticals.
                      Back to the footage's native 4:3 when stacked, where
                      there is width to spare and no reason to crop. */}
                  <AmbientVideo
                    src={panel.src}
                    poster={panel.poster}
                    alt={panel.alt}
                    className="h-[min(78svh,46rem)] w-full rounded-sm motion-reduce:aspect-[4/3] motion-reduce:h-auto"
                  />

                  {/* The accessible caption, and the visible one once the
                      panels are stacked. */}
                  <div className="sr-only motion-reduce:not-sr-only motion-reduce:mt-6">
                    <p className="font-display text-[clamp(1.15rem,2.3vw,1.5rem)] leading-snug text-paper">
                      {panel.question}
                    </p>
                    <div className="mt-4 space-y-1.5">
                      {panel.lines.map((line) => (
                        <p
                          key={line}
                          className="font-body text-[0.875rem] leading-relaxed text-paper/55"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
