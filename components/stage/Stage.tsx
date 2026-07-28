"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { MotionConfig } from "framer-motion";
import { createCardScene, type CardScene } from "./scene";
import { PANELS, Panel } from "./Panels";
import { HeroCopy, DescentCopy, PullbackCopy, ScrollCue } from "./Copy";
import { HeroPlate } from "./HeroPlate";
import { NumberBeat, type NumberBeatHandle } from "./NumberBeat";
import { Nav } from "@/components/site/Nav";
import DebugOverlay from "./DebugOverlay";
import { debugEnabled, stageDebug } from "./debug";
import {
  COPY_HERO,
  COPY_DESCENT,
  COPY_NUMBER,
  COPY_PULLBACK,
  COUNT_AT,
  FADE,
  NAV_IN,
  PANELS_TRAVEL,
  PANEL_COUNT,
  PARALLAX_OUT,
  PLATE_OUT,
  SEGMENTS,
  band,
  canvasAsleep,
  clamp01,
  globalFromSegment,
  pivotProgress,
  progressForPanel,
  within,
} from "./timeline";
import { getLenis } from "@/lib/lenis";
import { createPointerSpring } from "@/lib/pointer";

/*
 * The 3D, and only the 3D.
 *
 * ── What changed in pass 04 ───────────────────────────────────────────────
 * The site used to be one unbroken camera move down one very tall spacer.
 * That is why the long verticals felt empty: a continuous camera has to fill
 * every moment of its own length, and there was nothing to fill them with.
 *
 * The camera path itself is unchanged. What changed is that it is now cut
 * into three segments — the descent, the pivot, the corridor — with flat
 * photographic sections between them, passed in as `afterDescent`,
 * `afterPivot` and `afterCorridor`. The 3D is punctuation; the flat sections
 * are the page.
 *
 * The cuts are at PIVOT.start and PIVOT.end, both points where the camera is
 * already at rest, and each segment maps its own scroll into its slice of the
 * same global 0–1 (see SEGMENTS in timeline.ts). The frame a segment ends on
 * is therefore the exact frame the next one opens on, which is what keeps
 * three spacers reading as one interrupted move rather than three animations.
 *
 * ── One canvas, three windows ─────────────────────────────────────────────
 * There is still exactly one WebGL context. The canvas is position:fixed
 * behind the document; the flat sections are opaque and scroll over it, and
 * the three segments are transparent spacers — windows onto it. Three
 * canvases would be three contexts, and browsers start evicting them at
 * around sixteen.
 *
 * Nothing here preventDefaults wheel or touch; the page scrolls normally and
 * only the visual is pinned.
 *
 * Reduced motion is handled structurally in CSS (motion-reduce: variants),
 * not by swapping React trees — so there is no hydration flash and no layout
 * shift. In that path no WebGL context is created at all and the segments
 * become plain stacked dark sections.
 */

/** Spacer height for a segment: its travel plus the one sticky viewport. */
const spacerVh = (vh: number) => `${vh + 100}svh`;

/**
 * A transparent window onto the fixed canvas, with its copy pinned inside it.
 *
 * Module scope, not an inner function: an inner component is a new type on
 * every render, so React would unmount and rebuild the whole subtree — and
 * with it the canvas overlays and the panel track — every time `active`
 * changed.
 */
function Segment({
  innerRef,
  index,
  label,
  children,
}: {
  innerRef: RefObject<HTMLDivElement | null>;
  index: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={innerRef}
      className="relative motion-reduce:!h-auto"
      style={{ height: spacerVh(SEGMENTS[index].vh) }}
      data-stage={label}
    >
      {/* overflow-clip, not hidden: a hidden box is still a scroll container,
          so the browser can scrollLeft the track when focus lands on an
          off-frame panel. clip creates no scrollport at all, which makes that
          whole failure mode impossible.

          No background: this is a window onto the fixed canvas behind the
          document. The motion-reduce path has no canvas, so there it takes
          the near-black the canvas would otherwise have cleared to. */}
      <div className="sticky top-0 h-[100svh] overflow-clip motion-reduce:static motion-reduce:h-auto motion-reduce:overflow-visible motion-reduce:bg-night">
        {children}
      </div>
    </div>
  );
}

