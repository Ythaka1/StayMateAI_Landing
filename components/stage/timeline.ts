/*
 * The stage's scroll timeline.
 *
 * Beats 1, 2 and 3 share one sticky section, one canvas and one camera path,
 * so there is a single global progress value (0–1 across the whole spacer).
 * Every range that consumes it lives here, which is what keeps the canvas,
 * the copy layers and the DOM panel track from ever drifting apart.
 *
 * Beat 3's internal ranges (DOLLY, FLATTEN, FADE, PANELS_TRAVEL) are still
 * expressed against the pivot's own 0–1 progress, unchanged from pass 01;
 * `pivotProgress()` maps global → pivot so those numbers stay as tuned.
 */

/** Section heights, in svh. The spacer is their sum. */
export const BEAT_VH = {
  darkness: 110,
  descent: 260,
  pivot: 500,
} as const;

export const STAGE_HEIGHT_VH =
  BEAT_VH.darkness + BEAT_VH.descent + BEAT_VH.pivot;

const frac = (vh: number) => vh / STAGE_HEIGHT_VH;

/** Beat 1: the card alone in near-black. */
export const DARKNESS = { start: 0, end: frac(BEAT_VH.darkness) } as const;

/** Beat 2: the card comes down and lands on an implied desk. */
export const DESCENT = {
  start: DARKNESS.end,
  end: frac(BEAT_VH.darkness + BEAT_VH.descent),
} as const;

/** Beat 3: the pivot. Begins exactly where the descent ends. */
export const PIVOT = { start: DESCENT.end, end: 1 } as const;

const descentSpan = DESCENT.end - DESCENT.start;

/**
 * The fall itself, which finishes well before beat 2 does. Everything the
 * landing drives — the contact shadow, the bounce, the death of the cool rim,
 * the glass going to zero — runs on this, so the card is settled and still
 * while the copy is being read.
 */
export const LANDING = {
  start: DESCENT.start,
  end: DESCENT.start + descentSpan * 0.55,
} as const;

/**
 * The camera holds its wide framing until the copy is on its way out, then
 * converges onto the pivot's opening frame. Held any earlier and the card
 * fills the frame while the copy is still being read, with nowhere dark for
 * the copy to sit.
 */
export const CONVERGE = {
  start: DESCENT.start + descentSpan * 0.78,
  end: PIVOT.start,
} as const;

// ── Beat 3 internals, against the pivot's own 0–1 progress ──────────────────

/** Camera dollies from the landed framing into the card's surface. */
export const DOLLY = { start: 0.0, end: 0.45 } as const;

/**
 * Before the handoff the shader ramps lighting to a flat, exact-hex paper
 * field and fades the printed layer out, so that by DOLLY.end the whole
 * frame is nothing but cream + grain for any viewport aspect.
 */
export const FLATTEN = { start: 0.36, end: 0.45 } as const;

/** Cross-fade of the DOM phone layer over the canvas (~8% of the pivot). */
export const FADE = { start: 0.45, end: 0.53 } as const;

/** Canvas RAF is fully stopped at/after this pivot progress. */
export const CANVAS_SLEEP_AT = FADE.end;

/** Horizontal travel through the four panels, with a beat of rest each end. */
export const PANELS_TRAVEL = { start: 0.56, end: 0.97 } as const;

export const PANEL_COUNT = 4;

// ── Copy layers, against global progress ────────────────────────────────────

/** Beat 1's single low line. */
export const COPY_DARKNESS = {
  in: { start: 0.006, end: 0.028 },
  out: { start: 0.078, end: 0.118 },
} as const;

/**
 * Beat 2's copy fades in as the card settles, holds while nothing at all is
 * moving, and is gone before the camera converges — so it is never fighting
 * the card for the same part of the frame.
 */
export const COPY_DESCENT = {
  in: { start: LANDING.end - 0.012, end: LANDING.end + 0.038 },
  out: { start: CONVERGE.start, end: CONVERGE.start + 0.028 },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────

export type Range = { start: number; end: number };

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Normalise progress p into a 0–1 position within a range. */
export const within = (p: number, r: Range) =>
  clamp01((p - r.start) / (r.end - r.start));

/** Global progress → beat 3's own 0–1 progress. */
export const pivotProgress = (g: number) => within(g, PIVOT);

/** Beat 3's own progress → global progress. The inverse of the above. */
export const globalFromPivot = (pp: number) =>
  PIVOT.start + pp * (PIVOT.end - PIVOT.start);

/** Opacity for a copy layer that fades in and back out. */
export const band = (g: number, b: { in: Range; out: Range }) =>
  within(g, b.in) * (1 - within(g, b.out));

/** Global progress at which panel i (0-based) is centred in the frame. */
export const progressForPanel = (i: number) =>
  globalFromPivot(
    PANELS_TRAVEL.start +
      (PANELS_TRAVEL.end - PANELS_TRAVEL.start) * (i / (PANEL_COUNT - 1))
  );
