"use client";

import { useEffect, useRef, useState } from "react";

/*
 * A looping ambient clip.
 *
 * The rules, all of which matter on a page with three of these:
 *
 *  - muted / loop / playsInline, because anything else is either blocked by
 *    the browser or rude.
 *  - preload="none" and a poster. Three clips at ~1.5MB total should not be
 *    fetched to render a section the visitor may never reach; the poster is
 *    what the browser paints until the clip is actually near the viewport.
 *  - An IntersectionObserver plays it on the way in and pauses it on the way
 *    out. A paused off-screen <video> still costs decode on some machines if
 *    it is left running, and three of them running at once is how a scroll
 *    page starts dropping frames on a laptop.
 *
 * ── Reduced motion (pass 09) ──────────────────────────────────────────────
 * A clip that starts itself and then loops forever is the clearest case of
 * autonomous motion on this page, so under the preference it does not start.
 * What changed in pass 09 is that it now exists: the <video> is created, with
 * preload="none" so not a byte of it is fetched, the poster is what shows,
 * and a play control sits over it.
 *
 * The difference matters. Before, the preference removed the clip from the
 * page entirely, and a visitor whose phone had quietly switched on Battery
 * Saver — which forces the preference in Chrome on Android — could not watch
 * the product work even if they wanted to. Now the choice is theirs and it
 * costs one tap. Nothing is downloaded until they take it, which is the same
 * bargain preload="none" was making anyway.
 *
 * Once started by hand it is left running and looping: they asked for it.
 *
 * The branch is decided in an effect, not during render, so the server and
 * the first client render agree and there is no hydration mismatch. First
 * paint is the poster either way, which is also the frame the clip starts on,
 * so the swap is invisible.
 */
export function AmbientVideo({
  src,
  poster,
  alt,
  className,
}: {
  /** Path under /media, without extension. */
  src: string;
  poster: string;
  /** Describes the clip for the reduced-motion still and for assistive tech. */
  alt: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /*
   * Null until the effect has run, so the server and the first client render
   * agree on a poster and nothing else. Then "auto" or "manual".
   *
   * "manual" is what draws the play button, and it is cleared the moment the
   * visitor uses it — the control is an invitation, not a transport, and
   * leaving it sitting over a playing clip would make this the video player
   * this component has spent three passes not being.
   */
  const [mode, setMode] = useState<"auto" | "manual" | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(calm ? "manual" : "auto");

    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    // Never anything else, in either mode. In the auto path the observer is
    // what pulls the bytes; in the manual path the tap is. Neither wants the
    // browser fetching a clip for a section nobody has reached.
    video.preload = "none";
    video.poster = poster;
    video.setAttribute("aria-hidden", "true");
    video.setAttribute("tabindex", "-1");
    video.className = "absolute inset-0 h-full w-full object-cover";
    video.src = src;

    host.appendChild(video);
    videoRef.current = video;

    // The element exists in both modes; only the auto path gets an observer
    // that starts it. Under the preference the clip sits at its poster frame
    // until somebody asks for it.
    if (calm) {
      return () => {
        video.removeAttribute("src");
        video.load();
        video.remove();
        videoRef.current = null;
      };
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() rejects if the tab is backgrounded or the decoder is busy.
          // The poster is already on screen, so there is nothing to recover.
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "15% 0px" }
    );
    io.observe(host);

    return () => {
      io.disconnect();
      video.pause();
      video.removeAttribute("src");
      video.load(); // releases the decoder rather than leaving it parked
      video.remove();
      videoRef.current = null;
    };
  }, [src, poster]);

  const start = () => {
    const video = videoRef.current;
    if (!video) return;
    setMode("auto");
    void video.play().catch(() => {
      // Nothing to fall back to: the poster is already the frame on screen.
    });
  };

  return (
    <div
      ref={hostRef}
      className={`relative overflow-hidden bg-night ${className ?? ""}`}
    >
      {/*
        Plain <img>, not next/image. The poster is a fixed-size decorative
        still behind a video of the same frame; the optimiser's srcset and
        blur placeholder buy nothing here and the <video> would end up
        layered over a wrapper it does not control.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/*
        The play control. A real <button>, so it is reachable by keyboard and
        announced as what it is, and it names the clip rather than saying
        "Play" — this is the only description of the clip a screen reader
        will get, and it should still be worth reading if the answer is no.

        Brass on a scrim rather than a chrome play glyph: the rest of this
        page is set in one face and two colours and a borrowed player chevron
        would be the only piece of interface furniture on it.
      */}
      {mode === "manual" && (
        <button
          type="button"
          onClick={start}
          className="group absolute inset-0 flex items-center justify-center bg-night/25 transition-colors hover:bg-night/10 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brass"
        >
          <span className="flex items-center gap-3 rounded-full border border-brass/50 bg-night/70 px-5 py-2.5 backdrop-blur-sm transition-colors group-hover:border-brass">
            <span
              aria-hidden="true"
              className="block h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-brass"
            />
            <span className="font-body text-[0.6875rem] uppercase tracking-[0.28em] text-paper/85">
              Play
            </span>
          </span>
          <span className="sr-only">{alt}</span>
        </button>
      )}
    </div>
  );
}
