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
  pullback: 340,
  number: 220,
  fan: 300,
} as const;

export const STAGE_HEIGHT_VH =
  BEAT_VH.darkness +
  BEAT_VH.descent +
  BEAT_VH.pivot +
  BEAT_VH.pullback +
  BEAT_VH.number +
  BEAT_VH.fan;

const frac = (vh: number) => vh / STAGE_HEIGHT_VH;

/** Beat 1: the card alone in near-black. */
export const DARKNESS = { start: 0, end: frac(BEAT_VH.darkness) } as const;

/** Beat 2: the card comes down and lands on an implied desk. */
export const DESCENT = {
  start: DARKNESS.end,
  end: frac(BEAT_VH.darkness + BEAT_VH.descent),
} as const;

/** Beat 3: the pivot. Begins exactly where the descent ends. */
export const PIVOT = {
  start: DESCENT.end,
  end: frac(BEAT_VH.darkness + BEAT_VH.descent + BEAT_VH.pivot),
} as const;

/** Beat 4: the camera reverses out, and the one card becomes many. */
export const PULLBACK = {
  start: PIVOT.end,
  end: frac(
    BEAT_VH.darkness + BEAT_VH.descent + BEAT_VH.pivot + BEAT_VH.pullback
  ),
} as const;

/** Beat 5: the light goes out of the cards and one figure counts up. */
export const NUMBER = {
  start: PULLBACK.end,
  end: frac(
    BEAT_VH.darkness +
      BEAT_VH.descent +
      BEAT_VH.pivot +
      BEAT_VH.pullback +
      BEAT_VH.number
  ),
} as const;

/** Beat 6: the light returns, the cards fan out, everything comes to rest. */
export const FAN = { start: NUMBER.end, end: 1 } as const;

const descentSpan = DESCENT.end - DESCENT.start;
const pullbackSpan = PULLBACK.end - PULLBACK.start;
const numberSpan = NUMBER.end - NUMBER.start;
const fanSpan = FAN.end - FAN.start;

const lerpRange = (r: Range, a: number, b: number): Range => ({
  start: r.start + (r.end - r.start) * a,
  end: r.start + (r.end - r.start) * b,
});

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

// ── Beats 4–6, against global progress ─────────────────────────────────────

/**
 * The DOM panel layer fading back down — the mirror of FADE, and the same 8%
 * of a beat. The canvas loop resumes at PANEL_OUT.start, i.e. before this
 * begins, exactly as it does on the way in.
 */
export const PANEL_OUT = lerpRange(PULLBACK, 0, 0.09);

/**
 * The camera retraces beat 3's dolly, backwards, to the frame beat 2 ended
 * on. It is driven through the very same dollyAt()/FLATTEN code by running a
 * pivot-equivalent progress back down — see canvasPivotProgress().
 */
export const RETURN = lerpRange(PULLBACK, 0, 0.44);

/** Then it keeps going, and the array of cards comes with it. */
export const RECEDE = lerpRange(PULLBACK, 0.4, 1);

/** Beat 5: the light leaves the cards, and later comes back in beat 6. */
export const LIGHTS_OUT = lerpRange(NUMBER, 0, 0.5);
export const LIGHTS_UP = lerpRange(FAN, 0, 0.5);

/**
 * The corridor rearranges into the fan. Most of it happens while the cards
 * are dark, so beat 6 opens on a fan that is already most of the way there
 * and only the last of the settle is seen.
 */
export const FAN_SETTLE = {
  start: NUMBER.start + numberSpan * 0.5,
  end: FAN.start + fanSpan * 0.45,
} as const;

/**
 * The retreat, and then the settle. Two ranges rather than one long ease,
 * because the pull-back has to be finished before beat 4's copy arrives —
 * a single ease across beats 4 to 6 leaves the hero card still filling the
 * frame at the moment the line about the whole property fades in, and the
 * two end up on the same pixels.
 */
export const RETREAT_OUT = lerpRange(PULLBACK, 0.4, 0.72);

/** Then the camera eases back in a little to frame the fan, and stops. */
export const RETREAT_IN = {
  start: NUMBER.start + numberSpan * 0.45,
  end: FAN.start + fanSpan * 0.5,
} as const;

/** Beat 5's figure starts counting once, when it is reached on the way down. */
export const COUNT_AT = NUMBER.start + numberSpan * 0.42;

/**
 * The canvas sleeps twice: behind the opaque panel layer in beat 3, and
 * through the middle of beat 5 where the frame is a static dark field and
 * the only thing moving is a DOM number.
 */
export const CANVAS_DARK = {
  start: LIGHTS_OUT.end,
  end: LIGHTS_UP.start,
} as const;

/** True where the RAF loop should be fully stopped, not merely invisible. */
export const canvasAsleep = (g: number) => {
  const inPanels = pivotProgress(g) >= CANVAS_SLEEP_AT && g < PANEL_OUT.start;
  const inDark = g >= CANVAS_DARK.start && g < CANVAS_DARK.end;
  return inPanels || inDark;
};

/**
 * Beat 3's progress for everything the canvas does — the dolly, the flatten.
 * Beyond the pivot it runs back down through the same numbers, so beat 4's
 * return is beat 3 played backwards with no second code path to drift.
 *
 * The jump from 1 to FADE.end at PIVOT.end is deliberate and invisible: every
 * value in [FADE.end, 1] produces an identical camera and an identical uFlat
 * (the dolly finished at 0.45 and the flatten at 0.45), so the two ends of
 * the jump render the same frame. Only the DOM panel layer differs across
 * that span, and that is driven separately by PANEL_OUT.
 */
export const canvasPivotProgress = (g: number) =>
  g <= PIVOT.end
    ? pivotProgress(g)
    : CANVAS_SLEEP_AT * (1 - within(g, RETURN));

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

/** Beat 4's line, once the camera has finished retreating. */
export const COPY_PULLBACK = {
  in: lerpRange(PULLBACK, 0.74, 0.86),
  out: lerpRange(PULLBACK, 0.95, 1),
} as const;

/** Beat 5's figure and its one line. */
export const COPY_NUMBER = {
  in: lerpRange(NUMBER, 0.3, 0.44),
  out: lerpRange(NUMBER, 0.88, 1),
} as const;

/** Beat 6's pilot offer, which arrives with the light and then stays. */
export const COPY_OFFER = {
  in: lerpRange(FAN, 0.3, 0.46),
  out: { start: 1.5, end: 2 }, // never — this is the close
} as const;

/** The nav fades in only once beat 1 has released the opening frame. */
export const NAV_IN = {
  in: { start: DARKNESS.end * 0.8, end: DARKNESS.end * 1.25 },
  out: { start: 1.5, end: 2 },
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
