import * as THREE from "three";
import {
  ROOM_ATLAS_COLS,
  ROOM_ATLAS_ROWS,
  loadStockTexture,
  makeBackTexture,
  makeGrainTexture,
  makePrintTexture,
  makeRoomsTexture,
} from "./textures";
import {
  BACK_INK,
  FLIP,
  RETREAT_IN,
  RETREAT_OUT,
  CONVERGE,
  DESCENT,
  DOLLY,
  FAN_SETTLE,
  FLATTEN,
  LANDING,
  LIGHTS_OUT,
  LIGHTS_UP,
  PIVOT,
  RECEDE,
  RETURN,
  canvasPivotProgress,
  easeInOutCubic,
  easeOutCubic,
  within,
} from "./timeline";
import { debugEnabled, stageDebug } from "./debug";

/*
 * One object, one plane, one draw call, across all three beats. The card is a
 * rounded-rect SDF in the fragment shader; grain, print, the key light, the
 * glass terms and the implied desk are all fragment work. No post-processing.
 *
 * The plane is larger than the card so the contact shadow and the desk's
 * bounce have somewhere to live. Everything outside the card is discarded
 * while the card is still in the void, so beat 1 costs what it cost in
 * pass 01.
 *
 * COLOUR: three's colour management is switched off and the framebuffer is
 * left untagged, so every value in the shader is raw sRGB and #F3F1EC leaves
 * the fragment shader as exactly #F3F1EC. This matters more than physical
 * correctness — the whole handoff dies if the canvas cream and the DOM cream
 * differ by one value.
 */

THREE.ColorManagement.enabled = false;

export const CARD_W = 2.4;
export const CARD_H = 3.2;

/**
 * The plane the card is drawn on. Bigger than the card so the contact shadow
 * and desk bounce have room; the desk terms fade to the clear colour well
 * inside these bounds, so the plane's own edge is never visible.
 */
const PLANE_W = CARD_W * 2.0;
const PLANE_H = CARD_H * 1.45;

/** Matches --night in globals.css. The darkness the card sits in. */
export const NIGHT = "#0b0c0e";
/** Matches --paper. The whole trick depends on this being exact. */
export const PAPER = "#f3f1ec";

/** Left edge of the printed QR block in card units. Set by textures.ts. */
const QR_LEFT_X = -0.375;

/** Width of the print texture, and how far apart R and B may be sampled. */
const PRINT_TEXTURE_W = 768;
const PRINT_CHROMA_TEXELS = 0.35;

/**
 * Half-width of the frame at maximum push-in, in card units. The blank band
 * runs from the card edge (-1.2) to QR_LEFT_X, so from PIVOT_END.x = -0.81
 * there is 0.39 of room one way and 0.435 the other; 0.30 leaves ~0.1 of
 * margin on both sides.
 *
 * The terminal z is derived from this rather than fixed, so the dolly ends
 * exactly when the frame first fills with blank stock — on a narrow phone
 * that is a much shallower push than on a wide desktop.
 */
const BLANK_BAND_HALF = 0.3;

/** The two ends of beat 3's dolly, in card units. */
const PIVOT_START = { x: 0, y: 0.15, z: 6 } as const;
const PIVOT_END = { x: -0.81, y: 0.95 } as const;

/**
 * How much of the frame's half-height the card takes while it is in the void,
 * which is what sets the beat 1 / 2 camera distance. Deriving the pull-back
 * from this rather than fixing a z keeps the composition identical on a phone
 * and a desktop — and, more importantly, guarantees a band of darkness under
 * the card on every device for the copy to sit in.
 */
const VOID_CARD_FRAC = 0.46;

/**
 * Beat 1 / 2 camera offsets from the dolly's start. Every one of them decays
 * to exactly zero at PIVOT.start, which is what makes the handoff seamless
 * without duplicating a single camera number — see cameraAt().
 */
const CAM_TILT = -0.3; // camera sits low, so the card rides high in frame

/** How much of the card's fall the camera follows. Below 1, so it drifts. */
const CAM_FOLLOW = 0.62;

/** Where the card floats before the descent, relative to its landed rest. */
const CARD_FLOAT_Y = 1.6;
const CARD_FLOAT_Z = -0.3;

/**
 * How many cards exist. One InstancedMesh, one draw call, regardless — the
 * count is what changes between beats, never the number of meshes. A hand, a
 * phone, a room, a corridor and a hotel are all this same card, repeated.
 */
const CARD_COUNT = 18;

/**
 * How far the camera retreats past the landed framing, in card units — far
 * enough for beat 4's corridor, then back in a little to frame beat 6's fan.
 */
const RETREAT_FAR = 8.6;
const RETREAT_REST = 7.0;
/**
 * The camera also drops while the array is on screen, which lifts the whole
 * field into the upper frame and leaves the lower third dark for beat 4's
 * line. It rises again for the fan, which is dealt low.
 */
const RETREAT_Y_FAR = -1.05;
const RETREAT_Y_REST = 0.6;

/** Autonomous Y rotation in beat 1: ±6°, ~9s period. */
const INTRO_AMPLITUDE = (6 * Math.PI) / 180;
const INTRO_PERIOD_MS = 9000;
/**
 * How long the intro rotation takes to ease away once the user scrolls.
 *
 * 1200ms, up from 700. At 700 the rotation was still visibly moving when it
 * was cut off, and a movement that stops before it has finished reads as a
 * bug rather than as a handover. Over 1200 the descent has taken the card by
 * the time the idle is gone, so the two overlap instead of colliding.
 */
const INTRO_RELEASE_MS = 1200;

/**
 * Cursor tilt on the card, in radians. Added on top of the idle rotation, not
 * instead of it.
 */
const TILT_Y = (4 * Math.PI) / 180;
const TILT_X = (2 * Math.PI) / 180;

/**
 * The camera's parallax offset at full pointer deflection, in screen pixels
 * at the hero framing. Converted to world units per frame, because the world
 * distance that spans four pixels depends on how far back the camera is.
 */
const CAM_PARALLAX_PX = 4;

