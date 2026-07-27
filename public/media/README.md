# Media

## Present

| File | Used by |
| --- | --- |
| `water.mp4` + `water-poster.jpg` | section 5, "Where's the pool?" |
| `steam.mp4` + `steam-poster.jpg` | section 5, "When's breakfast?" |
| `candle.mp4` + `candle-poster.jpg` | section 5, "Anywhere I can get a massage?" |

The three posters are frame 0 of their clip, scaled to 1280px wide. Regenerate
them with:

```
ffmpeg -y -i water.mp4 -vf "select=eq(n\,0),scale=1280:-2" -frames:v 1 -q:v 6 water-poster.jpg
```

Under `prefers-reduced-motion` the poster is the only thing rendered and the
`.mp4` is never requested — see `components/flat/AmbientVideo.tsx`.

## Missing — four stills still to be dropped in

These four are referenced by the build and are **not in the repository**. Every
place that uses one has a solid colour underneath it (`PhotoField`'s `tone`, and
the shader's procedural fallback for the card), so the site renders and reads
correctly without them — but four sections are currently a flat dark field where
a photograph should be.

| File | Used by | Composition the layout assumes |
| --- | --- | --- |
| `card.png` | section 9's background, **and the 3D card's stock** | Cream tent card on walnut, brass lamp upper-left |
| `desk.png` | section 2, the type slab | Hotel desk weighted left, right two-thirds empty — the type goes in the empty side |
| `plate-327.png` | section 8, plans | Brass room-number plate, macro |
| `blotter.png` | section 6, every language | Dark green leather blotter, macro |

`card.png` is the one that does more than sit behind type: `loadStockTexture`
in `components/stage/textures.ts` crops the interior of the front panel, divides
its lighting out, and uses the result as the 3D card's surface. That crop is
taken at `STOCK_CROP` — `x: 0.30, y: 0.30, w: 0.34, h: 0.38` in fractions of the
image — which needs to land wholly inside the card's front face. If the framing
of the final photograph differs, adjust those four numbers; nothing else needs
to change.
