/*
 * The pivot's scroll timeline. One progress value (0–1 across the 500vh
 * spacer) drives everything; every range that consumes it lives here so the
 * canvas and the DOM layer can never drift apart.
 */

export const SECTION_HEIGHT_VH = 500;

/** Camera dollies from PIVOT_START to PIVOT_END across this range. */
export const DOLLY = { start: 0.0, end: 0.45 } as const;

/**
 * Before the handoff the shader ramps lighting to a flat, exact-hex paper
 * field and fades the printed layer out, so that by DOLLY.end the whole
 * frame is nothing but cream + grain for any viewport aspect.
 */
export const FLATTEN = { start: 0.36, end: 0.45 } as const;

/** Cross-fade of the DOM phone layer over the canvas (~8% of the section). */
export const FADE = { start: 0.45, end: 0.53 } as const;

/** Canvas RAF is fully stopped at/after this progress, resumed below it. */
export const CANVAS_SLEEP_AT = FADE.end;

/** Horizontal travel through the four panels, with a beat of rest each end. */
export const PANELS_TRAVEL = { start: 0.56, end: 0.97 } as const;

export const PANEL_COUNT = 4;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Normalise progress p into a 0–1 position within a range. */
export const within = (p: number, r: { start: number; end: number }) =>
  clamp01((p - r.start) / (r.end - r.start));

/** Progress value at which panel i (0-based) is centred in the frame. */
export const progressForPanel = (i: number) =>
  PANELS_TRAVEL.start +
  (PANELS_TRAVEL.end - PANELS_TRAVEL.start) * (i / (PANEL_COUNT - 1));
