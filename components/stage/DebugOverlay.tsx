"use client";

import { useEffect, useRef, useState } from "react";
import { stageDebug, debugEnabled, probeContexts } from "./debug";

/*
 * TEMPORARY — diagnostic overlay for the black-canvas report on Android
 * Chrome. Renders only with `?debug=1`. Remove with debug.ts once the cause
 * is found.
 *
 * Writes textContent from its own rAF loop rather than through React state,
 * so observing the stage cannot perturb the stage.
 */
export default function DebugOverlay() {
  const [on, setOn] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  // Mount-time only, so a statically prerendered page cannot mismatch.
  useEffect(() => {
    const yes = debugEnabled();
    setOn(yes);
    // Probed here, not in the scene: the scene may never get built.
    if (yes) probeContexts();
  }, []);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const d = stageDebug;
      const el = preRef.current;
      if (!el) return;
      el.textContent = [
        `ctx      ${d.contextType}${d.contextLost ? "  *** LOST ***" : ""}`,
        `probe    ${d.contextProbe}`,
        `canvas   css ${d.clientW}x${d.clientH}  buf ${d.bufferW}x${d.bufferH}`,
        `sized    ${d.sized}   pixelRatio ${d.pixelRatio}`,
        `dpr      ${d.dpr}`,
        `reduced  ${d.reducedMotion}`,
        `tier     ${d.tier}`,
        `progress ${d.progress.toFixed(3)}`,
        `scroll   y=${d.scrollY}  events=${d.scrollEvents}`,
        `spacer   top=${d.spacerTop} h=${d.spacerH}`,
        `variant  ${d.variant}   cards ${d.cards}`,
        `calls    ${d.drawCalls}   frames ${d.frames}`,
        `loop     ${d.looping ? "running" : "stopped"}  onScreen ${d.onScreen}`,
        d.fatal ? `\nFATAL\n${d.fatal}` : "",
        d.shaderError ? `\nSHADER\n${d.shaderError}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  if (!on) return null;

  return (
    <pre
      ref={preRef}
      // Deliberately loud and unmissable: this is a diagnostic, not a UI.
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 2147483647,
        margin: 0,
        padding: "6px 8px",
        maxWidth: "100vw",
        maxHeight: "100svh",
        overflow: "auto",
        background: "#000",
        color: "#0f0",
        border: "1px solid #0f0",
        font: "11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        pointerEvents: "none",
      }}
    />
  );
}