export default function Stage({
  afterDescent,
  afterPivot,
  afterCorridor,
}: {
  afterDescent?: ReactNode;
  afterPivot?: ReactNode;
  afterCorridor?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const descentSegRef = useRef<HTMLDivElement>(null);
  const pivotSegRef = useRef<HTMLDivElement>(null);
  const corridorSegRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const plateLayerRef = useRef<HTMLDivElement>(null);
  const plateImgRef = useRef<HTMLDivElement>(null);
  const lampRef = useRef<HTMLDivElement>(null);
  const descentRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pullbackRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const countRef = useRef<NumberBeatHandle>(null);
  const reducedRef = useRef(false);

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    const cue = cueRef.current;
    const plateLayer = plateLayerRef.current;
    const plateImg = plateImgRef.current;
    const lamp = lampRef.current;
    const descent = descentRef.current;
    const layer = layerRef.current;
    const track = trackRef.current;
    const pullback = pullbackRef.current;
    const numberEl = numberRef.current;
    const nav = navRef.current;
    const spacers = [
      descentSegRef.current,
      pivotSegRef.current,
      corridorSegRef.current,
    ];
    if (
      !canvas || !hero || !cue || !plateLayer || !plateImg || !lamp ||
      !descent || !layer || !track ||
      !pullback || !numberEl || !nav || spacers.some((s) => !s)
    ) {
      return;
    }
    const segs = spacers as HTMLDivElement[];

    // TEMPORARY diagnostics (?debug=1). Remove with debug.ts.
    const DEBUG = debugEnabled();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (DEBUG) {
      stageDebug.reducedMotion = reduced.matches ? "reduce" : "no-preference";
      stageDebug.dpr = window.devicePixelRatio;
      stageDebug.clientW = canvas.clientWidth;
      stageDebug.clientH = canvas.clientHeight;
    }

    if (reduced.matches) {
      // No pin, no canvas at all. CSS has already laid the segments out as
      // stacked static sections; make every panel's copy visible.
      reducedRef.current = true;
      setActive(-1);
      return;
    }

    let scene: CardScene;
    try {
      scene = createCardScene(canvas, { isMobile: window.innerWidth < 768 });
    } catch (err) {
      // Without this the page just stays dark with nothing to read.
      if (DEBUG) stageDebug.fatal = String(err instanceof Error ? err.stack : err);
      return;
    }

    let lastApplied = "";

    const applySize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (DEBUG) {
        stageDebug.clientW = w;
        stageDebug.clientH = h;
      }
      if (w > 0 && h > 0) scene.setSize(w, h);
    };

    /**
     * Write an overlay's opacity only when it has actually changed. There are
     * several full-viewport layers over the canvas and writing all of them on
     * every scroll event costs a style recalc per layer per frame, while most
     * of them sit at a flat 0 or 1 the whole time.
     *
     * Deliberately opacity only — not visibility or display. Hiding the panel
     * layer would take it out of the tab order, and hiding the copy layers
     * would take those beats out of the accessibility tree, where they are
     * the only copy the beats have.
     */
    const opacities = new WeakMap<HTMLElement, number>();
    const setLayerOpacity = (el: HTMLElement, v: number) => {
      const q = Math.round(v * 500) / 500;
      if (opacities.get(el) === q) return;
      opacities.set(el, q);
      el.style.opacity = String(q);
    };

    let lastTrack = -1;
    let lastPointer = "";
    let lastVisible = "";
    let lastPlateVis = "";
    // How much of the cursor parallax applies at the current scroll position.
    // Written by apply(), read by the pointer loop below.
    let parallaxAmt = 0;
    // The nav only ever comes on. Nothing writes it while a flat section
    // fills the viewport, so without the latch it would blink off between
    // segments.
    let navLatch = 0;
    const raiseNav = (v: number) => {
      if (v <= navLatch) return;
      navLatch = v;
      setLayerOpacity(nav, v);
    };

    /**
     * Which segment owns the camera right now, and how far through it we are.
     *
     * Coverage, rather than "the first one intersecting": at a boundary two
     * spacers can both be on screen, and the one that should be driving is
     * the one being looked at. Every flat section between them is at least a
     * viewport tall, so in practice this is never ambiguous.
     */
    const readSegment = () => {
      const vh = window.innerHeight;
      let index = -1;
      let cover = 0;
      let local = 0;
      for (let i = 0; i < segs.length; i++) {
        const r = segs[i].getBoundingClientRect();
        const seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (seen <= cover) continue;
        cover = seen;
        index = i;
        const travel = r.height - vh;
        local = travel > 0 ? clamp01(-r.top / travel) : 0;
      }
      return { index, local };
    };

    const apply = () => {
      const { index, local } = readSegment();

      // Nothing 3D on screen: the canvas is behind an opaque flat section.
      // Stop the loop and take it out of the compositor entirely.
      if (index < 0) {
        if (lastVisible !== "hidden") {
          lastVisible = "hidden";
          canvas.style.visibility = "hidden";
        }
        if (lastPlateVis !== "hidden") {
          lastPlateVis = "hidden";
          plateLayer.style.visibility = "hidden";
        }
        parallaxAmt = 0;
        scene.stop();
        raiseNav(window.scrollY > window.innerHeight ? 1 : 0);
        lastApplied = "";
        return;
      }

      const segment = SEGMENTS[index];
      const g = globalFromSegment(index, local);

      if (DEBUG) {
        stageDebug.progress = g;
        stageDebug.scrollY = Math.round(window.scrollY);
        const r = segs[index].getBoundingClientRect();
        stageDebug.spacerTop = Math.round(r.top);
        stageDebug.spacerH = Math.round(r.height);
        stageDebug.onScreen = true;
      }

      // Keyed on the segment as well as the progress: the two ends of a cut
      // share a progress value but not a state.
      const key = `${index}:${g}`;
      if (key === lastApplied) return;
      lastApplied = key;

      if (lastVisible !== "visible") {
        lastVisible = "visible";
        canvas.style.visibility = "visible";
      }

      scene.setProgress(g);

      // The descent segment's copy.
      setLayerOpacity(hero, band(g, COPY_HERO));
      setLayerOpacity(descent, band(g, COPY_DESCENT));

      /*
       * The photographic plate. Only the descent segment ever shows it: the
       * pivot is inside the card's own surface and the corridor is a room
       * full of cards, and a desk showing through either would be a second
       * room behind the first.
       */
      const plate =
        segment.id === "descent" ? 1 - within(g, PLATE_OUT) : 0;
      setLayerOpacity(plateLayer, plate);
      // visibility, not just opacity: an opacity-0 fixed full-viewport layer
      // is still composited on every frame of the rest of the page.
      const plateVis = plate > 0.002 ? "visible" : "hidden";
      if (plateVis !== lastPlateVis) {
        lastPlateVis = plateVis;
        plateLayer.style.visibility = plateVis;
      }

      // How much of the pointer applies here. Retired as the descent starts.
      parallaxAmt = 1 - within(g, PARALLAX_OUT);

      // The corridor segment's copy.
      setLayerOpacity(pullback, band(g, COPY_PULLBACK));
      setLayerOpacity(numberEl, band(g, COPY_NUMBER));

      raiseNav(band(g, NAV_IN));

      // The count runs once, on the way down, and never again.
      if (g >= COUNT_AT) countRef.current?.run();

      /*
       * The pivot segment: cross-fade the DOM phone layer up over the canvas.
       *
       * It no longer fades back down — the segment ends on the panels and a
       * flat section takes over. Gated on the segment rather than on `g`,
       * because every g past PIVOT.end has a pivot progress of 1, which would
       * otherwise leave this opaque cream layer at full strength across the
       * corridor segment.
       */
      const pp = pivotProgress(g);
      const fade = segment.id === "pivot" ? within(pp, FADE) : 0;
      setLayerOpacity(layer, fade);
      const pointer = fade >= 1 ? "auto" : "none";
      if (pointer !== lastPointer) {
        lastPointer = pointer;
        layer.style.pointerEvents = pointer;
      }

      // Horizontal travel: one transform on one container.
      const t = within(pp, PANELS_TRAVEL);
      const tx = Math.round(-75 * t * 1000) / 1000;
      if (tx !== lastTrack) {
        lastTrack = tx;
        track.style.transform = `translate3d(${tx}%, 0, 0)`;
      }

      const idx = Math.round(t * (PANEL_COUNT - 1));
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }

      // Stop the RAF loop wherever the canvas cannot be seen — behind the
      // opaque panel layer at the end of the pivot, and through the dark
      // middle of the corridor. Both resume before anything they are hiding
      // behind starts to move. Never a mere opacity-0 canvas.
      if (canvasAsleep(g, segment.id)) scene.stop();
      else scene.start();
    };

    /*
     * ── Cursor parallax ─────────────────────────────────────────────────
     *
     * One spring, three layers, one rAF. Each layer taking its own listener
     * would be three springs settling at three slightly different times,
     * which is the wobble that makes layered parallax look cheap.
     *
     * The loop only runs while the spring is still moving AND the hero is
     * still on screen, so it is not a permanent rAF: it exits the moment the
     * cursor stops, and restarts on the next pointermove.
     *
     * Amplitudes, per the direction each layer has to move:
     *   plate    8px, against the cursor  (furthest away, so it lags most)
     *   lamp     3px, with the cursor
     *   camera   4px worth, with the cursor (handled inside the scene)
     *
     * createPointerSpring returns null on coarse pointers and under reduced
     * motion, and then none of this exists at all.
     */
    const spring = createPointerSpring();
    let parallaxRaf = 0;
    let lastPtrMs = 0;
    let lastPlateT = "";
    let lastLampT = "";

    const writeParallax = () => {
      const a = parallaxAmt;
      const px = spring ? spring.x : 0;
      const py = spring ? spring.y : 0;

      const pT = `translate3d(${(-px * 8 * a).toFixed(2)}px, ${(-py * 8 * a).toFixed(2)}px, 0)`;
      if (pT !== lastPlateT) {
        lastPlateT = pT;
        plateImg.style.transform = pT;
      }
      const lT = `translate3d(${(px * 3 * a).toFixed(2)}px, ${(py * 3 * a).toFixed(2)}px, 0)`;
      if (lT !== lastLampT) {
        lastLampT = lT;
        lamp.style.transform = lT;
      }
      scene.setPointer(px, py, a);
    };

    const pump = (nowMs: number) => {
      const dt = lastPtrMs ? (nowMs - lastPtrMs) / 1000 : 1 / 60;
      lastPtrMs = nowMs;
      spring!.step(dt);
      writeParallax();
      // Keep going while the spring is settling or while the layers still
      // have a non-zero offset to unwind.
      if (spring!.settling || parallaxAmt > 0) {
        parallaxRaf = requestAnimationFrame(pump);
      } else {
        parallaxRaf = 0;
        lastPtrMs = 0;
      }
    };

    const kick = () => {
      if (!spring || parallaxRaf) return;
      lastPtrMs = 0;
      parallaxRaf = requestAnimationFrame(pump);
    };
    if (spring) window.addEventListener("pointermove", kick, { passive: true });

    // The autonomous rotation in beat 1 ends on the user's first input and
    // never restarts — from then on scroll owns the camera entirely. The
    // scroll cue goes at the same moment, and for the same reason: it has
    // been answered.
    const onFirstInput = () => {
      scene.releaseIntro();
      cue.dataset.gone = "true";
    };

    // Passive listeners only. Lenis scrolls the document, so native scroll
    // events fire at frame rate during smooth scrolling.
    const onScroll = () => {
      if (DEBUG) stageDebug.scrollEvents++;
      apply();
    };
    const onResize = () => {
      applySize();
      lastApplied = "";
      apply();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // A wheel or a touch that has not moved the page yet is still the user
    // taking over, so the release does not wait for scroll to register.
    const once = { passive: true, once: true } as const;
    window.addEventListener("scroll", onFirstInput, once);
    window.addEventListener("wheel", onFirstInput, once);
    window.addEventListener("touchstart", onFirstInput, once);
    window.addEventListener("keydown", onFirstInput, { once: true });

    applySize();
    apply();

    // Restored mid-page: the intro was never the user's to see.
    if (window.scrollY > 4) scene.releaseIntro();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onFirstInput);
      window.removeEventListener("wheel", onFirstInput);
      window.removeEventListener("touchstart", onFirstInput);
      window.removeEventListener("keydown", onFirstInput);
      if (spring) {
        window.removeEventListener("pointermove", kick);
        if (parallaxRaf) cancelAnimationFrame(parallaxRaf);
        spring.destroy();
      }
      scene.dispose();
    };
  }, []);

  /**
   * Keyboard reachability: tabbing into a panel that is off-frame moves the
   * page to the position that centres it. End still walks past the whole
   * section because nothing here is hijacked.
   *
   * Two details this has to fight:
   *  - the browser runs its own scroll-into-view for the newly focused
   *    element, which lands after the focus event; the position is
   *    re-asserted on the next two frames so ours is the one that sticks.
   *  - the jump is immediate rather than animated, because an in-flight
   *    smooth scroll swallows the very next keypress — that is how End ends
   *    up stopping halfway down the page.
   */
  const focusPanel = (index: number) => {
    if (reducedRef.current) return;
    const spacer = pivotSegRef.current;
    if (!spacer) return;
    const travel = spacer.offsetHeight - window.innerHeight;
    if (travel <= 0) return;
    // Document offset, not offsetTop: the spacer's offsetParent is now the
    // positioned wrapper that stacks over the canvas, not the document.
    const top = spacer.getBoundingClientRect().top + window.scrollY;
    const target = top + travel * progressForPanel(index);
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
    <MotionConfig reducedMotion="user">
      {/* TEMPORARY — renders only with ?debug=1. Remove with debug.ts. */}
      <DebugOverlay />

      <Nav ref={navRef} />

      {/*
        The hero's room. Fixed, and underneath the canvas: since pass 06 the
        canvas is transparent, so the card stands in this photograph rather
        than in front of a black rectangle covering it.
      */}
      <HeroPlate
        ref={plateLayerRef}
        plateRef={plateImgRef}
        gradientRef={lampRef}
      />

      {/*
        The one WebGL context on the site. Fixed rather than sticky because it
        has to serve three separate segments; the opaque flat sections scroll
        over it and the segments are the gaps it shows through. Its dimensions
        are reserved by CSS before three.js touches it, so initialisation
        causes no layout shift.
      */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1] block h-full w-full motion-reduce:hidden"
      />

      {/* Everything that scrolls, stacked over the canvas. */}
      <div className="relative z-10">
        <Segment innerRef={descentSegRef} index={0} label="descent">
          <HeroCopy ref={heroRef} />
          <ScrollCue ref={cueRef} />
          <DescentCopy ref={descentRef} />
        </Segment>

        {afterDescent}

        <Segment innerRef={pivotSegRef} index={1} label="pivot">
          {/* The phone layer. Same cream as the card stock — the seam is
              invisible because there is nothing at the seam. */}
          <div
            ref={layerRef}
            className="absolute inset-0 bg-paper opacity-0 pointer-events-none motion-reduce:static motion-reduce:opacity-100 motion-reduce:pointer-events-auto"
          >
            <div
              ref={trackRef}
              className="flex h-full w-[400%] will-change-transform motion-reduce:block motion-reduce:w-full motion-reduce:transform-none motion-reduce:will-change-auto"
            >
              {PANELS.map(({ label, Body }, i) => (
                <Panel
                  key={label}
                  index={i}
                  label={label}
                  active={active === -1 || active === i}
                  onFocusPanel={focusPanel}
                >
                  <Body />
                </Panel>
              ))}
            </div>
          </div>
        </Segment>

        {afterPivot}

        <Segment innerRef={corridorSegRef} index={2} label="corridor">
          <PullbackCopy ref={pullbackRef} />
          <NumberBeat ref={numberRef} countRef={countRef} />
        </Segment>

        {afterCorridor}
      </div>
    </MotionConfig>
  );
}
