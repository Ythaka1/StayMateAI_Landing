/*
 * TEMPORARY — diagnostic instrumentation for the black-canvas report on
 * Android Chrome. Everything here is inert unless `?debug=1` is in the URL,
 * and the whole file should come out once the cause is found.
 *
 * A plain mutable singleton rather than React state: the overlay reads it from
 * its own rAF loop, so nothing here can cause a re-render per frame or change
 * the timing of the thing it is meant to be observing.
 */

export interface StageDebug {
  /** Did createCardScene get as far as a live context, and of what kind. */
  contextType: string;
  contextLost: boolean;
  /**
   * What this browser will hand out at all, probed on a throwaway canvas.
   * three has been WebGL2-only since r163, so a device that reports "WebGL
   * supported" on a WebGL1 test page and has WebGL2 blocklisted will fail to
   * create a renderer at all — and every three r163+ site on it goes black.
   */
  contextProbe: string;
  /** Canvas CSS box, as the browser lays it out. */
  clientW: number;
  clientH: number;
  /** Canvas drawing buffer, as three sized it. */
  bufferW: number;
  bufferH: number;
  /** Whether setSize has ever been called with a usable size. */
  sized: boolean;
  dpr: number;
  pixelRatio: number;
  reducedMotion: string;
  /** Which of the three tiers this page settled on, and why. */
  tier: string;
  /** Global stage progress, and whether a scroll event has ever moved it. */
  progress: number;
  scrollEvents: number;
  scrollY: number;
  spacerTop: number;
  spacerH: number;
  /** Which compiled shader variant drew the last frame. */
  variant: string;
  /** InstancedMesh count this frame — cards drawn, still one draw call. */
  cards: number;
  /** renderer.info.render.calls after the last render. */
  drawCalls: number;
  frames: number;
  looping: boolean;
  onScreen: boolean;
  /** Full compile/link log, verbatim, if a program failed. */
  shaderError: string;
  /** Anything thrown while setting the scene up. */
  fatal: string;
}

export const stageDebug: StageDebug = {
  contextType: "not created",
  contextLost: false,
  contextProbe: "unprobed",
  clientW: 0,
  clientH: 0,
  bufferW: 0,
  bufferH: 0,
  sized: false,
  dpr: 0,
  pixelRatio: 0,
  reducedMotion: "unknown",
  tier: "undecided",
  progress: 0,
  scrollEvents: 0,
  scrollY: 0,
  spacerTop: 0,
  spacerH: 0,
  variant: "none",
  cards: 0,
  drawCalls: -1,
  frames: 0,
  looping: false,
  onScreen: false,
  shaderError: "",
  fatal: "",
};

/**
 * Ask the browser directly which context types it will hand out, and what it
 * says the GPU is. Run on a throwaway canvas so it works even when the real
 * scene never got as far as constructing a renderer.
 */
export function probeContexts(): void {
  const results: string[] = [];
  let renderer = "";
  for (const type of ["webgl2", "webgl", "experimental-webgl"]) {
    let ok = false;
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext(type) as WebGLRenderingContext | null;
      ok = !!gl;
      if (gl && !renderer) {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        renderer = ext
          ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
          : String(gl.getParameter(gl.RENDERER));
      }
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      ok = false;
    }
    results.push(`${type}:${ok ? "yes" : "NO"}`);
  }
  stageDebug.contextProbe =
    results.join(" ") + (renderer ? `\n         gpu ${renderer}` : "");
}

let enabled: boolean | null = null;

/** True only when ?debug=1 is present. Evaluated once, on the client. */
export function debugEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === "undefined") return false;
  try {
    enabled = new URLSearchParams(window.location.search).get("debug") === "1";
  } catch {
    enabled = false;
  }
  return enabled;
}
