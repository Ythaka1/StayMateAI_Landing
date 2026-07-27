"use client";

import Image from "next/image";
import { useState } from "react";

/*
 * A full-bleed photograph used as a field for type to sit on.
 *
 * next/image with `fill` rather than a CSS background-image: these are the
 * largest things the page downloads, and the optimiser's AVIF/WebP plus a
 * width-appropriate srcset is worth more here than anywhere else on the site.
 * `sizes="100vw"` because that is literally true of every one of them.
 *
 * Two layers under the type, never one:
 *
 *  - `tone`, a solid that shows through before the photograph has loaded and
 *    sits under it permanently. Every one of these photographs is dark, so
 *    the section reads as intended while the image is in flight.
 *  - `scrim`, the darkening. A gradient rather than a flat wash, so the
 *    photograph keeps a lit side — flooding the whole frame with black is how
 *    an art-directed image ends up looking like a stock image behind a filter.
 *
 * ── Why this is a client component ────────────────────────────────────────
 * onError. A photograph that 404s leaves an <img> in the broken state, and
 * Chrome paints its broken-image glyph in the corner — over a section whose
 * whole job is to be a dark field. Unmounting the image on error drops the
 * section cleanly back to its `tone`, which is what it is designed to fall
 * back to. This matters in production, and it matters right now, because the
 * four stills are not in the repository yet (see public/media/README.md).
 *
 * Nothing here is decorative by accident: `alt` is empty and the wrapper is
 * aria-hidden, because in every case the copy over the top says what the
 * section means and the photograph is atmosphere.
 */
export function PhotoField({
  src,
  tone = "var(--night)",
  position = "center",
  scrim,
  priority = false,
}: {
  src: string;
  /** The solid underneath. Shows before — or instead of — the photograph. */
  tone?: string;
  /** object-position, for photographs composed off-centre. */
  position?: string;
  /** The darkening ramp, as a CSS gradient. */
  scrim?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: tone }}
    >
      {failed ? null : (
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover"
          style={{ objectPosition: position }}
        />
      )}
      {scrim ? (
        <div className="absolute inset-0" style={{ background: scrim }} />
      ) : null}
    </div>
  );
}
