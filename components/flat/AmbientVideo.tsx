"use client";

import { useEffect, useRef } from "react";

/*
 * A looping ambient clip. Never a player: no controls, no sound, nothing to
 * click, and nothing that will ever start on its own outside the viewport.
 *
 * The rules, all of which matter on a page with three of these:
 *
 *  - muted / autoPlay / loop / playsInline, because anything else is either
 *    blocked by the browser or rude.
 *  - preload="none" and a poster. Three clips at ~1.5MB total should not be
 *    fetched to render a section the visitor may never reach; the poster is
 *    what the browser paints until the clip is actually near the viewport.
 *  - An IntersectionObserver plays it on the way in and pauses it on the way
 *    out. A paused off-screen <video> still costs decode on some machines if
 *    it is left running, and three of them running at once is how a scroll
 *    page starts dropping frames on a laptop.
 *  - Under prefers-reduced-motion the <video> is never created at all — the
 *    poster is rendered as an ordinary <img> and no clip is requested. This
 *    is a real DOM branch rather than a CSS one because "don't download the
 *    video" cannot be expressed in CSS.
 *
 * The reduced-motion branch is decided in an effect, not during render, so
 * the server and the first client render agree and there is no hydration
 * mismatch. First paint is the poster either way, which is also the frame the
 * clip starts on — so the swap is invisible.
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

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Leave the poster <img> in place and never touch the network.
      return;
    }

    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.poster = poster;
    video.setAttribute("aria-hidden", "true");
    video.setAttribute("tabindex", "-1");
    video.className = "absolute inset-0 h-full w-full object-cover";
    video.src = src;

    host.appendChild(video);
    videoRef.current = video;

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
    </div>
  );
}
