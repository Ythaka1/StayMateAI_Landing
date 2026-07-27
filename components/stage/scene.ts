import * as THREE from "three";
import { makeGrainTexture, makePrintTexture } from "./textures";
import {
  CONVERGE,
  DESCENT,
  DOLLY,
  FLATTEN,
  LANDING,
  PIVOT,
  easeInOutCubic,
  easeOutCubic,
  pivotProgress,
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

/** Autonomous Y rotation in beat 1: ±6°, ~9s period. */
const INTRO_AMPLITUDE = (6 * Math.PI) / 180;
const INTRO_PERIOD_MS = 9000;
/** How long the intro rotation takes to ease away once the user scrolls. */
const INTRO_RELEASE_MS = 700;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uGrain;
  uniform sampler2D uPrint;
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
      deskCol = uNight + uDeskWarm * deskLive * below * fade *
        (lit * 0.42 - occ * 0.38);
    }
  #endif

    // In the void there is nothing outside the card but the clear colour.
    // Discarding it keeps beat 1 at pass 01's fill cost.
    if (cardA <= 0.002 && deskLive <= 0.002) discard;

    // ── The card ─────────────────────────────────────────────────────────
    // Tiling grain: one sample, octaves baked into the tile.
    float grain = texture2D(uGrain, cuv * uGrainRepeat).r - 0.5;
    vec3 tint = uPaper * (1.0 + grain * 0.05);

    vec3 col = tint;
    float deboss = 0.0;
    if (uFlat < 1.0) {
      vec4 pr = texture2D(uPrint, cuv);
      vec3 ink = pr.rgb * (1.0 + grain * 0.10);
    #ifdef CHROMA
      {
        // Light splitting on the letterpress deboss: red and blue take their
        // ink coverage from a fraction of a texel either side of green, so
        // the split appears only where coverage is changing — an embossed
        // edge — and is invisible across flat stock. Not a glass panel, and
        // not a refraction of a background that does not exist.
        float aR = texture2D(uPrint, cuv + vec2(uChroma, 0.0)).a;
        float aL = texture2D(uPrint, cuv - vec2(uChroma, 0.0)).a;
        deboss = aR - aL;
        vec3 cover = mix(vec3(pr.a), vec3(aR, pr.a, aL), uGlass);
        col = mix(tint, ink, cover * (1.0 - uFlat));
      }
    #else
      col = mix(tint, ink, pr.a * (1.0 - uFlat));
    #endif
    }

    // A single warm key light, falling off to near-black. Art-directed, not
    // inverse-square: over a card this size 1/d² either crushes the paper to
    // a grey-brown midtone or leaves a visible spotlight terminator arc.
    float dist = distance(vWorld, uLightPos);
    float atten = 1.0 - smoothstep(uLightNear, uLightFar, dist);
    float relief = 1.0 + grain * 0.14 * atten;
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
      vec3 V = normalize(cameraPosition - vWorld);
      float fres = pow(1.0 - clamp(dot(uCardNormal, V), 0.0, 1.0), 3.0);
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
    vec3 flatField = uPaper * (1.0 + grain * 0.045);
    vec3 cardCol = mix(lit, flatField, uFlat);

    gl_FragColor = vec4(mix(deskCol, cardCol, cardA), 1.0);
  }
`;

export interface CardScene {
  /** Global stage progress, 0–1. */
  setProgress(g: number): void;
  setSize(width: number, height: number): void;
  /** Ends beat 1's autonomous rotation. Idempotent; it never restarts. */
  releaseIntro(): void;
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

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // i.e. no encode
  renderer.setClearColor(new THREE.Color(NIGHT), 1);

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

  const uniforms: Record<string, THREE.IUniform> = {
      uGrain: { value: grain },
      uPrint: { value: print },
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
  };

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
      // Every fragment that survives the discard is opaque, so no blending.
      transparent: false,
      defines,
      uniforms,
    });

  let rich = makeVariant({ DESK: "", EDGE_TERMS: "" });
  const deskOnly = makeVariant({ DESK: "" });
  const lean = makeVariant({});

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_W, PLANE_H), rich);
  scene.add(mesh);

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
  const WARM_VOID = new THREE.Color(1.0, 0.99, 0.988);
  const WARM_DESK = new THREE.Color(1.0, 0.99, 0.972);

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
    const base = dollyAt(easeInOutCubic(within(pivotProgress(g), DOLLY)));
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
    if (introAmp > 0) {
      if (introReleasedAt > 0) {
        introAmp = Math.max(0, 1 - (nowMs - introReleasedAt) / INTRO_RELEASE_MS);
      }
      const eased = introAmp * introAmp * (3 - 2 * introAmp);
      mesh.rotation.y =
        INTRO_AMPLITUDE *
        eased *
        Math.sin((nowMs / INTRO_PERIOD_MS) * Math.PI * 2);
    } else {
      mesh.rotation.y = 0;
    }
    u.uCardNormal.value.set(Math.sin(mesh.rotation.y), 0, Math.cos(mesh.rotation.y));

    const cam = cameraAt(g, cardPos.y);
    camera.position.set(cam.x, cam.y, cam.z);
    // Straight-on dolly: no rotation, so the framing maths above holds.
    camera.lookAt(cam.x, cam.y, cardPos.z);

    // Glass rises through the void and is gone by the time the card is paper
    // on a desk. That contrast is the point of the term existing at all.
    u.uGlass.value =
      glassMax *
      easeInOutCubic(within(g, { start: 0.01, end: DESCENT.start })) *
      (1 - easeInOutCubic(within(g, LANDING)));
    u.uRim.value = 1 - easeInOutCubic(within(g, LANDING));
    u.uLanded.value = cardPos.drop;
    u.uBounce.value = cardPos.drop;

    // The key drops lower and warms as the card comes down.
    u.uLightPos.value.lerpVectors(KEY_VOID, KEY_DESK, cardPos.drop);
    u.uWarm.value.lerpColors(WARM_VOID, WARM_DESK, cardPos.drop);

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
    u.uFlat.value = within(pivotProgress(g), FLATTEN);

    // Pick the cheapest shader that can still draw this frame. The desk is
    // only reachable when the frame extends past the card's silhouette, which
    // stops being true partway into the dolly — from there on the card is the
    // entire screen and the lean variant draws it.
    const halfW = halfFovTan * (cam.z - cardPos.z) * camera.aspect;
    const halfH = halfFovTan * (cam.z - cardPos.z);
    const deskInFrame =
      Math.abs(cam.x) + halfW > CARD_W / 2 - 0.02 ||
      Math.abs(cam.y - cardPos.y) + halfH > CARD_H / 2 - 0.02;

    const next =
      u.uRim.value > 0 || u.uGlass.value > 0
        ? rich
        : u.uLanded.value > 0 && deskInFrame
          ? deskOnly
          : lean;
    if (mesh.material !== next) mesh.material = next;
    if (DEBUG) {
      stageDebug.variant =
        next === rich ? "rich" : next === deskOnly ? "desk" : "lean";
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
    // While the intro rotation is alive the scene is time-driven, so every
    // frame is dirty. Once it is released we are back to scroll-driven only.
    if (introAmp > 0) dirty = true;
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
    },
    dispose() {
      cancelAnimationFrame(raf);
      running = false;
      mesh.geometry.dispose();
      rich.dispose();
      deskOnly.dispose();
      lean.dispose();
      grain.dispose();
      print.dispose();
      renderer.dispose();
    },
  };
}
