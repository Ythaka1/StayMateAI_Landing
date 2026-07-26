# StayMate — marketing site

A QR-triggered AI concierge for boutique hotels. Cinematic, scroll-driven, one
hero object: a cream letterpress table tent. There is exactly one object in the
whole site — no phone model, no hotel, no key.

```bash
npm install
npm run dev
```

## What is built

Pass one: the scaffold and **beat 3, the pivot** — the camera pushes into the
card until the surface fills the frame, the frame becomes a phone screen,
scrolling turns sideways through four panels of the guest journey, then turns
back. The other five beats, the nav, the footer and the contact page are not
built yet.

Beats 1 and 2 are stubbed as camera positions only (`CAMERA_BEATS` in
`components/pivot/scene.ts`).

## How the pivot works

`components/pivot/timeline.ts` owns every scroll range as plain constants. One
progress value (0–1 across a 500svh spacer) drives the camera, the cross-fade
and the horizontal travel, so the canvas and the DOM layer cannot drift apart.

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

## Swapping in real artwork

`makePrintTexture()` in `components/pivot/textures.ts` is marked as the swap
seam. Replace it with a loaded texture using the same full-card UV mapping and
a transparent background; no camera code changes. `QR_LEFT_X` in `scene.ts`
must match wherever the printed block's left edge lands, since the camera aims
for the blank band beside it.

## Accessibility

`prefers-reduced-motion` gets no pin and no canvas — the WebGL context is never
created and the four panels render as stacked static sections. This is handled
structurally in CSS (`motion-reduce:` variants over a single DOM tree) so there
is no hydration flash and no layout shift.

The panels are tabbable and the page never calls `preventDefault` on wheel or
touch, so End, Home and PageDown all behave normally.
