import { PhotoField } from "./PhotoField";
import { Reveal } from "./Reveal";

/*
 * Section 6 — every language.
 *
 * One device, and only one: the same question, orbiting. Eight languages
 * turning slowly around a single answer that does not move. Nothing else on
 * the section animates, nothing fades in on a stagger, nothing counts up.
 *
 * The rotation is CSS transform only — no JS, no rAF, no scroll coupling. It
 * runs at a fixed 110s per turn whether or not the section is on screen,
 * which is cheap enough to be true (two transform animations on a composited
 * layer) and means it is never caught mid-jump when scrolled back to.
 *
 * Under prefers-reduced-motion the animations are switched off in CSS and the
 * ring becomes exactly what it looks like standing still: a static
 * arrangement of eight questions around an answer. It loses nothing.
 *
 * ── On the translations ───────────────────────────────────────────────────
 * A wrong translation on a page whose entire claim is "it speaks your
 * language" is worse than one fewer language, so these are set plainly, with
 * each locale's own punctuation, and each carries a `lang` attribute so a
 * screen reader switches voice rather than reading Japanese as English.
 * Arabic additionally carries dir="rtl".
 */

const QUESTIONS = [
  { lang: "de", label: "Deutsch", text: "Wo ist der Pool?" },
  { lang: "es", label: "Español", text: "¿Dónde está la piscina?" },
  // French sets a narrow no-break space before a question mark.
  { lang: "fr", label: "Français", text: "Où est la piscine ?" },
  { lang: "ja", label: "日本語", text: "プールはどこですか？" },
  { lang: "zh-Hans", label: "中文", text: "游泳池在哪里？" },
  { lang: "pt", label: "Português", text: "Onde fica a piscina?" },
  { lang: "ar", label: "العربية", text: "أين المسبح؟", rtl: true },
  { lang: "sw", label: "Kiswahili", text: "Bwawa la kuogelea liko wapi?" },
] as const;

export function EveryLanguage() {
  return (
    <section
      className="relative overflow-hidden bg-night px-6 py-28 sm:px-10 sm:py-36"
      aria-label="The same question in eight languages"
    >
      {/*
        blotter.jpg, pushed down until it is barely an image at all — dark
        green leather at low contrast, there to give the black a grain rather
        than to be looked at. If a visitor can tell what it is a photograph
        of, it is too bright.
      */}
      <PhotoField
        src="/media/blotter.png"
        tone="#0d100e"
        scrim="radial-gradient(120% 90% at 50% 45%, rgba(11,12,14,0.55) 0%, rgba(11,12,14,0.88) 60%, rgba(11,12,14,0.96) 100%)"
      />

      <div className="relative mx-auto w-full max-w-[52rem]">
        <div className="orbit relative mx-auto flex w-full flex-col items-center gap-6 sm:block">
          {/* The still centre: one answer, which is the whole point. */}
          {/* Narrow enough that the two labels at 9 and 3 o'clock never reach
              it. The ring's radius is the other half of that clearance. */}
          <div className="z-10 mx-auto max-w-[13rem] text-center sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
            <p className="font-body text-[0.6875rem] uppercase tracking-[0.18em] text-brass">
              StayMate
            </p>
            <p className="mt-3 font-display text-[clamp(1.05rem,2.6vw,1.3rem)] leading-snug text-paper">
              Rooftop, level six. Open 6am to 9pm.
            </p>
          </div>

          {/* display:contents below sm drops the implicit list role in most
              engines, so it is put back by hand. */}
          <ul
            role="list"
            className="animate-orbit-spin orbit-ring contents sm:block"
          >
            {QUESTIONS.map((q, i) => (
              <li
                key={q.lang}
                className="orbit-item"
                style={
                  { "--a": `${(360 / QUESTIONS.length) * i}deg` } as React.CSSProperties
                }
              >
                <div className="animate-orbit-counter text-center">
                  <p
                    lang={q.lang}
                    dir={"rtl" in q && q.rtl ? "rtl" : undefined}
                    className="whitespace-nowrap font-body text-[0.875rem] text-paper/70"
                  >
                    {q.text}
                  </p>
                  <p className="mt-1 font-body text-[0.625rem] uppercase tracking-[0.16em] text-brass/60">
                    {q.label}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Reveal
          as="h2"
          text="Whatever language they arrive in, it's already speaking it."
          className="mx-auto mt-20 block max-w-[32rem] text-center font-display text-[clamp(1.4rem,3.6vw,2rem)] leading-snug tracking-[-0.015em] text-paper sm:mt-24"
        />
      </div>
    </section>
  );
}
