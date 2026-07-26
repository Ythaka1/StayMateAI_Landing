"use client";

import { useEffect, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { createCardScene, type CardScene } from "./scene";
import { PANELS, Panel } from "./Panels";
import {
  CANVAS_SLEEP_AT,
  FADE,
  PANELS_TRAVEL,
  PANEL_COUNT,
  clamp01,
  progressForPanel,
  within,
} from "./timeline";
import { getLenis } from "@/lib/lenis";

/*
 * Beat 3 — the pivot.
 *
 * One sticky section inside a 500svh spacer. One progress value derived from
 * the spacer's rect drives the camera dolly, the cross-fade, and the
 * horizontal travel. Nothing here preventDefaults wheel or touch; the page
 * scrolls normally and only the visual is pinned.
 *
 * Reduced motion is handled structurally in CSS (motion-reduce: variants),
 * not by swapping React trees — so there is no hydration flash and no
 * layout shift. In that path the canvas is never created and the four
 * panels are plain stacked sections.
 */
export default function Pivot() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CardScene | null>(null);
  const reducedRef = useRef(false);

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    const spacer = spacerRef.current;
    const canvas = canvasRef.current;
    const layer = layerRef.current;
    const track = trackRef.current;
    if (!spacer || !canvas || !layer || !track) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedQuery.matches) {
      // No pin, no canvas at all. CSS has already laid the panels out as
      // stacked static sections; make every panel's copy visible.
      reducedRef.current = true;
      setActive(-1);
      return;
    }

    const isMobile = window.innerWidth < 768;
    const scene = createCardScene(canvas, { isMobile });
    sceneRef.current = scene;

    let onScreen = false;
    let lastApplied = -1;

    const applySize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0) scene.setSize(w, h);
    };

    const apply = () => {
      const rect = spacer.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? clamp01(-rect.top / travel) : 0;
      if (p === lastApplied) return;
      lastApplied = p;

      scene.setProgress(p);

      // Cross-fade the DOM layer up over the canvas.
      const fade = within(p, FADE);
      layer.style.opacity = String(fade);
      layer.style.pointerEvents = fade >= 1 ? "auto" : "none";

      // Horizontal travel: one transform on one container.
      const t = within(p, PANELS_TRAVEL);
      track.style.transform = `translate3d(${-75 * t}%, 0, 0)`;

      const idx = Math.round(t * (PANEL_COUNT - 1));
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }

      // Stop the RAF loop once the DOM layer is fully opaque; resume before
      // it starts fading back out. Never a mere opacity-0 canvas.
      if (!onScreen || p >= CANVAS_SLEEP_AT) scene.stop();
      else scene.start();
    };

    // Passive listeners only. Lenis scrolls the document, so native scroll
    // events fire at frame rate during smooth scrolling.
    const onScroll = () => apply();
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

    applySize();
    apply();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      scene.dispose();
      sceneRef.current = null;
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
      <div
        ref={spacerRef}
        className="relative h-[500svh] motion-reduce:h-auto"
        data-beat="3-pivot"
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
