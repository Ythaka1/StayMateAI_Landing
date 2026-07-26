import * as THREE from "three";
import { makeGrainTexture, makePrintTexture } from "./textures";
import { DOLLY, FLATTEN, easeInOutCubic, within } from "./timeline";

/*
 * One object, one plane, one draw call. The card is a PlaneGeometry with a
 * rounded-rect SDF alpha in the fragment shader; grain, the printed layer and
 * the warm key light are all fragment work. No post-processing.
 *
 * COLOUR: three's colour management is switched off and the framebuffer is
 * left untagged, so every value in the shader is raw sRGB and #F3F1EC leaves
 * the fragment shader as exactly #F3F1EC. This matters more than physical
 * correctness — the whole handoff dies if the canvas cream and the DOM cream
 * differ by one value. The warm light therefore multiplies in sRGB space,
 * which is "wrong" and looks right for a stylised flat card.
 */

THREE.ColorManagement.enabled = false;

export const CARD_W = 2.4;
export const CARD_H = 3.2;

/** Matches --night in globals.css. The darkness the card sits in. */
export const NIGHT = "#0b0c0e";
/** Matches --paper. The whole trick depends on this being exact. */
export const PAPER = "#f3f1ec";

/**
 * Stub camera positions for beats 1 and 2 (pass 02). The pivot's dolly
 * starts at pivotStart; the earlier beats will hand the camera to it.
 *
 * pivotEnd sits in the blank band of card stock to the LEFT of the QR block
 * (the QR spans x -0.45..0.45; the card edge is at -1.2), so at maximum
 * push-in the frame contains nothing but paper and grain. z is tightened
 * further on very wide viewports — see setSize.
 */
export const CAMERA_BEATS = {
  beat1Darkness: { x: 0.9, y: -1.4, z: 9.5 },
  beat2Descent: { x: 0.35, y: 0.8, z: 7.5 },
  pivotStart: { x: 0, y: 0.15, z: 6 },
  pivotEnd: { x: -0.81, y: 0.95, z: 0.35 },
} as const;

/** Left edge of the printed QR block in card units. Set by textures.ts. */
const QR_LEFT_X = -0.375;

/**
 * Strength of the glass/refraction term on the card surface. Zero for this
 * pass — the shader carries the uniform but no refraction. Pass 02 raises it,
 * and setSize keeps it at zero below 768px regardless.
 */
const GLASS_STRENGTH = 0;

/**
 * Half-width of the frame at maximum push-in, in card units. The blank band
 * runs from the card edge (-1.2) to QR_LEFT_X, so from pivotEnd.x = -0.81
 * there is 0.39 of room one way and 0.435 the other; 0.30 leaves ~0.1 of
 * margin on both sides.
 *
 * The terminal z is derived from this rather than fixed, so the dolly ends
 * exactly when the frame first fills with blank stock — on a narrow phone
 * that is a much shallower push than on a wide desktop, and hard-coding one
 * z either leaves 100vh of dead blank scroll on mobile or fails to clear the
 * print on ultrawide.
 */
