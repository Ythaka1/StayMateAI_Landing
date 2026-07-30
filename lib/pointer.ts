/*
 * The cursor, spring damped.
 *
 * Every hero layer reads from one of these rather than each listening to
 * pointermove itself: three listeners would be three sets of springs settling
 * at three slightly different times, which is exactly the wobble that makes
 * layered parallax look cheap.
 *
 * ── Why a spring and not a lerp ──────────────────────────────────────────
 * An exponential lerp toward the target is first order: it decelerates into
 * position and stops. It never overshoots, but it also never has any weight,
 * and it reads as the layer chasing the cursor. A second order spring lags on
 * the way out and settles on the way in, which is what makes the frame feel
 * like it has mass rather than like it is tracking.
 *
 * Damped just under critical, so there is a trace of settle without a visible
 * bounce. At these amplitudes (single digit pixels) a real overshoot would be
 * sub-pixel anyway; the point of the spring is the lag, not the ring.
 */

const STIFFNESS = 90;
const DAMPING = 17;

/** Largest step the integrator will take, in seconds. */
const MAX_DT = 1 / 30;

export type PointerSpring = {
  /** Current damped position, -1..1 from the centre of the viewport. */
  readonly x: number;
  readonly y: number;
  /** True while the spring still has somewhere to go. */
  readonly settling: boolean;
  /** Integrate one frame. Returns true if anything moved. */
  step(dtSeconds: number): boolean;
  destroy(): void;
};

/**
 * Returns null where cursor parallax cannot exist at all: coarse pointers.
 * Null rather than a spring that always reads zero, so callers have to decide
 * what to do about it rather than silently paying for listeners that can
 * never fire.
 *
 * It no longer tests prefers-reduced-motion, though the parallax is still off
 * in tier 2. That decision moved to Stage, onto the amplitude, because the
 * preference can change while the page is open — Battery Saver does exactly
 * that on Android — and a spring that was never constructed cannot come back
 * when it does. A pointer type does not change under a running document; a
 * media query does.
 */
export function createPointerSpring(): PointerSpring | null {
  if (typeof window === "undefined") return null;
  // `pointer: fine` only. Never on touch, and no deviceorientation fallback:
  // a phone tilting the hero is a different effect wearing the same name.
  if (!window.matchMedia("(pointer: fine)").matches) return null;

  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;

  const onMove = (e: PointerEvent) => {
    // Only a mouse or a pen. A touch that generates pointer events on a
    // hybrid machine should not drive this.
    if (e.pointerType === "touch") return;
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
  };

  // The cursor leaving the window is a real position, not a missing one: the
  // layers should return to rest rather than freeze wherever they were.
  const onLeave = () => {
    tx = 0;
    ty = 0;
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);

  return {
    get x() {
      return x;
    },
    get y() {
      return y;
    },
    get settling() {
      return (
        Math.abs(tx - x) > 0.0005 ||
        Math.abs(ty - y) > 0.0005 ||
        Math.abs(vx) > 0.0005 ||
        Math.abs(vy) > 0.0005
      );
    },
    step(dtSeconds: number) {
      // Clamped, because a backgrounded tab hands back a dt measured in
      // seconds, and an unclamped spring integrated over that goes unstable
      // and throws the layers off screen.
      const dt = Math.min(dtSeconds, MAX_DT);
      const before = x + y;

      vx += (STIFFNESS * (tx - x) - DAMPING * vx) * dt;
      vy += (STIFFNESS * (ty - y) - DAMPING * vy) * dt;
      x += vx * dt;
      y += vy * dt;

      if (!this.settling) {
        x = tx;
        y = ty;
        vx = 0;
        vy = 0;
      }
      return x + y !== before;
    },
    destroy() {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    },
  };
}