/** The flip spring. Underdamped, but only just: a few degrees of overshoot. */
const FLIP_K = 58;
const FLIP_D = 11;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  #ifdef ROOMS
    // Per-instance origin of this card's cell in the room-number atlas.
    attribute vec2 aRoomCell;
    varying vec2 vRoomCell;
  #endif
  void main() {
    vUv = uv;
    #ifdef ROOMS
      vRoomCell = aRoomCell;
    #endif
    // three declares instanceMatrix itself once the object is an
    // InstancedMesh; every card in the site is an instance of this one plane.
    vec4 local = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
    #endif
    vec4 w = modelMatrix * local;
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uGrain;
  uniform sampler2D uPrint;
  // The card stock, off the real photograph. Zero-mean detail around 0.5;
  // see loadStockTexture in textures.ts for why it is a detail map and not
  // the photograph itself.
  uniform sampler2D uStock;
  uniform float uStockAmt;    // 0 until (or unless) the photograph loads
  uniform float uStockRepeat;
  // The back of the card: blank stock carrying one line. Alpha coverage only;
  // the ink colour comes from uInk.
  uniform sampler2D uBack;
  uniform float uBackInk;     // the line fading on as the card settles
  uniform vec3 uInk;
  uniform float uGrainRepeat;
  uniform float uFlat;     // 0 = lit card, 1 = flat exact-hex paper field
  uniform float uGlass;    // fresnel rim + deboss chroma. 0 below 768px.
  uniform float uChroma;   // chromatic split, in card-UV. Always sub-pixel.
  uniform float uRim;      // cool rim light, alive only in the void
  uniform float uLanded;   // 0 floating, 1 resting on the implied desk
  uniform float uBounce;   // soft fill coming up off the desk
  uniform float uEdge;     // silhouette AA width in card units, from JS
  uniform vec3 uPaper;
  uniform vec3 uWarm;
  uniform vec3 uShadow;
  uniform vec3 uRimColor;
  uniform vec3 uDeskWarm;
  uniform vec3 uNight;
  uniform vec3 uLightPos;
  uniform float uLightNear;   // distance at which the paper is full cream
  uniform float uLightFar;    // distance at which it has fallen to shadow
  uniform vec2 uCardSize;
  uniform vec2 uPlaneSize;
  // The card is one flat plane that only ever rotates on Y, so its normal is
  // constant across every fragment — a uniform, not an interpolated varying.
  uniform vec3 uCardNormal;
  varying vec2 vUv;
  varying vec3 vWorld;
  #ifdef ROOMS
    uniform sampler2D uRooms;
    uniform vec4 uRoomRect;   // where on the card: u0, v0, width, height
    uniform vec2 uRoomCell;   // one cell's size in atlas UV
    varying vec2 vRoomCell;
  #endif

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    // Position in card units, and the card's own 0–1 UV. These differ now
    // that the plane is bigger than the card.
    vec2 card = (vUv - 0.5) * uPlaneSize;
    vec2 cuv = card / uCardSize + 0.5;

    float d = sdRoundedBox(card, uCardSize * 0.5, 0.08);
    float cardA = 1.0 - smoothstep(-uEdge, uEdge, d);

    // ── The desk, which is never modelled ────────────────────────────────
    // Only light and shadow: a pool of warm bounce around the card's base
    // with a contact shadow darkening it where the card meets the surface.
    // The shadow tightens and deepens as the card lands. Both fade to the
    // clear colour before the plane's edge, so that edge never shows.
    vec3 deskCol = uNight;
    float deskA = 0.0;
    float deskLive = 0.0;
  #ifdef DESK
    deskLive = uLanded * (1.0 - cardA);
    if (deskLive > 0.002) {
      float below = smoothstep(0.22, -0.30, card.y + uCardSize.y * 0.5);
      float fade =
        (1.0 - smoothstep(1.55, 2.05, abs(card.x))) *
        (1.0 - smoothstep(1.70, 2.15, abs(card.y)));
      float od = max(d, 0.0);
      // The lit pool falls off faster than it used to so it hugs the base
      // instead of washing the whole lower frame, where the copy lives. The
      // occlusion is tighter still, so what reads is a dark contact line with
      // light around it — a card on a surface, rather than a glow.
      float lit = exp(-od * 1.9);
      float occ = exp(-od / mix(0.85, 0.24, uLanded));

      /*
       * Signed: positive is bounce coming up off the surface, negative is the
       * contact shadow where the card meets it.
       *
       * Since the canvas went transparent this can no longer be "night plus a
       * term" — night is not ours to paint any more, there is a photograph of
       * a desk behind this. So the two halves composite instead: the shadow
       * lays black over the plate at its own strength, and the bounce lays
       * warm over it at its own. That is what makes the card sit on the
       * photographed desk rather than in front of it.
       */
      float d = deskLive * below * fade * (lit * 0.42 - occ * 0.38);
      deskCol = d < 0.0 ? vec3(0.0) : uDeskWarm;
      deskA = clamp(abs(d) * 2.2, 0.0, 1.0);
    }
  #endif

    // In the void there is nothing outside the card but the clear colour.
    // Discarding it keeps beat 1 at pass 01's fill cost.
    if (cardA <= 0.002 && deskLive <= 0.002) discard;

    // ── The card ─────────────────────────────────────────────────────────
    // Two surface samples, at two scales, and they are not redundant:
    //
    //   stock — the photographed card, at a low repeat. This is the stock's
    //           actual character: fibre clumping, fleck, the unevenness that
    //           no amount of value noise convincingly fakes.
    //   grain — the procedural tile, at 10–90 repeats depending on viewport.
    //           This is what still has tooth at maximum push-in, where the
    //           camera is looking at millimetres of card and the photograph
    //           has long since gone soft.
    //
    // COST: one extra texture read in every variant, including the lean one
    // that the pivot uses — which is the beat where fill rate decides the
    // frame. It is taken deliberately: the pivot is the exact moment the
    // surface is being examined, so it is the one place the photograph earns
    // its sample. uStockAmt is 0, and the sample therefore free of visual
    // consequence, if the photograph never loads.
    /*
     * Which face are we looking at.
     *
     * The card has two sides since pass 06: the printed front a guest scans,
     * and blank stock behind it. It turns over as it falls, so the material
     * is DoubleSide and this is the only thing that tells the two apart.
     *
     * The back's UV is mirrored in x. Without that, everything on the back
     * would be reversed, which is right for a print bleeding through a sheet
     * and wrong for anything actually set on it.
     */
    float facing = gl_FrontFacing ? 1.0 : 0.0;
    vec2 fuv = gl_FrontFacing ? cuv : vec2(1.0 - cuv.x, cuv.y);

    float grain = texture2D(uGrain, fuv * uGrainRepeat).r - 0.5;
    float stock = (texture2D(uStock, fuv * uStockRepeat).r - 0.5) * uStockAmt;
    vec3 tint = uPaper * (1.0 + grain * 0.05 + stock * 0.14);

    vec3 col = tint;
    float deboss = 0.0;
    if (uFlat < 1.0) {
      vec4 pr = texture2D(uPrint, fuv);
      vec3 ink = pr.rgb * (1.0 + grain * 0.10);
    #ifdef CHROMA
      {
        // Light splitting on the letterpress deboss: red and blue take their
        // ink coverage from a fraction of a texel either side of green, so
        // the split appears only where coverage is changing — an embossed
        // edge — and is invisible across flat stock. Not a glass panel, and
        // not a refraction of a background that does not exist.
        float aR = texture2D(uPrint, fuv + vec2(uChroma, 0.0)).a;
        float aL = texture2D(uPrint, fuv - vec2(uChroma, 0.0)).a;
        deboss = aR - aL;
        vec3 cover = mix(vec3(pr.a), vec3(aR, pr.a, aL), uGlass) * facing;
        col = mix(tint, ink, cover * (1.0 - uFlat));
      }
    #else
      col = mix(tint, ink, pr.a * facing * (1.0 - uFlat));
    #endif

      /*
       * The back carries one line and nothing else. uBackInk fades it on as
       * the card settles; (1 - uFlat) takes it off again before the handoff,
       * which is what keeps the pivot's terminal frame blank stock and the
       * measured seam exactly where it was.
       */
      float back = texture2D(uBack, fuv).a * (1.0 - facing) * uBackInk;
      col = mix(col, uInk * (1.0 + grain * 0.10), back * (1.0 - uFlat));
    }

    // The only thing that differs card to card: the room number, taken from
    // one shared atlas at a per-instance cell offset. One extra sample, and
    // only in this variant — beat 3's pivot never compiles it in.
  #ifdef ROOMS
    {
      vec2 rn = (fuv - uRoomRect.xy) / uRoomRect.zw;
      if (rn.x > 0.0 && rn.x < 1.0 && rn.y > 0.0 && rn.y < 1.0) {
        float a = texture2D(uRooms, vRoomCell + rn * uRoomCell).a;
        col = mix(col, uInk * (1.0 + grain * 0.10), a * (1.0 - uFlat));
      }
    }
  #endif

    // A single warm key light, falling off to near-black. Art-directed, not
    // inverse-square: over a card this size 1/d² either crushes the paper to
    // a grey-brown midtone or leaves a visible spotlight terminator arc.
    float dist = distance(vWorld, uLightPos);
    float atten = 1.0 - smoothstep(uLightNear, uLightFar, dist);
    // The key light rakes across the surface, so the stock's relief is only
    // visible where the light actually reaches — which is what makes it read
    // as texture on an object rather than as a pattern printed on one.
    float relief = 1.0 + (grain * 0.14 + stock * 0.26) * atten;
    vec3 lit = mix(uShadow, col * uWarm, atten) * relief;

    // Soft bounce up off the desk as the card lands. The other half of what
    // makes the room exist.
    float bounceMask = smoothstep(0.4, -1.7, card.y);
    lit += uDeskWarm * uBounce * bounceMask * 0.09 * (1.0 - atten * 0.4);

    // The edge terms — cool rim and glass — are dead from the moment the card
    // lands, which is the whole of beat 3. They are compiled out rather than
    // branched around: a runtime test on a uniform is NOT free here. Measured
    // in this container, an unused-but-present fresnel block cost a third of
    // the frame time during the pivot, because the rasteriser evaluates both
    // sides and masks. See the material variants below.
  #ifdef EDGE_TERMS
    {
      // The band is deliberately narrow: widen it and these stop reading as
      // light catching an edge and start reading as a plastic bevel.
      // The normal has to follow the face. Once the card turns past 90° the
      // uniform points away from the camera, and an unflipped dot product
      // saturates the fresnel to 1 across the whole card, which lights the
      // entire back edge to edge.
      vec3 N = gl_FrontFacing ? uCardNormal : -uCardNormal;
      vec3 V = normalize(cameraPosition - vWorld);
      float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
      float edgeBand = smoothstep(-0.055, -0.004, d);

      // Cool rim catching the edge opposite the key. Dies as the card lands.
      float opposite = smoothstep(-0.2, 0.9, card.x);
      lit += uRimColor * uRim * edgeBand * opposite * (0.10 + fres * 0.30);

      // The glass: a fresnel-weighted brightening of the card's edge as it
      // turns away, plus a catch of light on the deboss itself.
      lit += uGlass * (edgeBand * fres * 0.16 + abs(deboss) * 0.07);
    }
  #endif

    // Handoff ramp: resolve to an exact flat paper field plus paper grain.
    // The stock is present here too, but at a fraction of its lit amplitude:
    // this frame has to average to the exact --paper hex the DOM layer
    // cross-fades in over, and anything with a mean offset would show as a
    // seam at the one moment there is nothing else on screen to look at.
    vec3 flatField = uPaper * (1.0 + grain * 0.045 + stock * 0.05);
    vec3 cardCol = mix(lit, flatField, uFlat);

    // Premultiplied. The card is opaque wherever it covers a fragment; the
    // desk terms carry only their own strength, so everything outside the
    // card's silhouette lets the plate behind the canvas through.
    float a = max(cardA, deskA);
    vec3 rgb = mix(deskCol * deskA, cardCol, cardA);
    gl_FragColor = vec4(rgb, a);
  }