const BLANK_BAND_HALF = 0.3;

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
  uniform float uFlat;    // 0 = lit card in darkness, 1 = flat paper field
  uniform float uGlass;   // pass 02: refraction term. 0 this pass, and
                          // hard-forced to 0 below 768px.
  uniform float uEdge;    // silhouette AA width in card units, from JS
  uniform vec3 uPaper;
  uniform vec3 uWarm;
  uniform vec3 uShadow;
  uniform vec3 uLightPos;
  uniform float uLightNear;   // distance at which the paper is full cream
  uniform float uLightFar;    // distance at which it has fallen to shadow
  uniform vec2 uCardSize;
  varying vec2 vUv;
  varying vec3 vWorld;

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    // Rounded-rect card silhouette. Edge width comes from JS rather than
    // fwidth so no derivatives extension is needed.
    vec2 local = (vUv - 0.5) * uCardSize;
    float d = sdRoundedBox(local, uCardSize * 0.5, 0.08);
    float alpha = 1.0 - smoothstep(-uEdge, uEdge, d);
    if (alpha <= 0.002) discard;

    // Tiling grain — one sample, octaves baked into the tile. The high repeat
    // is what keeps the paper tooth crisp at maximum push-in; a single large
    // baked texture would go soft here.
    float grain = texture2D(uGrain, vUv * uGrainRepeat).r - 0.5;

    vec3 tint = uPaper * (1.0 + grain * 0.05);

    // Printed ink layer, faded out by uFlat so no viewport aspect can catch a
    // QR edge in frame at the handoff. Once it has fully faded the sample is
    // skipped altogether — the branch is on a uniform, so every fragment in
    // the draw takes the same path and it costs nothing to diverge.
    vec3 col = tint;
    if (uFlat < 1.0) {
      vec4 print = texture2D(uPrint, vUv);
      col = mix(tint, print.rgb * (1.0 + grain * 0.10), print.a * (1.0 - uFlat));
    }

    // A single warm key light off camera-left, falling off to near-black.
    // This is an art-directed falloff, not inverse-square: over a card this
    // size 1/d² either crushes everything to a grey-brown midtone or, once
    // clamped hard enough to keep the paper cream, leaves a visible spotlight
    // terminator arc across the stock. A smoothstep gives a cream plateau, a
    // soft shoulder and a genuinely dark far corner, which is the look.
    float dist = distance(vWorld, uLightPos);
    float atten = 1.0 - smoothstep(uLightNear, uLightFar, dist);
    // Letterpress micro-relief: grain tilts the surface into the light.
    float relief = 1.0 + grain * 0.14 * atten;
    // Ramp toward a warm near-black rather than multiplying down to neutral
    // black — a straight multiply desaturates the shadow end and the card
    // stops reading as cream paper and starts reading as brushed metal.
    vec3 lit = mix(uShadow, col * uWarm, atten) * relief;

    // Handoff ramp: resolve to an exact flat paper field plus paper grain.
    // The grain survives here on purpose — the seam is meant to be flat cream
    // *and* tooth; the cross-fade to the DOM layer is what takes it to nothing.
    vec3 flatField = uPaper * (1.0 + grain * 0.045);
    gl_FragColor = vec4(mix(lit, flatField, uFlat), alpha);
  }
