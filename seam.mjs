import { chromium } from "playwright";
import zlib from "node:zlib";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const paper = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--paper").trim());
const hex = paper.replace("#", "");
const target = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
const geo = await page.evaluate(() => {
  const r = document.querySelector('[data-stage="pivot"]').getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
});
console.log("--paper", paper, target.join(","));
for (const pp of [0.42, 0.45, 0.48, 0.52]) {
  const y = Math.round(geo.top + (geo.height - 900) * pp);
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await page.waitForTimeout(2400);
  const shot = await page.screenshot({ clip: { x: 60, y: 60, width: 40, height: 40 } });
  const px = solid(shot);
  const d = Math.max(...px.map((v, i) => Math.abs(v - target[i])));
  console.log(`pivot ${pp.toFixed(2)}  canvas ${px.join(",")}   max channel delta ${d}/255`);
}
await browser.close();
function solid(buf) {
  let pos = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8);
    const d = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    else if (type === "IDAT") idat.push(d);
    else if (type === "IEND") break;
    pos += len + 12;
  }
  const ch = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(h * stride);
  let ri = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[ri++];
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[y * stride + x - ch] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= ch && y > 0 ? out[(y - 1) * stride + x - ch] : 0;
      let v = raw[ri++];
      if (f === 1) v += a; else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 0xff;
    }
  }
  const sum = [0, 0, 0], n = w * h;
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) sum[k] += out[i * ch + k];
  return sum.map((s) => Math.round(s / n));
}
