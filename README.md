# StayMate — marketing site

A QR-triggered AI concierge for boutique hotels. Cinematic, scroll-driven, one
hero object: a cream letterpress table tent. There is exactly one object in the
whole site — no phone model, no hotel, no key.

```bash
npm install
npm run dev
```

## What is built

**Beat 1 — darkness.** The card alone in near-black, a warm key from the upper
left, a cool rim on the opposite edge, and a very slow Y rotation that stops on
the user's first input and never restarts. It is the only autonomous motion in
the site. There is no loading screen and no gate: scroll works from the first
frame.

**Beat 2 — the descent.** Scroll brings the card down and slightly toward the
camera until it lands. The desk is never modelled — it is a contact shadow that
tightens as the card arrives, the cool rim dying, the key dropping lower and
warmer, and a soft bounce from below. Copy fades in once the card is settled.

**Beat 3 — the pivot.** The camera pushes into the card until the surface fills
the frame, the frame becomes a phone screen, scrolling turns sideways through
four panels of the guest journey, then turns back.

**Beat 4 — the pull-back.** The panel layer fades down, the canvas resumes, and
the camera retraces the dolly to the landed card before continuing out. The one
card becomes many — the same card, instanced, receding into the dark, each
carrying a different room number.

**Beat 5 — the number.** The light leaves the cards. One figure counts up and
settles, alone on black, with one line naming it as illustrative. DOM, not
canvas; the loop is stopped through here.

**Beat 6 — the fan.** The light returns, the cards settle into a loose fan
across the lower frame, the camera comes to rest, and the pilot offer sits
above them.

The contact page is not built yet.

## One stage, one camera path

All six beats share a single sticky section, a single canvas and a single
camera path, so the camera never cuts from the top of the page to the bottom.
Beats 1 and 2 are offsets from `dollyAt(0)` — the pivot's own opening frame —
that decay to exactly zero at `PIVOT.start`. Beat 4 runs the same `dollyAt()`
backwards, by running a pivot-equivalent progress back down through the same
numbers, so the return needs no camera code of its own. There is no second
path to drift out of sync with the first, and no camera number written twice.

`components/stage/timeline.ts` owns every scroll range as plain constants. One
global progress value drives the camera, the copy layers, the cross-fade and
the horizontal travel.

The handoff is a colour-matched cut on a flat field, not a geometry morph. The
camera terminates on blank card stock beside the QR block; at maximum push-in
the frame is nothing but `#F3F1EC` and paper grain, and a full-bleed DOM layer
in the same cream cross-fades up over it. Once that layer is opaque the canvas
RAF loop **stops** rather than merely going transparent, and resumes before the
layer starts fading back out.

Three details the seam depends on:

- `--paper` in `app/globals.css` and `PAPER` in `scene.ts` must stay identical.
- three's colour management is off and the framebuffer is untagged, so the
  shader writes raw sRGB and the cream reaches the framebuffer unconverted.
- the terminal camera distance is derived from the width of the blank band, so
  the dolly ends exactly when the frame fills with stock on any aspect ratio.

## One object, many cards

Every card in the site is an instance of the same plane: one `InstancedMesh`,
one draw call, whatever the count. `mesh.count` is what changes between beats —
1 through beats 1 to 4's return, 18 from the corridor onward. Verified in the
debug overlay: `calls` stays at 1 throughout.

The only per-instance variation is the room number, taken from a single atlas
at a per-instance UV offset. Measured cost: one 256×256 texture and one extra
texture read, and only in the `rooms` variant — beat 3's pivot, where the card
fills the screen, never compiles it in.

## Shader variants

The fragment shader is compiled four ways and swapped per frame: `rich` (edge
terms and, at ≥768px, the deboss chroma, plus the desk) for beats 1 and 2,
`desk` for beat 3 while the card does not fill the frame, `lean` — pass
01's shader exactly — once it does, and `rooms` for the instanced beats.

This is not premature: a runtime `if` on a uniform is not free. Measured here,
an unused-but-present fresnel block cost a third of the frame time during the
pivot, because the rasteriser evaluates both sides and masks. Compiling the
dead code out is the only version of "off" that is actually off. All four are
compiled at startup, so swapping never triggers a compile or a hitch.

## Swapping in real artwork

`makePrintTexture()` in `components/stage/textures.ts` is marked as the swap
seam. Replace it with a loaded texture using the same full-card UV mapping and
a transparent background; no camera code changes. `QR_LEFT_X` in `scene.ts`
must match wherever the printed block's left edge lands, since the camera aims
for the blank band beside it.

The wordmark is set in the display face. Canvas cannot reach `next/font`
synchronously, so the texture draws immediately with whatever is resolved and
redraws in place once the font arrives — no gate on first paint.

## Accessibility

`prefers-reduced-motion` gets no pin and no canvas — the WebGL context is never
created and all six beats render as stacked static sections — including beat
5's figure, which is simply printed rather than counted. This is handled
structurally in CSS (`motion-reduce:` variants over a single DOM tree) so there
is no hydration flash and no layout shift.

The panels are tabbable and the page never calls `preventDefault` on wheel or
touch, so End, Home and PageDown all behave normally.
