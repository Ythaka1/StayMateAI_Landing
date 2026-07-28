import { chromium } from "playwright";
import fs from "node:fs";
import zlib from "node:zlib";

/*
 * Measures the pivot handoff seam.
 *
 * At pivot progress 0.45 the shader's FLATTEN ramp has finished (uFlat = 1,
 * flat exact-hex paper field) and the DOM panel layer's cross-fade has not
 * started (FADE.start = 0.45), so the frame is the canvas alone showing what
 * it believes --paper to be. The seam is how far that is from what the DOM
 * layer will actually paint one moment later.
 *
 * Reported as the max per-channel delta out of 255. Zero is a seam nobody can
 * see under any circumstance.
 */

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const paper = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--paper").trim()
);
const hex = paper.replace("#", "");
const target = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));

const geo = await page.evaluate(() => {
  const seg = document.querySelector('[data-stage="pivot"]');
  const r = seg.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
});

const results = [];
// Sampled in the top-left corner, not the centre: the DOM panel layer's
// first panel sets its heading in dark ink through the middle of the frame,
// so a centre sample past FADE.start measures panel copy rather than a seam.
for (const pp of [0.42, 0.45, 0.48, 0.52]) {
  const y = Math.round(geo.top + (geo.height - 900) * pp);
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await page.waitForTimeout(2400);
  const shot = await page.screenshot({ clip: { x: 60, y: 60, width: 40, height: 40 } });
  // Decode the 40x40 PNG by hand: one IDAT, filter bytes per row.
  const px = decodeSolidPng(shot);
  const delta = Math.max(...px.map((v, i) => Math.abs(v - target[i])));
  results.push({ pp, rgb: px, delta });
}

console.log("--paper       :", paper, target.join(","));
for (const r of results) {
  console.log(
    `pivot ${r.pp.toFixed(2)}  canvas rgb ${r.rgb.join(",")}   max channel delta ${r.delta}/255`
  );
}
await browser.close();

/** Average colour of a small solid PNG. Enough for a flat field. */
function decodeSolidPng(buf) {
  let pos = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += len + 12;
  }
  if (bitDepth !== 8) throw new Error("unexpected bit depth " + bitDepth);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error("unexpected colour type " + colorType);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let ri = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[ri++];
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let v = raw[ri++];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 0xff;
    }
  }
  const sum = [0, 0, 0];
  const n = w * h;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 3; k++) sum[k] += out[i * channels + k];
  return sum.map((s) => Math.round(s / n));
}