`;

export interface CardScene {
  /** Global stage progress, 0–1. */
  setProgress(g: number): void;
  setSize(width: number, height: number): void;
  /** Ends beat 1's autonomous rotation. Idempotent; it never restarts. */
  releaseIntro(): void;
  /**
   * Pointer position, already spring damped, as -1..1 from the centre of the
   * viewport, plus how much of it should apply right now (1 in the hero, 0
   * once the descent has taken over).
   *
   * At (0, 0) every camera number is bit-identical to what it is without this
   * call ever having been made: the offset is added, not blended into, the
   * path, and zero times anything is zero. That is the property the pivot
   * handoff depends on.
   */
  setPointer(x: number, y: number, amount: number): void;
  /** Idempotent. Renders one frame immediately, then keeps the loop alive. */
  start(): void;
  /** Idempotent. Fully stops the RAF loop — not just an opacity-0 canvas. */
  stop(): void;
  dispose(): void;
}

export function createCardScene(
  canvas: HTMLCanvasElement,
  opts: { isMobile: boolean }
): CardScene {
  const { isMobile } = opts;

  /*
   * Transparent, since pass 06. The hero is a photographed desk in DOM behind
   * this canvas, and the card has to stand in that room rather than in front
   * of a black rectangle covering it.
   *
   * Nothing else changes colour: everywhere the canvas is not drawing, what
   * shows through is `html { background: var(--night) }`, which is the same
   * hex this used to clear to. The pivot's terminal frame is still opaque,
   * because there the card fills the viewport at alpha 1.
   *
   * premultipliedAlpha stays at three's default of true, so the shader
   * outputs rgb already multiplied by a. Straight alpha through three's
   * ONE / ONE_MINUS_SRC_ALPHA blend would fringe every edge.
   */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // i.e. no encode
  renderer.setClearColor(new THREE.Color(NIGHT), 0);

  // ── TEMPORARY diagnostics (?debug=1). Remove with debug.ts. ─────────────
  const DEBUG = debugEnabled();
  if (DEBUG) {
    const gl = renderer.getContext();
    stageDebug.contextType = Object.getPrototypeOf(gl)?.constructor?.name
      ?? "unknown";
    stageDebug.pixelRatio = renderer.getPixelRatio();
    canvas.addEventListener("webglcontextlost", () => {
      stageDebug.contextLost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      stageDebug.contextLost = false;
    });
    // three swallows nothing here — this replaces its own console reporting
    // with the full log, verbatim, so it can be read on a phone.
    renderer.debug.onShaderError = (prog, glVs, glFs) => {
      const c = renderer.getContext();
      const parts = [
        c.getProgramInfoLog(prog),
        c.getShaderInfoLog(glVs),
        c.getShaderInfoLog(glFs),
      ].filter((s) => s && s.trim());
      stageDebug.shaderError = parts.join("\n---\n") || "program link failed";
    };
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 30);
  const halfFovTan = Math.tan((camera.fov * Math.PI) / 360);

  const grain = makeGrainTexture();
  grain.anisotropy = isMobile
    ? 1
    : Math.min(4, renderer.capabilities.getMaxAnisotropy());

  let dirty = true;
  // The wordmark is set in the display face, which is a webfont — the texture
  // is created immediately with whatever is available and redrawn in place
  // once the font resolves. No gate, and no loading screen.
  const print = makePrintTexture(() => {
    dirty = true;
  });
  const roomsTex = makeRoomsTexture(() => {
    dirty = true;
  });
  const backTex = makeBackTexture(() => {
    dirty = true;
  });

  /*
   * The card stock, off card.png. Loaded asynchronously and switched in when
   * it arrives — there is no loading screen on this site and the opening
   * frame must not wait on a photograph. Until then (and permanently, if the
   * file is not there) uStockAmt is 0 and the card is procedural cream, which
   * is what it was before this existed.
   *
   * A 1×1 white pixel stands in for the texture in the meantime: a sampler
   * bound to nothing is undefined behaviour in WebGL and produces black on
   * some drivers, which through `- 0.5` would darken the whole card.
   */
  const stockPlaceholder = new THREE.DataTexture(
    new Uint8Array([128, 128, 128, 255]),
    1,
    1
  );
  stockPlaceholder.needsUpdate = true;

  const uniforms: Record<string, THREE.IUniform> = {
      uGrain: { value: grain },
      uPrint: { value: print },
      uStock: { value: stockPlaceholder },
      uStockAmt: { value: 0 },
      uBack: { value: backTex },
      uBackInk: { value: 0 },
      // Low, because this is the stock's character rather than its tooth —
      // the tooth is uGrainRepeat's job. Mirrored wrapping means the folds
      // this creates are not visible.
      uStockRepeat: { value: 3.0 },
      uGrainRepeat: { value: 16.0 }, // set from the viewport in setSize
      uFlat: { value: 0 },
      uGlass: { value: 0 },
      uChroma: { value: 0 },
      uRim: { value: 1 },
      uLanded: { value: 0 },
      uBounce: { value: 0 },
      uEdge: { value: 0.004 },
      uPaper: { value: new THREE.Color(PAPER) },
      // Restrained warmth: the card is cream stock, not gold leaf, and any
      // hue the key adds is hue the FLATTEN ramp has to remove again.
      uWarm: { value: new THREE.Color(1.0, 0.99, 0.972) },
      uShadow: { value: new THREE.Color(0.05, 0.042, 0.033) },
      // Cool rim: enough blue to read against cream, not enough to tint it.
      uRimColor: { value: new THREE.Color(0.42, 0.53, 0.68) },
      uDeskWarm: { value: new THREE.Color(1.0, 0.87, 0.7) },
      uNight: { value: new THREE.Color(NIGHT) },
      uLightPos: { value: new THREE.Vector3(-2.1, 1.5, 1.5) },
      // Chosen so the card's upper-left and the whole terminal region sit at
      // full cream, the centre lands around 0.85, and the far corner goes to
      // near-black.
      uLightNear: { value: 2.3 },
      uLightFar: { value: 5.2 },
      uCardSize: { value: new THREE.Vector2(CARD_W, CARD_H) },
      uPlaneSize: { value: new THREE.Vector2(PLANE_W, PLANE_H) },
    uCardNormal: { value: new THREE.Vector3(0, 0, 1) },
    uRooms: { value: roomsTex },
    // Sized 2:1 in world units to match the atlas cell, so glyphs are not
    // stretched. Sits low on the card, where a room number would be printed.
    uRoomRect: { value: new THREE.Vector4(0.41, 0.055, 0.18, 0.0675) },
    uRoomCell: {
      value: new THREE.Vector2(1 / ROOM_ATLAS_COLS, 1 / ROOM_ATLAS_ROWS),
    },
    uInk: { value: new THREE.Color("#15171b") },
  };

  // Switched in whenever it arrives. Nothing waits on it.
  let stock: THREE.Texture | null = null;
  const cancelStock = loadStockTexture("/media/card.png", (tex) => {
    tex.anisotropy = isMobile
      ? 1
      : Math.min(4, renderer.capabilities.getMaxAnisotropy());
    stock = tex;
    uniforms.uStock.value = tex;
    uniforms.uStockAmt.value = 1;
    dirty = true;
  });

  /*
   * Three compiled variants of the same shader, sharing one uniforms object.
   *
   * A runtime `if` on a uniform is not free: the rasteriser evaluates both
   * sides and masks, so a fresnel block that is switched off still costs a
   * third of the frame during the pivot, where the card fills the screen and
   * fill is the whole budget. Compiling the dead code out instead is the only
   * version of "off" that is actually off.
   *
   *   rich — beats 1 and 2: edge terms (and, at >= 768px, the deboss chroma)
   *          plus the desk
   *   desk — beat 3 while the card does not fill the frame
   *   lean — beat 3 once it does. This is pass 01's shader, exactly.
   *
   * All three are compiled up front, so swapping between them mid-scroll
   * never triggers a compile and never hitches.
   */
  const makeVariant = (defines: Record<string, string>) =>
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      // The card turns over as it falls, so both sides have to rasterise.
      // Without this the back face is culled and the card simply vanishes
      // halfway through the flip.
      side: THREE.DoubleSide,
      // The canvas composites with the page now, so fragments carry their own
      // coverage. Premultiplied, which is three's default blend.
      transparent: true,
      depthWrite: true,
      defines,
      uniforms,
    });

  let rich = makeVariant({ DESK: "", EDGE_TERMS: "" });
  const deskOnly = makeVariant({ DESK: "" });
  const lean = makeVariant({});
  const rooms = makeVariant({ ROOMS: "" });

  const geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H);

  // Which atlas cell each card reads its room number from. Static, set once.
  const cells = new Float32Array(CARD_COUNT * 2);
  for (let i = 0; i < CARD_COUNT; i++) {
    cells[i * 2] = (i % ROOM_ATLAS_COLS) / ROOM_ATLAS_COLS;
    cells[i * 2 + 1] =
      1 - (Math.floor(i / ROOM_ATLAS_COLS) + 1) / ROOM_ATLAS_ROWS;
  }
  geometry.setAttribute(
    "aRoomCell",
    new THREE.InstancedBufferAttribute(cells, 2)
  );

  // ONE InstancedMesh for every card in the site. `count` is what changes
  // between beats; the draw call count never does.
  const mesh = new THREE.InstancedMesh(geometry, rich, CARD_COUNT);
  mesh.frustumCulled = false; // the array is laid out well outside the card
  mesh.count = 1;
  scene.add(mesh);

  /*
   * Two placements per card, generated once from a seeded PRNG so they are
   * stable across reloads: a receding corridor for beat 4, and a loose fan for
   * beat 6. Beats 5 and 6 interpolate between them, mostly while the cards are
   * dark. Card 0 is the hero, and in the corridor it sits exactly where it has
   * been since it landed — the guest journey happened on this card.
   */
  interface Placement {
    x: number;
    y: number;
    z: number;
    rotY: number;
    rotZ: number;
    scale: number;
  }
  const corridor: Placement[] = [];
  const fan: Placement[] = [];
  {
    const rand = (() => {
      let a = 0x9e3779b9;
      return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    for (let i = 0; i < CARD_COUNT; i++) {
      if (i === 0) {
        // The hero stays exactly where it landed. The guest journey happened
        // on this card, and beat 4 opens by returning to it.
        corridor.push({ x: 0, y: 0, z: 0, rotY: 0, rotZ: 0, scale: 1 });
      } else {
        /*
         * A field of cards receding into the dark. Lateral spread is held
         * constant with depth rather than widened, so perspective does the
         * converging — that is what makes it read as doors down a corridor
         * instead of a flat wall of cards. Slots are stepped by coprime
         * strides and then jittered, so it lands off-grid without looking
         * scattered.
         */
        const r = (i - 1) / (CARD_COUNT - 2); // 0 near, 1 far
        const slotX = ((i * 3) % 5) - 2; // -2..2
        const slotY = ((i * 2) % 3) - 1; // -1..1
        corridor.push({
          x: slotX * 2.15 + (rand() - 0.5) * 0.9,
          y: slotY * 1.45 + (rand() - 0.5) * 0.7,
          z: -1.1 - r * 15 - rand() * 0.9,
          rotY: -Math.sign(slotX || 1) * (0.08 + rand() * 0.13),
          rotZ: (rand() - 0.5) * 0.07,
          scale: 1,
        });
      }

      // Dealt across the lower frame, overlapping, tilted like a hand.
      const t = i / (CARD_COUNT - 1);
      const a = (t - 0.5) * 2;
      fan.push({
        x: a * 3.45,
        y: -1.45 - (1 - Math.cos(a * 1.15)) * 0.55 + (rand() - 0.5) * 0.12,
        z: -0.35 - t * 0.5 + (rand() - 0.5) * 0.16,
        rotY: -a * 0.1,
        rotZ: a * 0.42 + (rand() - 0.5) * 0.05,
        scale: 0.62,
      });
    }
  }

  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpPos = new THREE.Vector3();
  const tmpScale = new THREE.Vector3();
  const tmpMat = new THREE.Matrix4();

  /** Blend the two placements and push the result into the instance buffer. */
  function layoutCards(fanT: number, emerge: number) {
    for (let i = 0; i < CARD_COUNT; i++) {
      const a = corridor[i];
      const b = fan[i];
      const k = fanT;
      // Card 0 never shrinks away before the others arrive.
      const grow = i === 0 ? 1 : emerge;
      tmpPos.set(
        a.x + (b.x - a.x) * k,
        a.y + (b.y - a.y) * k,
        a.z + (b.z - a.z) * k
      );
      tmpEuler.set(
        0,
        a.rotY + (b.rotY - a.rotY) * k,
        a.rotZ + (b.rotZ - a.rotZ) * k
      );
      tmpQuat.setFromEuler(tmpEuler);
      const s = (a.scale + (b.scale - a.scale) * k) * grow;
      tmpScale.set(s, s, s);
      mesh.setMatrixAt(i, tmpMat.compose(tmpPos, tmpQuat, tmpScale));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // The key light travels with the beat: steeper and more overhead while the
  // card is in the void, dropping to a lower, more raking angle as it lands.
  // It ends at exactly the position beat 3 was tuned against.
  //
  // The void position is expressed as an offset from where the card actually
  // floats, not in world coordinates. The falloff shoulder is tight enough
  // that half a unit of extra distance takes the stock from cream to grey, so
  // a light placed absolutely ends up much further from a card that is 1.6
  // units up in the air, and the card reads as metal again.
  const KEY_VOID = new THREE.Vector3(
    -1.85,
    CARD_FLOAT_Y + 2.0,
    CARD_FLOAT_Z + 1.35
  );
  const KEY_DESK = new THREE.Vector3(-2.1, 1.5, 1.5);
  /*
   * The key's colour, in the void and on the desk.
   *
   * WARM_VOID used to be all but neutral, which was right when the card hung
   * in black and there was nothing to compare it to. Since pass 06 it stands
   * in a photograph of a lamplit walnut desk, and a neutral card in an amber
   * room reads as a cut-out laid over a photograph rather than as an object
   * inside it. Warmed until the paper sits in the plate's colour temperature.
   *
   * Deliberately still a long way short of the lamp itself: this is cream
   * stock catching warm light, not gold leaf.
   */
  const WARM_VOID = new THREE.Color(1.0, 0.955, 0.885);
  const WARM_DESK = new THREE.Color(1.0, 0.965, 0.912);

  /*
   * The light through beats 4–6. There is no fog volume anywhere in this
   * scene; depth is sold entirely by how far each card is from this one key,
   * through the same smoothstep falloff the card has always used. Reaching
   * down a corridor just means moving the far edge of that falloff out.
   */
  interface KeyStop {
    pos: THREE.Vector3;
    near: number;
    far: number;
  }
  const L_DESK: KeyStop = { pos: KEY_DESK, near: 2.3, far: 5.2 };
  const L_ARRAY: KeyStop = {
    pos: new THREE.Vector3(-3.0, 2.3, 3.4),
    near: 3.4,
    far: 15.5,
  };
  /*
   * The light does not move to go out; its reach simply shortens until it
   * touches nothing. `near` is held and only `far` is drawn in, which keeps
   * the falloff's shape and makes the cards go dark in depth order, the far
   * ones first. Collapsing both to zero instead put the whole change into a
   * fraction of the beat — everything went out at once, part-way through a
   * ramp that then had nothing left to do.
   */
  const L_OUT: KeyStop = { pos: L_ARRAY.pos, near: L_ARRAY.near, far: 3.5 };
  const L_FAN: KeyStop = {
    pos: new THREE.Vector3(-2.7, 2.6, 4.2),
    near: 3.2,
    far: 12.5,
  };

  const keyPos = new THREE.Vector3();
  const mixKey = (a: KeyStop, b: KeyStop, t: number): KeyStop => {
    keyPos.lerpVectors(a.pos, b.pos, t);
    return {
      pos: keyPos,
      near: a.near + (b.near - a.near) * t,
      far: a.far + (b.far - a.far) * t,
    };
  };

  // Both ends of the dolly adapt to the viewport: the start pulls back far
  // enough to frame the whole card, the end pushes in far enough that the
  // frame stays inside the blank band beside the QR.
  let startZ: number = PIVOT_START.z;
  let endZ = 0.35;
  let camBack = 0;
  let viewportH = 1;
  let glassMax = 0;

  let progress = 0;
  let running = false;
  let raf = 0;

  // Beat 1's autonomous rotation — the only autonomous motion in the site.
  let introAmp = 1;
  let introReleasedAt = 0;

  // Spring damped pointer, written from Stage. -1..1 from the centre of the
  // viewport, plus how much of it applies at the current scroll position.
  let ptrX = 0;
  let ptrY = 0;
  let ptrAmt = 0;

  /*
   * The flip, as a spring chasing a scroll-derived target rather than as a
   * position read straight off scroll.
   *
   * Read straight off scroll, the turn is rigidly welded to the wheel: it
   * stops the instant you stop and it has no weight at all. As a spring it
   * lags the scroll on the way over and settles past the landing, which is
   * what a stiff card actually does when it is dropped. Underdamped on
   * purpose, but only just: the overshoot is a few degrees.
   */
  let flipAngle = 0;
  let flipVel = 0;
  let flipMs = 0;
  let flipSettling = false;

  /** Whether card 0's instance matrix is currently identity. */
  let heroIsIdentity = false;

  /**
   * Beat 3's dolly, at eased parameter t. THE camera path — beats 1 and 2 are
   * expressed as offsets from dollyAt(0) that decay to zero, so there is
   * exactly one place these numbers live and the handoff cannot drift.
   */
  function dollyAt(t: number) {
    const z = startZ + (endZ - startZ) * t;

    // The camera always aims for the blank band and geometry decides how much
    // of it the camera may have. While the frame is still wider than the card
    // the clamp pins it to dead centre; as z shrinks it is progressively
    // freed until it reaches PIVOT_END exactly at t = 1. Shaping the drift
    // this way rather than on a tuned curve is what keeps a card edge — and
    // the darkness beyond it — out of every mid-dolly frame at every aspect.
    const halfW = halfFovTan * z * camera.aspect;
    const halfH = halfFovTan * z;
    const maxX = Math.max(0, CARD_W / 2 - halfW - 0.03);
    const maxY = Math.max(0, CARD_H / 2 - halfH - 0.03);

    // Prefer to sit clear of the printed block, but never at the cost of
    // pulling in a card edge. Early on this is unsatisfiable and the QR stays
    // in shot, which is the point — it guides the eye into the centre.
    const clearOfPrint = QR_LEFT_X - halfW - 0.04;
    let x = Math.min(
      PIVOT_START.x + (PIVOT_END.x - PIVOT_START.x) * t,
      clearOfPrint
    );
    let y = PIVOT_START.y + (PIVOT_END.y - PIVOT_START.y) * t;
    x = Math.min(maxX, Math.max(-maxX, x));
    y = Math.min(maxY, Math.max(-maxY, y));

    return { x, y, z };
  }

  /** Where the card sits, in world units, at global progress g. */
  function cardAt(g: number) {
    const drop = easeOutCubic(within(g, LANDING));
    return {
      y: CARD_FLOAT_Y * (1 - drop),
      z: CARD_FLOAT_Z * (1 - drop),
      drop,
    };
  }

  /**
   * The camera at global progress g. For g >= PIVOT.start this is exactly the
   * dolly; before that it is the dolly's own start plus offsets that reach
   * zero at PIVOT.start, so beat 2 ends on beat 3's first frame by
   * construction rather than by two paths happening to agree.
   *
   * The offsets hold flat through beats 1 and 2 and only release across
   * CONVERGE, after the copy has gone. Converging any earlier puts the card
   * at its pivot size while there is still copy on screen, and the two end up
   * occupying the same pixels.
   */
  function cameraAt(g: number, cardY: number) {
    const base = dollyAt(easeInOutCubic(within(canvasPivotProgress(g), DOLLY)));

    if (g > PIVOT.end) {
      // Beat 4 onward. The return to the desk needs no code of its own: the
      // dolly above is already running backwards, because canvasPivotProgress
      // runs back down through the same numbers. All that is left is to keep
      // going once it has bottomed out, and then come to rest.
      const out = easeInOutCubic(within(g, RETREAT_OUT));
      const back = easeInOutCubic(within(g, RETREAT_IN));
      return {
        x: base.x,
        y:
          base.y +
          RETREAT_Y_FAR * out -
          (RETREAT_Y_FAR - RETREAT_Y_REST) * back,
        z: base.z + RETREAT_FAR * out - (RETREAT_FAR - RETREAT_REST) * back,
      };
    }
    if (g >= PIVOT.start) return base;

    const lead = 1 - easeInOutCubic(within(g, CONVERGE));
    return {
      x: base.x,
      y: base.y + (CAM_TILT + cardY * CAM_FOLLOW) * lead,
      z: base.z + camBack * lead,
    };
  }

  function applyProgress(nowMs: number) {
    const g = progress;
    const u = uniforms;

    const cardPos = cardAt(g);
    mesh.position.set(0, cardPos.y, cardPos.z);

    // Autonomous rotation, easing away once the user has scrolled. A sine is
    // already still at its extremes, which is the ease the brief asks for.
    let idleY = 0;
    if (introAmp > 0) {
      if (introReleasedAt > 0) {
        introAmp = Math.max(0, 1 - (nowMs - introReleasedAt) / INTRO_RELEASE_MS);
      }
      const eased = introAmp * introAmp * (3 - 2 * introAmp);
      idleY =
        INTRO_AMPLITUDE *
        eased *
        Math.sin((nowMs / INTRO_PERIOD_MS) * Math.PI * 2);
    }

    /*
     * The flip. Integrated here rather than in a separate loop because it has
     * to see the same `g` the rest of the frame does.
     *
     * Past the pivot the angle is dropped to zero outright. That sounds like
     * it should be visible and is not: at PIVOT.end the camera is inside the
     * card's own surface with uFlat at 1, so the entire frame is one flat
     * cream colour and there is no detail anywhere in it for a rotation to
     * show up in. The corridor then opens on that same frame and dollies back
     * out with the card front-on, which is what beats 4 to 6 need, since the
     * room numbers are printed on the front.
     */
    const flipTarget = Math.PI * easeInOutCubic(within(g, FLIP));
    {
      const dt = Math.min(flipMs ? (nowMs - flipMs) / 1000 : 1 / 60, 1 / 30);
      flipMs = nowMs;
      flipVel += (FLIP_K * (flipTarget - flipAngle) - FLIP_D * flipVel) * dt;
      flipAngle += flipVel * dt;
      flipSettling =
        Math.abs(flipTarget - flipAngle) > 1e-4 || Math.abs(flipVel) > 1e-4;
      if (!flipSettling) {
        flipAngle = flipTarget;
        flipVel = 0;
      }
    }
    const flip = g <= PIVOT.end ? flipAngle : 0;

    // Cursor tilt, on top of the idle rather than instead of it, and scaled
    // by the same amount that retires the parallax. Both are gone by the time
    // the card is landing.
    mesh.rotation.y = idleY + flip - ptrX * TILT_Y * ptrAmt;
    mesh.rotation.x = ptrY * TILT_X * ptrAmt;

    u.uBackInk.value = easeOutCubic(within(g, BACK_INK));

    // The plane's normal, for the fresnel and rim terms. This used to assume
    // rotation on Y only; with a tilt on X as well it is Rz·Ry·Rx applied to
    // (0,0,1), which for z = 0 is the expression below. Getting this wrong
    // does not throw, it just puts the edge light on the wrong edge.
    {
      const sx = Math.sin(mesh.rotation.x);
      const cx = Math.cos(mesh.rotation.x);
      const sy = Math.sin(mesh.rotation.y);
      const cy = Math.cos(mesh.rotation.y);
      u.uCardNormal.value.set(sy * cx, -sx, cy * cx);
    }

    const cam = cameraAt(g, cardPos.y);

    /*
     * Cursor parallax on the camera. An offset added to the finished path,
     * never a change to it: at ptrX = ptrY = 0, or at ptrAmt = 0, every one
     * of these terms is exactly zero and the dolly is bit-identical to what
     * it was before this existed. That is what keeps the measured pivot
     * handoff from drifting.
     *
     * The offset is applied to the position and to the look-at target
     * equally, so the camera translates rather than rotates. A rotation here
     * would change the framing that the pivot's fit calculations depend on.
     *
     * Negative, because moving the camera left makes the card appear to move
     * right, and the card is meant to drift with the cursor.
     */
    const dist = Math.max(cam.z - cardPos.z, 0.05);
    const worldPerPx = (2 * halfFovTan * dist) / Math.max(viewportH, 1);
    const off = CAM_PARALLAX_PX * worldPerPx * ptrAmt;
    const ox = -ptrX * off;
    const oy = ptrY * off;

    camera.position.set(cam.x + ox, cam.y + oy, cam.z);
    // Straight-on dolly: no rotation, so the framing maths above holds.
    camera.lookAt(cam.x + ox, cam.y + oy, cardPos.z);

    // Glass rises through the void and is gone by the time the card is paper
    // on a desk. That contrast is the point of the term existing at all.
    u.uGlass.value =
      glassMax *
      easeInOutCubic(within(g, { start: 0.01, end: DESCENT.start })) *
      (1 - easeInOutCubic(within(g, LANDING)));
    u.uRim.value = 1 - easeInOutCubic(within(g, LANDING));
    u.uLanded.value = cardPos.drop;
    u.uBounce.value = cardPos.drop;

    // The key drops lower and warms as the card comes down, then reaches out
    // down the corridor, goes out entirely for the number, and comes back for
    // the fan. One light, four stops, no fog.
    u.uWarm.value.lerpColors(WARM_VOID, WARM_DESK, cardPos.drop);
    if (g <= PIVOT.end) {
      u.uLightPos.value.lerpVectors(KEY_VOID, KEY_DESK, cardPos.drop);
      u.uLightNear.value = L_DESK.near;
      u.uLightFar.value = L_DESK.far;
    } else {
      // The two lighting changes ramp linearly, not eased. Eased, the middle
      // of the curve does nearly all the visible work and the beat reads as a
      // flick rather than a fade.
      let k = mixKey(L_DESK, L_ARRAY, easeInOutCubic(within(g, RECEDE)));
      k = mixKey(k, L_OUT, within(g, LIGHTS_OUT));
      k = mixKey(k, L_FAN, within(g, LIGHTS_UP));
      u.uLightPos.value.copy(k.pos);
      u.uLightNear.value = k.near;
      u.uLightFar.value = k.far;
    }

    // The array: how many cards exist this frame, and where they are.
    const emerge = easeOutCubic(within(g, {
      start: RECEDE.start,
      end: RECEDE.start + (RECEDE.end - RECEDE.start) * 0.42,
    }));
    const fanT = easeInOutCubic(within(g, FAN_SETTLE));
    const many = g > RECEDE.start;
    mesh.count = many ? CARD_COUNT : 1;
    if (many) {
      layoutCards(fanT, emerge);
      heroIsIdentity = false;
    } else if (!heroIsIdentity) {
      // While it is the only card, card 0 must be identity so the object
      // transform places it — exactly as it did in beats 1 to 3.
      mesh.setMatrixAt(0, tmpMat.identity());
      mesh.instanceMatrix.needsUpdate = true;
      heroIsIdentity = true;
    }

    // One device pixel in card units at the card's plane.
    const pxPerUnit =
      viewportH / (2 * halfFovTan * Math.max(cam.z - cardPos.z, 0.05));
    u.uEdge.value = 1.4 / Math.max(pxPerUnit, 1);
    // Chromatic split: a fraction of a texel, AND under a screen pixel.
    // Both bounds are needed. The screen bound alone fails while the card is
    // small in frame, where one screen pixel spans many texels — and the
    // printed block has hard edges, so an offset of several texels straddles
    // whole QR modules and the "catch of light" becomes a saturated fringe.
    u.uChroma.value = Math.min(
      PRINT_CHROMA_TEXELS / PRINT_TEXTURE_W,
      0.8 / Math.max(pxPerUnit, 1) / CARD_W
    );
    // The same flatten as beat 3, and on the way back out it simply unwinds,
    // because canvasPivotProgress is running the same numbers backwards.
    u.uFlat.value = within(canvasPivotProgress(g), FLATTEN);

    // Pick the cheapest shader that can still draw this frame. The desk is
    // only reachable when the frame extends past the card's silhouette, which
    // stops being true partway into the dolly — from there on the card is the
    // entire screen and the lean variant draws it.
    const halfW = halfFovTan * (cam.z - cardPos.z) * camera.aspect;
    const halfH = halfFovTan * (cam.z - cardPos.z);
    const deskInFrame =
      Math.abs(cam.x) + halfW > CARD_W / 2 - 0.02 ||
      Math.abs(cam.y - cardPos.y) + halfH > CARD_H / 2 - 0.02;

    // Once there are many cards the desk goes away entirely: a contact pool
    // per instance would multiply the shaded area by the card count, and the
    // array is floating in dark or dealt in a fan, not sitting on a desk.
    const next = many
      ? rooms
      : u.uRim.value > 0 || u.uGlass.value > 0
        ? rich
        : u.uLanded.value > 0 && deskInFrame
          ? deskOnly
          : lean;
    if (mesh.material !== next) mesh.material = next;
    if (DEBUG) {
      stageDebug.variant =
        next === rich
          ? "rich"
          : next === deskOnly
            ? "desk"
            : next === rooms
              ? "rooms"
              : "lean";
      stageDebug.cards = mesh.count;
    }
  }

  function render(nowMs: number) {
    applyProgress(nowMs);
    renderer.render(scene, camera);
    dirty = false;
    if (DEBUG) {
      stageDebug.drawCalls = renderer.info.render.calls;
      stageDebug.frames++;
      stageDebug.bufferW = canvas.width;
      stageDebug.bufferH = canvas.height;
      stageDebug.clientW = canvas.clientWidth;
      stageDebug.clientH = canvas.clientHeight;
    }
  }

  function loop(nowMs: number) {
    raf = requestAnimationFrame(loop);
    // While the intro rotation is alive, or the flip spring is still on its
    // way to where scroll has asked it to be, the scene is time-driven and
    // every frame is dirty. Once both are done we are back to scroll-driven.
    if (introAmp > 0 || flipSettling) dirty = true;
    if (dirty) render(nowMs);
  }

  return {
    setProgress(g: number) {
      if (g === progress) return;
      progress = g;
      dirty = true;
    },
    releaseIntro() {
      if (introReleasedAt === 0 && introAmp > 0) {
        introReleasedAt = performance.now();
      }
    },
    setPointer(x: number, y: number, amount: number) {
      if (x === ptrX && y === ptrY && amount === ptrAmt) return;
      ptrX = x;
      ptrY = y;
      ptrAmt = amount;
      dirty = true;
    },
    setSize(width: number, height: number) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      viewportH = height;

      // Frame the whole card, plus margin, at the start of the dolly.
      const fitW = (CARD_W / 2 + 0.3) / (halfFovTan * camera.aspect);
      const fitH = (CARD_H / 2 + 0.3) / halfFovTan;
      startZ = Math.max(PIVOT_START.z, fitW, fitH);

      // End exactly where the frame first fills with blank stock.
      endZ = Math.max(0.12, BLANK_BAND_HALF / (halfFovTan * camera.aspect));

      // How far back beats 1 and 2 sit: far enough that the card takes a set
      // share of the frame's height, which is aspect-independent and so gives
      // the same composition — and the same band of darkness for the copy —
      // on a phone as on a desktop.
      const voidZ = CARD_H / 2 / VOID_CARD_FRAC / halfFovTan;
      camBack = Math.max(0, voidZ - startZ);

      // Grain frequency follows the viewport, because the terminal frame
      // always shows the same slice of card (2 * BLANK_BAND_HALF wide) — so
      // screen pixels per card unit scale with viewport width. This is what
      // keeps the paper tooth reading as tooth at maximum push-in.
      uniforms.uGrainRepeat.value = Math.min(
        90,
        Math.max(10, width / 32)
      );

      // The glass is never applied below 768px — flat lit card only on
      // phones. Evaluated here rather than at construction so it also holds
      // when a tablet is rotated across the breakpoint, at which point the
      // rich variant is recompiled with or without the deboss chroma so a
      // phone never even carries the extra texture reads in its program.
      const nextGlass = width < 768 ? 0 : 1;
      if (nextGlass !== glassMax) {
        glassMax = nextGlass;
        const wasCurrent = mesh.material === rich;
        rich.dispose();
        rich = makeVariant(
          glassMax > 0
            ? { DESK: "", EDGE_TERMS: "", CHROMA: "" }
            : { DESK: "", EDGE_TERMS: "" }
        );
        if (wasCurrent) mesh.material = rich;
      }

      if (DEBUG) stageDebug.sized = true;

      dirty = true;
      if (!running) render(performance.now()); // keep the pinned frame correct
    },
    start() {
      if (running) return;
      running = true;
      if (DEBUG) stageDebug.looping = true;
      render(performance.now()); // immediate, so resume lands before the fade
      raf = requestAnimationFrame(loop);
    },
    stop() {
      if (!running) return;
      running = false;
      if (DEBUG) stageDebug.looping = false;
      cancelAnimationFrame(raf);
      // One last frame at the progress that was just set, before the loop
      // goes away. Without it the canvas keeps whatever the loop happened to
      // render last, which is only harmless when the sleep was reached by
      // scrolling — arrive at a sleeping stretch in one jump (a restored
      // scroll position, an in-page anchor) and the stale frame can be from
      // the wrong side of a lighting change entirely.
      render(performance.now());
    },
    dispose() {
      cancelAnimationFrame(raf);
      running = false;
      // In flight when the scene goes away — otherwise the decode finishes
      // into a renderer that no longer exists.
      cancelStock();
      mesh.geometry.dispose();
      rich.dispose();
      deskOnly.dispose();
      lean.dispose();
      grain.dispose();
      print.dispose();
      backTex.dispose();
      stockPlaceholder.dispose();
      stock?.dispose();
      roomsTex.dispose();
      rooms.dispose();
      renderer.dispose();
    },
  };
}
