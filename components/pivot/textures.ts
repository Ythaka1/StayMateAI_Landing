import * as THREE from "three";

/*
 * All card surface detail is procedural this pass so nothing blocks on
 * artwork. Two textures, one draw call:
 *
 *  - grain: a small tiling noise texture, repeated at high frequency in the
 *    shader. This is what survives maximum zoom — a large baked texture
 *    would go soft at close range; a tile repeated 20x does not.
 *  - print: the full-card "ink layer" (QR-like block, rule, wordmark) on a
 *    transparent canvas, mapped over the whole card UV.
 *
 * ── SWAP SEAM ─────────────────────────────────────────────────────────────
 * To use a real card design later, replace makePrintTexture() with a
 * TextureLoader load of the artwork (same full-card UV mapping, transparent
 * background, ink baked in). Nothing in scene.ts or the camera code needs
 * to change.
 * ──────────────────────────────────────────────────────────────────────────
 */

/** Deterministic PRNG so the QR block is stable across reloads. */
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

/**
 * One tile of paper grain, repeated at high frequency in the shader.
 *
 * The multi-octave structure is baked *into* the tile — periodic value noise
 * at three lattice sizes plus per-pixel white noise for the finest tooth —
 * rather than summed from several texture samples in the fragment shader.
 * Every octave is periodic over the tile, so it still repeats seamlessly, and
 * the shader gets the same richness from a single sample. On a fullscreen
 * fragment shader that halving is the difference between one vsync and two.
 */
export function makeGrainTexture(size = 256): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);

  // Periodic value noise: a lattice of random values, wrapped and smoothly
  // interpolated, so the result tiles exactly.
  const octave = (lattice: number, seed: number) => {
    const cells = size / lattice;
    const rand = mulberry32(seed);
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    const fade = (t: number) => t * t * (3 - 2 * t);
    return (x: number, y: number) => {
      const fx = x / lattice;
      const fy = y / lattice;
      const x0 = Math.floor(fx) % cells;
      const y0 = Math.floor(fy) % cells;
      const x1 = (x0 + 1) % cells;
      const y1 = (y0 + 1) % cells;
      const tx = fade(fx - Math.floor(fx));
      const ty = fade(fy - Math.floor(fy));
      const a = grid[y0 * cells + x0];
      const b = grid[y0 * cells + x1];
      const c = grid[y1 * cells + x0];
      const d = grid[y1 * cells + x1];
      return (
        (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty
      );
    };
  };

  const fibre = octave(64, 11); // clumps, the felt of the stock
  const weave = octave(16, 29); // the tooth
  const speck = octave(4, 47); // flecks in the pulp
  const white = mulberry32(7);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n =
        fibre(x, y) * 0.34 +
        weave(x, y) * 0.3 +
        speck(x, y) * 0.22 +
        white() * 0.14;
      const v = Math.max(0, Math.min(255, Math.round(n * 255)));
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/**
 * The printed layer of the tent card: QR-like block upper-centre, a brass
 * rule, the wordmark, one muted line. Canvas aspect matches the card
 * (3:4) so card-space squares stay square.
 */
export function makePrintTexture(): THREE.Texture {
  const W = 768;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);

  const INK = "#15171b";
  const BRASS = "#a07e45";
  const MUTED = "#6c6860";

  // QR-like block: 25 modules, finder squares in three corners, random
  // fill elsewhere. Deliberately not a scannable code — it's set dressing.
  // Sized so the block spans x ±0.375 in card units, which leaves a blank
  // band from the card edge (-1.2) to -0.375 for the camera to terminate in.
  // scene.ts's QR_LEFT_X must match.
  const modules = 25;
  const qrSize = 240;
  const qrX = (W - qrSize) / 2;
  const qrY = 92;
  const m = qrSize / modules;
  const rand = mulberry32(214);

  const finder = (cx: number, cy: number) => {
    ctx.fillStyle = INK;
    ctx.fillRect(qrX + cx * m, qrY + cy * m, 7 * m, 7 * m);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.clearRect(qrX + (cx + 1) * m, qrY + (cy + 1) * m, 5 * m, 5 * m);
    ctx.fillStyle = INK;
    ctx.fillRect(qrX + (cx + 2) * m, qrY + (cy + 2) * m, 3 * m, 3 * m);
  };

  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= modules - 8 && y < 8) || (x < 8 && y >= modules - 8);

  ctx.fillStyle = INK;
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (inFinder(x, y)) continue;
      if (rand() < 0.44) {
        ctx.fillRect(qrX + x * m + 0.5, qrY + y * m + 0.5, m - 1, m - 1);
      }
    }
  }
  finder(0, 0);
  finder(modules - 7, 0);
  finder(0, modules - 7);

  // Brass rule under the QR.
  ctx.fillStyle = BRASS;
  ctx.fillRect(W / 2 - 60, qrY + qrSize + 78, 120, 3);

  // Wordmark. Georgia stands in for the display face inside the texture —
  // canvas can't reach next/font, and this whole layer is behind the
  // SWAP SEAM anyway.
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = "600 58px Georgia, serif";
  ctx.fillText("S T A Y M A T E", W / 2, qrY + qrSize + 168);

  ctx.fillStyle = MUTED;
  ctx.font = "28px Georgia, serif";
  ctx.fillText("Scan for your concierge", W / 2, qrY + qrSize + 224);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
