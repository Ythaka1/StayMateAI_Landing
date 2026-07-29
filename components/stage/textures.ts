import * as THREE from "three";
import { QR_MODULES, qrGrid } from "@/lib/qr";

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

/**
 * The card stock, taken off the real photograph.
 *
 * ── Why not just map card.png onto the card ───────────────────────────────
 * The photograph is a lit object in a room: a tent card at an angle under a
 * brass lamp, on walnut, with the background around it. Mapped straight onto
 * the card UV it would bring three things the scene already has and cannot
 * have twice — a light with its own direction, a perspective the camera is
 * not at, and a table it is not on. The card would read as a photograph of a
 * card stuck to a card.
 *
 * So what is taken from it is the only part that is actually the stock: an
 * interior crop of the front panel, with its lighting divided out, leaving a
 * zero-mean detail map of real fibre, tooth and fleck. That is what the
 * shader multiplies the paper colour by.
 *
 * Two consequences worth being explicit about:
 *
 *  - The paper *colour* still comes from --paper, not from the photograph.
 *    The FLATTEN ramp at the end of the pivot has to resolve to the exact hex
 *    the DOM panel layer uses, or the handoff seam becomes visible. Sampling
 *    the cream out of a lamplit photograph would put a warm cast on one side
 *    of that seam.
 *  - The tiling grain stays, at a much higher repeat. The photograph is
 *    finite: at maximum push-in the camera is looking at a few millimetres of
 *    card and the crop has gone soft. The procedural tile is what still has
 *    tooth at that range. The photograph carries the character; the grain
 *    carries the resolution.
 *
 * Mirrored wrapping rather than plain repeat: the crop is not seamless and
 * never can be, and mirroring turns every seam into a fold, which on an
 * isotropic material like paper is invisible.
 *
 * Fails soft. If the file is missing the promise rejects, `onReady` is never
 * called, uStockAmt stays at 0 and the card is exactly what it was before —
 * procedural grain on flat cream.
 */
export function loadStockTexture(
  url: string,
  onReady: (tex: THREE.Texture) => void
): () => void {
  const img = new Image();
  let cancelled = false;

  img.onload = () => {
    if (cancelled) return;
    try {
      onReady(buildStock(img));
    } catch {
      /* leave the card procedural */
    }
  };
  img.onerror = () => {
    /* leave the card procedural */
  };
  img.src = url;

  return () => {
    cancelled = true;
    img.onload = null;
    img.onerror = null;
  };
}

/**
 * Interior of the front panel, in fractions of the photograph. Well inside
 * the die-cut edge on every side, and above the deckle, so nothing but stock
 * is in the crop.
 */
const STOCK_CROP = { x: 0.3, y: 0.3, w: 0.34, h: 0.38 } as const;

