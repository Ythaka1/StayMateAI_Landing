import { AmbientVideo } from "./AmbientVideo";
import { Reveal } from "./Reveal";

/*
 * Section 5 — the room.
 *
 * One idea: the three things a guest actually asks for, each as a place
 * rather than a feature. One device: a looping clip beside a short exchange,
 * with the clip changing sides down the page.
 *
 * The clips are never behind the copy, only beside it. That is a rule rather
 * than a preference — candle.mp4 is very dark by design, and the way to keep
 * copy legible over it is to not put copy over it. Brightening the clip in
 * CSS to make text work would throw away the only thing that makes a spa
 * clip read as a spa.
 *
 * All three are 4:3, so the frame is 4:3 and nothing is cropped to fit a
 * shape the footage was not shot for.
 */

const PANELS = [
  {
    src: "/media/water.mp4",
    poster: "/media/water-poster.jpg",
    alt: "A hotel pool at dusk, the surface barely moving.",
    question: "Where's the pool?",
    lines: [
      "Rooftop, level six. Open 6am to 9pm.",
      "Towels are by the loungers — nothing to carry up.",
    ],
  },
  {
    src: "/media/steam.mp4",
    poster: "/media/steam-poster.jpg",
    alt: "Steam rising on a breakfast terrace in early light.",
    question: "When's breakfast?",
    lines: [
      "6:30 to 10:30, in the courtyard on the ground floor.",
      "Room service runs the same menu until 11.",
    ],
  },
  {
    src: "/media/candle.mp4",
    poster: "/media/candle-poster.jpg",
    alt: "A candle burning in a darkened spa room.",
    question: "Anywhere I can get a massage?",
    lines: [
      "Deep tissue or aromatherapy, sixty minutes.",
      "Two slots left tonight — 7:30 and 9:00.",
    ],
  },
] as const;

export function TheRoom() {
  return (
    <section
      className="relative bg-night px-6 py-28 sm:px-10 sm:py-36"
      aria-label="What a guest asks for"
    >
      <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-24 sm:gap-32">
        {PANELS.map((panel, i) => {
          // Left, right, left. The alternation is what stops three identical
          // rows from reading as a spec table.
          const videoRight = i % 2 === 1;
          return (
            <div
              key={panel.src}
              className="flex flex-col gap-8 sm:grid sm:grid-cols-2 sm:items-center sm:gap-14"
            >
              <AmbientVideo
                src={panel.src}
                poster={panel.poster}
                alt={panel.alt}
                className={[
                  "aspect-[4/3] w-full rounded-sm",
                  videoRight ? "sm:order-2" : "sm:order-1",
                ].join(" ")}
              />
              <div className={videoRight ? "sm:order-1" : "sm:order-2"}>
                <Reveal
                  as="h3"
                  text={panel.question}
                  className="block font-display text-[clamp(1.5rem,3.6vw,2.1rem)] leading-tight tracking-[-0.015em] text-paper"
                />
                <div className="mt-5 space-y-1.5">
                  {panel.lines.map((line) => (
                    <p
                      key={line}
                      className="font-body text-[0.9375rem] leading-relaxed text-paper/55"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
