"use client";

import { useEffect, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { createCardScene, type CardScene } from "./scene";
import { PANELS, Panel } from "./Panels";
import { DarknessCopy, DescentCopy } from "./Copy";
import DebugOverlay from "./DebugOverlay";
import { debugEnabled, stageDebug } from "./debug";
import {
  CANVAS_SLEEP_AT,
  COPY_DARKNESS,
  COPY_DESCENT,
  FADE,
  PANELS_TRAVEL,
  PANEL_COUNT,
  STAGE_HEIGHT_VH,
  band,
  clamp01,
  pivotProgress,
  progressForPanel,
  within,
} from "./timeline";
import { getLenis } from "@/lib/lenis";

/*
 * Beats 1, 2 and 3 — darkness, the descent, and the pivot.
 *
 * One sticky section inside one tall spacer, one canvas, one camera path. The
 * camera never cuts from the top of the page to the end of the pivot, which
 * is only true because there is a single path: beats 1 and 2 are offsets from
 * the pivot dolly's own start that decay to zero (see cameraAt in scene.ts).
 *
 * Nothing here preventDefaults wheel or touch; the page scrolls normally and
 * only the visual is pinned.
 *
 * Reduced motion is handled structurally in CSS (motion-reduce: variants),
 * not by swapping React trees — so there is no hydration flash and no layout
 * shift. In that path no WebGL context is created at all and the beats become
 * plain stacked sections.
 */
export default function Stage() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const darknessRef = useRef<HTMLDivElement>(null);
  const descentRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(false);

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    const spacer = spacerRef.current;
    const canvas = canvasRef.current;
    const darkness = darknessRef.current;
    const descent = descentRef.current;
    const layer = layerRef.current;
    const track = trackRef.current;
    if (!spacer || !canvas || !darkness || !descent || !layer || !track) return;

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
      // No pin, no canvas at all. CSS has already laid the beats out as
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

    let onScreen = false;
    let lastApplied = -1;

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
     * now four full-viewport layers over the canvas and writing all of them
     * on every scroll event costs a style recalc per layer per frame, while
     * three of the four are sitting at a flat 0 or 1 the whole time.
     *
     * Deliberately opacity only — not visibility or display. Hiding the panel
     * layer would take it out of the tab order, and hiding the copy layers
     * would take beats 1 and 2 out of the accessibility tree, where they are
     * the only copy those beats have.
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

    const apply = () => {
      const rect = spacer.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const g = travel > 0 ? clamp01(-rect.top / travel) : 0;
      if (DEBUG) {
        stageDebug.progress = g;
        stageDebug.scrollY = Math.round(window.scrollY);
        stageDebug.spacerTop = Math.round(rect.top);
        stageDebug.spacerH = Math.round(rect.height);
        stageDebug.onScreen = onScreen;
      }
      if (g === lastApplied) return;
      lastApplied = g;

      scene.setProgress(g);

      // Beats 1 and 2: copy.
      setLayerOpacity(darkness, band(g, COPY_DARKNESS));
      setLayerOpacity(descent, band(g, COPY_DESCENT));

      // Beat 3: cross-fade the DOM phone layer up over the canvas.
      const pp = pivotProgress(g);
      const fade = within(pp, FADE);
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

      // Stop the RAF loop once the DOM layer is fully opaque; resume before
      // it starts fading back out. Never a mere opacity-0 canvas.
      if (!onScreen || pp >= CANVAS_SLEEP_AT) scene.stop();
      else scene.start();
    };

    // The autonomous rotation in beat 1 ends on the user's first input and
    // never restarts — from then on scroll owns the camera entirely.
    const onFirstInput = () => scene.releaseIntro();

    // Passive listeners only. Lenis scrolls the document, so native scroll
    // events fire at frame rate during smooth scrolling.
    const onScroll = () => {
      if (DEBUG) stageDebug.scrollEvents++;
      apply();
    };
    const onResize = () => {
      applySize();
      lastApplied = -1;
      apply();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        lastApplied = -1;
        apply();
      },
      { rootMargin: "10% 0px" }
    );
    io.observe(spacer);

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
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onFirstInput);
      window.removeEventListener("wheel", onFirstInput);
      window.removeEventListener("touchstart", onFirstInput);
      window.removeEventListener("keydown", onFirstInput);
      scene.dispose();
    };
  }, []);

  /**
   * Keyboard reachability: tabbing into a panel that is off-frame moves the
   * page to the progress value that centres it. End still walks past the
   * whole section because nothing here is hijacked.
   *
   * Two details this has to fight:
   *  - the browser runs its own scroll-into-view for the newly focused
   *    element, which lands after the focus event; the position is
   *    re-asserted on the next two frames so ours is the one that sticks.
   *  - the jump is immediate rather than animated, because an in-flight
   *    smooth scroll swallows the very next keypress — that is how End
   *    ends up stopping halfway down the page.
   */
  const focusPanel = (index: number) => {
    if (reducedRef.current) return;
    const spacer = spacerRef.current;
    if (!spacer) return;
    const travel = spacer.offsetHeight - window.innerHeight;
    if (travel <= 0) return;
    const target = spacer.offsetTop + travel * progressForPanel(index);
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
      <div
        ref={spacerRef}
        className="relative motion-reduce:!h-auto"
        style={{ height: `${STAGE_HEIGHT_VH}svh` }}
        data-stage="beats-1-3"
      >
        {/* overflow-clip, not hidden: a hidden box is still a scroll
            container, so the browser can scrollLeft the track when focus
            lands on an off-frame panel. clip creates no scrollport at all,
            which makes that whole failure mode impossible. */}
        <div className="sticky top-0 h-[100svh] overflow-clip bg-night motion-reduce:static motion-reduce:h-auto motion-reduce:overflow-visible motion-reduce:bg-paper">
          {/* Canvas dimensions are reserved by CSS before three.js touches
              it, so initialisation causes no layout shift. */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 block h-full w-full motion-reduce:hidden"
          />

          <DarknessCopy ref={darknessRef} />
          <DescentCopy ref={descentRef} />

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
        </div>
      </div>
    </MotionConfig>
  );
}