function buildStock(img: HTMLImageElement): THREE.Texture {
  const S = 512;
  // Padding so the blur has real pixels to sample outside the region that is
  // actually read. Canvas blur treats off-canvas as transparent black, which
  // would leave a bright rim in the difference — the border being brighter
  // than the middle is exactly the artefact this whole function exists to
  // remove.
  const P = 48;
  const N = S + P * 2;

  const src = document.createElement("canvas");
  src.width = N;
  src.height = N;
  const sctx = src.getContext("2d")!;
  sctx.drawImage(
    img,
    STOCK_CROP.x * img.naturalWidth,
    STOCK_CROP.y * img.naturalHeight,
    STOCK_CROP.w * img.naturalWidth,
    STOCK_CROP.h * img.naturalHeight,
    0,
    0,
    N,
    N
  );

  const blurred = document.createElement("canvas");
  blurred.width = N;
  blurred.height = N;
  const bctx = blurred.getContext("2d")!;
  // Wide enough to carry the lamp falloff and the fold's shading, narrow
  // enough to leave the fibre behind. Anything under ~16px starts eating the
  // clumping that makes the stock look like stock.
  bctx.filter = "blur(26px)";
  bctx.drawImage(src, 0, 0);

  const a = sctx.getImageData(P, P, S, S).data;
  const b = bctx.getImageData(P, P, S, S).data;

  const out = document.createElement("canvas");
  out.width = S;
  out.height = S;
  const octx = out.getContext("2d")!;
  const detail = octx.createImageData(S, S);

  // Rec. 601 luma is deliberate: the crop is near-neutral cream, so the exact
  // coefficients matter far less than being consistent, and the shader only
  // reads .r anyway.
  const luma = (d: Uint8ClampedArray, i: number) =>
    d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

  // The difference between a photograph and its own blur is small — a few
  // levels out of 255. Without a gain the map is a flat grey and the card
  // looks like plastic.
  const GAIN = 2.4;

  for (let i = 0; i < a.length; i += 4) {
    const d = (luma(a, i) - luma(b, i)) * GAIN;
    const v = Math.max(0, Math.min(255, Math.round(128 + d)));
    detail.data[i] = v;
    detail.data[i + 1] = v;
    detail.data[i + 2] = v;
    detail.data[i + 3] = 255;
  }
  octx.putImageData(detail, 0, 0);

  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.wrapT = THREE.MirroredRepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

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

/*
 * Room numbers for the instanced array.
 *
 * COST: one 256×256 RGBA canvas texture, ~256KB plus mips, and exactly one
 * extra texture read — taken only in the ROOMS shader variant, which is used
 * in beats 4 and 6. Beat 3's pivot, where the card fills the screen and fill
 * rate decides the frame, never compiles it in. The alternative was a texture
 * per card, which is what the atlas exists to avoid.
 */
export const ROOM_ATLAS_COLS = 4;
export const ROOM_ATLAS_ROWS = 8;
export const ROOM_ATLAS_CELLS = ROOM_ATLAS_COLS * ROOM_ATLAS_ROWS;

/** The room numbers, in atlas cell order. Cell 0 is the hero card's. */
export const ROOM_NUMBERS = [
  "214", "101", "102", "104", "106", "108", "110", "112",
  "201", "203", "205", "207", "209", "211", "216", "218",
  "301", "302", "305", "307", "309", "311", "314", "316",
  "401", "402", "404", "406", "408", "410", "412", "415",
];

/** One atlas of room numbers, sampled by a per-instance cell offset. */
export function makeRoomsTexture(onRedraw?: () => void): THREE.Texture {
  const SIZE = 256;
  const cw = SIZE / ROOM_ATLAS_COLS; // 64
  const ch = SIZE / ROOM_ATLAS_ROWS; // 32
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  const draw = () => {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#15171b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 19px ${displayFamily()}`;
    for (let i = 0; i < ROOM_ATLAS_CELLS; i++) {
      const cx = (i % ROOM_ATLAS_COLS) * cw + cw / 2;
      const cy = Math.floor(i / ROOM_ATLAS_COLS) * ch + ch / 2;
      ctx.fillText(ROOM_NUMBERS[i] ?? "", cx, cy);
    }
  };

  draw();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;

  if (typeof document !== "undefined" && document.fonts) {
    document.fonts
      .load(`600 19px ${displayFamily()}`)
      .then(() => document.fonts.ready)
      .then(() => {
        draw();
        tex.needsUpdate = true;
        onRedraw?.();
      })
      .catch(() => {
        /* keep the fallback rendering */
      });
  }

  return tex;
}

/**
 * The display face, as next/font named it. The font is loaded by the document,
 * not by canvas, so this reads the family off the CSS variable the layout
 * sets. Falls back to a generic serif if the variable is missing.
 */
function displayFamily(): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-newsreader")
    .trim();
  return v ? `${v}, serif` : "serif";
}