`;

export interface CardScene {
  setProgress(p: number): void;
  setSize(width: number, height: number): void;
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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 30);
  const halfFovTan = Math.tan((camera.fov * Math.PI) / 360);

  const grain = makeGrainTexture();
  grain.anisotropy = isMobile
    ? 1
    : Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const print = makePrintTexture();

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    uniforms: {
      uGrain: { value: grain },
      uPrint: { value: print },
      // Set from the viewport in setSize — see the note there.
      uGrainRepeat: { value: 16.0 },
      uFlat: { value: 0 },
      uGlass: { value: 0 }, // set from viewport width in setSize
      uEdge: { value: 0.004 },
      uPaper: { value: new THREE.Color(PAPER) },
      // Restrained warmth: the card is cream stock, not gold leaf, and any
      // hue the key light adds is hue the FLATTEN ramp has to remove again
      // before the handoff.
      uWarm: { value: new THREE.Color(1.0, 0.99, 0.972) },
      uShadow: { value: new THREE.Color(0.05, 0.042, 0.033) },
      uLightPos: { value: new THREE.Vector3(-2.1, 1.5, 1.5) },
      // Chosen so the card's upper-left and the whole terminal region sit at
      // full cream (the handoff has almost no brightness step left to make),
      // the centre lands around 0.85, and the far corner goes to near-black.
      uLightNear: { value: 2.3 },
      uLightFar: { value: 5.2 },
      uCardSize: { value: new THREE.Vector2(CARD_W, CARD_H) },
    },
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), material);
  scene.add(mesh);

  // Both ends of the dolly adapt to the viewport: the start pulls back far
  // enough to frame the whole card, the end pushes in far enough that the
  // frame stays inside the blank band beside the QR.
  let startZ: number = CAMERA_BEATS.pivotStart.z;
  let endZ: number = CAMERA_BEATS.pivotEnd.z;
  let viewportH = 1;

  let progress = 0;
  let dirty = true;
  let running = false;
  let raf = 0;

  function applyProgress() {
    const t = easeInOutCubic(within(progress, DOLLY));
    const s = CAMERA_BEATS.pivotStart;
    const e = CAMERA_BEATS.pivotEnd;
    const z = startZ + (endZ - startZ) * t;

    // The camera always aims for the blank band, and geometry decides how
    // much of that it is allowed to have. While the frame is still wider than
    // the card the clamp pins it to dead centre (the establishing shot); as z
    // shrinks it is progressively freed until it reaches pivotEnd exactly at
    // t = 1. Shaping the drift this way rather than on a hand-tuned curve is
    // what keeps a card edge — and the darkness beyond it — out of every
    // mid-dolly frame at every aspect ratio, which otherwise reads as the
    // card simply ending.
    const halfW = halfFovTan * z * camera.aspect;
    const halfH = halfFovTan * z;
    const maxX = Math.max(0, CARD_W / 2 - halfW - 0.03);
    const maxY = Math.max(0, CARD_H / 2 - halfH - 0.03);

    // Prefer to sit clear of the printed block, but never at the cost of
    // pulling in a card edge. Early on this is unsatisfiable and the QR stays
    // in shot, which is the point — it guides the eye into the centre.
    const clearOfPrint = QR_LEFT_X - halfW - 0.04;
    let x = Math.min(s.x + (e.x - s.x) * t, clearOfPrint);
    let y = s.y + (e.y - s.y) * t;
    x = Math.min(maxX, Math.max(-maxX, x));
    y = Math.min(maxY, Math.max(-maxY, y));

    camera.position.set(x, y, z);
    // Straight-on dolly: no rotation, so the framing maths above holds.
    camera.lookAt(camera.position.x, camera.position.y, 0);

    // One device pixel in card units at the card plane.
    const pxPerUnit = viewportH / (2 * halfFovTan * Math.max(z, 0.05));
    material.uniforms.uEdge.value = 1.4 / Math.max(pxPerUnit, 1);
    material.uniforms.uFlat.value = within(progress, FLATTEN);
  }

  function render() {
    applyProgress();
    renderer.render(scene, camera);
    dirty = false;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (dirty) render();
  }

  return {
    setProgress(p: number) {
      if (p === progress) return;
      progress = p;
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
      startZ = Math.max(CAMERA_BEATS.pivotStart.z, fitW, fitH);

      // End exactly where the frame first fills with blank stock.
      endZ = Math.max(
        0.12,
        BLANK_BAND_HALF / (halfFovTan * camera.aspect)
      );

      // Grain frequency follows the viewport, because the terminal frame
      // always shows the same slice of card (2 * BLANK_BAND_HALF wide) — so
      // screen pixels per card unit scale with viewport width. This is what
      // keeps the paper tooth reading as tooth at maximum push-in instead of
      // dissolving into mush or blowing up into visible tiles.
      material.uniforms.uGrainRepeat.value = Math.min(
        90,
        Math.max(10, width / 32)
      );

      // The refraction/glass term is never applied below 768px — flat lit
      // card only on phones. Evaluated here rather than at construction so it
      // also holds when a tablet is rotated across the breakpoint.
      material.uniforms.uGlass.value = width < 768 ? 0 : GLASS_STRENGTH;

      dirty = true;
      if (!running) render(); // keep the pinned frame correct while asleep
    },
    start() {
      if (running) return;
      running = true;
      render(); // an immediate frame, so resume lands before the DOM fade-out
      raf = requestAnimationFrame(loop);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      cancelAnimationFrame(raf);
      running = false;
      mesh.geometry.dispose();
      material.dispose();
      grain.dispose();
      print.dispose();
      renderer.dispose();
    },
  };
}
