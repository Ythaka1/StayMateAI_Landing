/*
 * The card's code block.
 *
 * Deliberately not a scannable QR: it is set dressing, and a real code on a
 * marketing page is a real code someone will scan, which means it has to point
 * somewhere, which means it is a promise. This is a plausible-looking block
 * with the three finder squares in the right corners and a stable pseudorandom
 * fill everywhere else.
 *
 * It lives here, on its own, with no DOM and no three.js, because two
 * different things draw it: the canvas texture on the 3D card, and the DOM
 * card in the "put your property on it" section. They have to show the same
 * code. A visitor who types their hotel's name into one and then watches the
 * other turn over would notice immediately if the pattern changed.
 */

/** Deterministic PRNG, so the block is identical across reloads and renderers. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const QR_MODULES = 25;
const SEED = 214;
const FILL = 0.44;

/** True where a module is inside one of the three finder squares. */
function inFinder(x: number, y: number): boolean {
  const n = QR_MODULES;
  return (
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)
  );
}

/**
 * The block, as a grid of booleans, row-major. Finder squares included, so a
 * consumer can draw the whole thing from this one array.
 */
export function qrGrid(): boolean[][] {
  const n = QR_MODULES;
  const rand = mulberry32(SEED);
  const grid: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n).fill(false)
  );

  // Drawn in the same order the canvas version fills, so the two consume the
  // PRNG identically and produce the same pattern.
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (inFinder(x, y)) continue;
      if (rand() < FILL) grid[y][x] = true;
    }
  }

  const finder = (cx: number, cy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const ring = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[cy + y][cx + x] = ring || core;
      }
    }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);

  return grid;
}

/**
 * The same grid as SVG rects, with horizontal runs merged.
 *
 * Roughly three hundred filled modules become about a hundred rects, which is
 * the difference between a DOM node per module and something a browser lays
 * out without noticing. Coordinates are in module units; the caller sets the
 * viewBox to QR_MODULES square and scales it.
 */
export function qrRects(): { x: number; y: number; w: number }[] {
  const grid = qrGrid();
  const out: { x: number; y: number; w: number }[] = [];
  for (let y = 0; y < grid.length; y++) {
    let run = 0;
    for (let x = 0; x <= grid[y].length; x++) {
      if (grid[y][x]) {
        run++;
      } else if (run > 0) {
        out.push({ x: x - run, y, w: run });
        run = 0;
      }
    }
  }
  return out;
}