/**
 * The card's back: blank stock, and one line.
 *
 * The front is the printed side a guest scans. The back is what the card
 * shows once it has turned over and landed, and it carries the concierge's
 * first reply, set as though the paper itself were answering. One sentence.
 * Anything longer stops being a reply and becomes a leaflet.
 *
 * Set centred and slightly below the middle, which keeps it well clear of the
 * upper-left band the pivot's camera terminates in. It is faded in by
 * uBackInk as the card settles, and out again by uFlat before the handoff, so
 * the terminal frame is still blank stock and the measured seam is unchanged.
 *
 * Alpha only, like the print layer: the shader supplies the ink colour, so
 * this is a coverage mask rather than a picture.
 */
export function makeBackTexture(onRedraw?: () => void): THREE.Texture {
  const W = 768;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const family = displayFamily();
    ctx.fillStyle = "#15171b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `40px ${family}`;
    ctx.fillText("Good evening.", W / 2, H * 0.5 - 30);
    ctx.fillText("What can I get you?", W / 2, H * 0.5 + 30);
  };

  draw();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;

  if (typeof document !== "undefined" && document.fonts) {
    document.fonts
      .load(`40px ${displayFamily()}`)
      .then(() => document.fonts.ready)
      .then(() => {
        draw();
        tex.needsUpdate = true;
        onRedraw?.();
      })
      .catch(() => {
        /* keep the fallback rendering */
      });
  }

  return tex;
}

/** The line on the back face, for the reduced-motion path's DOM copy. */
export const BACK_FACE_LINE = "Good evening. What can I get you?";

/**
 * The neutral property the card carries by default.
 *
 * Nowhere in particular, and pronounceable in most places. The card is never
 * blank: a mock-up with a placeholder box where the name goes is a mock-up,
 * and this has to read as a printed card that already exists.
 */
export const DEFAULT_PROPERTY = "The Laurel";

/** As much of a name as the card can carry before it stops being a card. */
export const PROPERTY_MAX = 28;

/**
 * Strip a typed property name down to something that can be printed.
 *
 * Not a security measure, since nothing here is stored, sent, or interpreted
 * as anything but glyphs on a canvas. It exists because a card is a physical
 * object: it has no line breaks, no tabs, no runs of twelve spaces, and no
 * room for a paragraph. Letters, marks, spaces and the handful of characters
 * that legitimately appear in hotel names survive; everything else does not.
 */
export function cleanProperty(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}&'’.,\- ]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, PROPERTY_MAX);
}

/**
 * The printed face of the card.
 *
 * ── The hierarchy, which is the whole point ──────────────────────────────
 * Top to bottom: the QR, a brass rule, the property's name set larger than
 * anything else on the card, the one line telling a guest what to do with it,
 * and then, at the very bottom edge and very quiet, StayMate.
 *
 * That order is deliberate and it is the reverse of what this used to be. The
 * card sits in someone else's hotel room. A general manager looking at it has
 * to see his own property's card, printed for him, with a supplier's mark
 * discreetly at the foot of it, the way a printer signs a menu. A card with
 * our name across the middle of it is an advertisement we are asking him to
 * put in every room, and no hotel of the sort worth having says yes to that.
 *
 * Canvas aspect matches the card (3:4) so card-space squares stay square.
 *
 * The card is on screen for two full beats before the seam, so the type is
 * set in the real display face. Webfonts are not available synchronously and
 * there is no loading screen on this site, so the texture is drawn
 * immediately with whatever is resolved and redrawn in place once the font
 * arrives; `onRedraw` lets the scene mark itself dirty when that happens.
 */
