/*
 * The stage's scroll timeline.
 *
 * The six 3D beats share one camera path and one global progress value
 * (0–1 across the whole path). Every range that consumes it lives here,
 * which is what keeps the canvas, the copy layers and the DOM panel track
 * from ever drifting apart.
 *
 * Since pass 04 that one path is no longer one scroll spacer. The 3D is
 * punctuation now: it is cut into three segments (see SEGMENTS below) with
 * flat photographic sections between them. The camera path itself is
 * untouched — each segment maps its own 0–1 scroll progress into its slice
 * of the same global 0–1, so the three segments read as one continuous move
 * interrupted, not as three separate animations.
 *
 * Beat 3's internal ranges (DOLLY, FLATTEN, FADE, PANELS_TRAVEL) are still
 * expressed against the pivot's own 0–1 progress, unchanged from pass 01;
 * `pivotProgress()` maps global → pivot so those numbers stay as tuned.
 */

/** Section heights, in svh. */
export const BEAT_VH = {
  darkness: 110,
  descent: 260,
  pivot: 500,
  pullback: 340,
  number: 220,
  // Was 300 while the pilot offer was rendered over the fan. The offer is a
  // flat section now (section 9), so this beat carries no copy at all — it
  // is the last held frame of the 3D and nothing more, and only needs enough
  // travel for the fan to finish settling before the plans scroll over it.
  fan: 120,
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

// ── The three 3D segments ──────────────────────────────────────────────────

/**
 * The camera path, cut into the three places the site actually shows it.
 * `start`/`end` are slices of the same global 0–1 and are contiguous, so the
 * frame a segment ends on is the frame the next one opens on — which is why
 * the cuts read as a held breath rather than a jump.
 *
 * `vh` is that segment's scroll travel. The spacer is `vh + 100svh` tall
 * because the sticky child is one viewport high, so travel = height − 100svh.
 *
 * The split points are chosen where the camera is already still: the end of
 * the descent (the card landed and at rest) and the end of the pivot (the
 * frame is a flat cream field). Cutting anywhere the camera is moving would
 * show as a stutter when the next segment resumes.
 */
export const SEGMENTS = [
  {
    id: "descent",
    start: DARKNESS.start,
    end: PIVOT.start,
    vh: BEAT_VH.darkness + BEAT_VH.descent,
  },
  {
    id: "pivot",
    start: PIVOT.start,
    end: PIVOT.end,
    vh: BEAT_VH.pivot,
  },
  {
    id: "corridor",
    start: PIVOT.end,
    end: FAN.end,
    vh: BEAT_VH.pullback + BEAT_VH.number + BEAT_VH.fan,
  },
] as const;

export type SegmentId = (typeof SEGMENTS)[number]["id"];

/** A segment's own 0–1 scroll progress → global camera progress. */
export const globalFromSegment = (index: number, local: number) => {
  const s = SEGMENTS[index];
  return s.start + local * (s.end - s.start);
};

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
 * The card turns over as it falls, and lands with its blank back to camera.
 *
 * Ends where the fall does, so the turn and the landing are one movement
 * rather than two. It is a spring target rather than a position: the scroll
 * says where the card should be pointing and the spring decides how it gets
 * there, which is what gives the turn weight and lets it settle past the
 * landing instead of arriving exactly on it.
 */
export const FLIP = {
  start: DESCENT.start,
  end: DESCENT.start + descentSpan * 0.55,
} as const;

/**
 * The line fading onto the back face. It starts as the card comes to rest,
 * not while it is still turning, because paper does not answer mid air.
 */
export const BACK_INK = {
  start: DESCENT.start + descentSpan * 0.52,
  end: DESCENT.start + descentSpan * 0.68,
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
 * The camera retraces beat 3's dolly, backwards, to the frame beat 2 ended
 * on. It is driven through the very same dollyAt()/FLATTEN code by running a
 * pivot-equivalent progress back down — see canvasPivotProgress().
 */
/*
 * Tightened from 0.44 in pass 04. This retrace used to begin under an opaque
 * cream DOM layer that was fading down over it, so its first half being a
 * featureless cream field cost nothing — there was something else on top of
 * it. Now the corridor segment opens cold on this frame, straight out of a
 * dark flat section, and every scroll pixel spent before the card is
 * recognisable is a blank white screen. Half the distance, same move.
 */
export const RETURN = lerpRange(PULLBACK, 0, 0.24);

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

/**
 * True where the RAF loop should be fully stopped, not merely invisible.
 *
 * Takes the segment as well as the progress because the two ends of the cut
 * at PIVOT.end share a progress value but not a state: the pivot segment
 * finishes behind an opaque panel layer (asleep), while the corridor segment
 * opens on that same frame with the panel layer gone (awake, and about to
 * dolly back out). Deriving this from `g` alone cannot tell them apart.
 */
export const canvasAsleep = (g: number, segment: SegmentId) => {
  const inPanels = segment === "pivot" && pivotProgress(g) >= CANVAS_SLEEP_AT;
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

/**
 * The hero: the wordmark and the one line.
 *
 * It arrives sooner and leaves later than the single low line it replaced,
 * because it is now the whole opening composition rather than a caption
 * under a floating object. It is fully up before the card has moved at all
 * and it is gone before the descent has properly started.
 */
export const COPY_HERO = {
  // Already at full before the page has been scrolled at all. The line this
  // replaced faded in from scroll, which was survivable for one small
  // caption and is not survivable for the whole opening composition: at
  // scroll zero, which is where every visitor starts, the frame had no
  // wordmark in it. The hero's own entrance is a CSS animation on its
  // children instead, so it plays on load rather than on input.
  in: { start: -0.02, end: -0.01 },
  out: { start: 0.05, end: 0.082 },
} as const;

/**
 * How much of the cursor parallax applies. Full while the card is standing
 * in the room, and retired as the descent takes over: once the card is
 * falling, scroll owns it completely and a pointer nudging the camera would
 * be two hands on the same object.
 *
 * Consumers multiply by this, so at 0 every parallax term is exactly zero
 * and the camera path is bit-identical to the path with no pointer at all.
 */
export const PARALLAX_OUT = {
  start: DARKNESS.end * 0.75,
  end: DARKNESS.end + (DESCENT.end - DESCENT.start) * 0.12,
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

/*
 * Beat 6 has no copy layer. The pilot offer used to be rendered over the fan;
 * it is section 9 now, a flat section after the 3D has finished. The fan is
 * punctuation — it ends the last segment and hands off to the plans.
 */

/**
 * The nav comes up only once the hero wordmark has completely gone.
 *
 * `in.start` is COPY_HERO.out.end exactly, not near it. There are two
 * wordmarks on this site, one enormous and one small, and if their ranges
 * overlap by even a few percent the result is a crossfade between two sizes
 * of the same word, which reads as a rendering fault rather than as a
 * transition. One leaves, then the other arrives.
 *
 * It never fades back out; see the latch in Stage, which is what keeps it on
 * through the flat sections, where nothing is writing this value at all.
 */
export const NAV_IN = {
  in: { start: COPY_HERO.out.end, end: COPY_HERO.out.end + 0.018 },
  out: { start: 1.5, end: 2 },
} as const;

/**
 * The photographic plate behind the canvas. Full while the card is in the
 * room, and gone by the time the camera converges on the pivot, because from
 * there the frame is the card's own surface and a desk behind it would be
 * showing through a sheet of paper.
 */
export const PLATE_OUT = {
  start: CONVERGE.start,
  end: CONVERGE.start + (CONVERGE.end - CONVERGE.start) * 0.7,
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

/**
 * The pivot segment's own 0–1 progress at which panel i (0-based) is centred.
 * Segment-local rather than global, because the thing that has to be scrolled
 * is the pivot segment's spacer.
 */
export const progressForPanel = (i: number) =>
  PANELS_TRAVEL.start +
  (PANELS_TRAVEL.end - PANELS_TRAVEL.start) * (i / (PANEL_COUNT - 1));