export function makePrintTexture(
  onRedraw?: () => void,
  property: string = DEFAULT_PROPERTY
): THREE.Texture {
  const W = 768;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const INK = "#15171b";
  const BRASS = "#a07e45";
  const MUTED = "#6c6860";

  // QR-like block: 25 modules, finder squares in three corners, random
  // fill elsewhere. Deliberately not a scannable code — it's set dressing.
  // Sized so the block spans x ±0.375 in card units, which leaves a blank
  // band from the card edge (-1.2) to -0.375 for the camera to terminate in.
  // scene.ts's QR_LEFT_X must match.
  const modules = QR_MODULES;
  const qrSize = 240;
  const qrX = (W - qrSize) / 2;
  const qrY = 92;
  const m = qrSize / modules;
  // Shared with the DOM card in the "put your property on it" section, so
  // the two show the same code. See lib/qr.ts.
  const grid = qrGrid();

  const draw = () => {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = INK;
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if (!grid[y][x]) continue;
        ctx.fillRect(qrX + x * m + 0.5, qrY + y * m + 0.5, m - 1, m - 1);
      }
    }

    // A thin brass rule between the code and the name.
    ctx.fillStyle = BRASS;
    ctx.fillRect(W / 2 - 54, qrY + qrSize + 62, 108, 2);

    const display = displayFamily();
    const body = bodyFamily();
    ctx.textAlign = "center";

    /*
     * The property's name, set as large as it will go.
     *
     * Tracked by hand rather than with ctx.letterSpacing, which is recent
     * enough that a browser without it would silently print the name solid
     * while every other letterspaced thing on the site stayed open.
     *
     * The size is fitted rather than fixed: a long name shrinks to fit the
     * measure instead of running off the stock, because "The Grand Pavilion
     * and Spa" has to look printed too.
     */
    const NAME_MAX_W = W - 150;
    const tracking = 0.1;
    let size = 68;
    while (size > 26 && trackedWidth(ctx, property, size, display, tracking) > NAME_MAX_W) {
      size -= 2;
    }
    ctx.fillStyle = INK;
    drawTracked(ctx, property, W / 2, qrY + qrSize + 148, size, display, tracking);

    // What to do with it. Body face, because this is an instruction and not
    // a mark.
    ctx.fillStyle = MUTED;
    ctx.font = `24px ${body}`;
    ctx.fillText("Scan for your concierge", W / 2, qrY + qrSize + 208);

    /*
     * Ours, at the foot of the card, at the size a printer signs a menu.
     * Small enough that a guest never reads it and a manager only finds it
     * if he goes looking.
     */
    ctx.fillStyle = MUTED;
    drawTracked(ctx, "STAYMATE", W / 2, H - 58, 17, body, 0.3);
  };

  draw();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;

  // Redraw once the faces have actually loaded. No gate on first paint.
  if (typeof document !== "undefined" && document.fonts) {
    Promise.all([
      document.fonts.load(`68px ${displayFamily()}`),
      document.fonts.load(`24px ${bodyFamily()}`),
    ])
      .then(() => document.fonts.ready)
      .then(() => {
        draw();
        tex.needsUpdate = true;
        onRedraw?.();
      })
      .catch(() => {
        /* keep the fallback rendering */
      });
  }

  return tex;
}

/**
 * Letterspaced text, drawn a glyph at a time.
 *
 * `ctx.letterSpacing` exists but is recent, and a browser without it fails
 * silently: the name would print solid while every other tracked thing on
 * the site stayed open, which looks like a mistake rather than a fallback.
 * Tracking is in ems, so it scales with the size the way it should.
 */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  size: number,
  family: string,
  tracking: number
) {
  ctx.font = `${size}px ${family}`;
  const gap = size * tracking;
  const total = trackedWidth(ctx, text, size, family, tracking);
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  let x = cx - total / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + gap;
  }
  ctx.textAlign = prev;
}

/** Width the same text would occupy through drawTracked. */
function trackedWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  family: string,
  tracking: number
): number {
  ctx.font = `${size}px ${family}`;
  const chars = [...text];
  if (chars.length === 0) return 0;
  let w = 0;
  for (const ch of chars) w += ctx.measureText(ch).width;
  // One fewer gap than glyphs: the trailing gap is not part of the word.
  return w + size * tracking * (chars.length - 1);
}

/** The body face, as next/font named it. Same trick as displayFamily. */
function bodyFamily(): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-public-sans")
    .trim();
  return v ? `${v}, system-ui, sans-serif` : "system-ui, sans-serif";
}
