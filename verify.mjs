import { chromium } from "playwright";

const reduced = process.argv.includes("--reduced");
const tag = reduced ? "reduced" : "full";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: reduced ? "reduce" : "no-preference",
});
await page.addInitScript(() => {
  window.__gl = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    window.__gl.push(type);
    return orig.call(this, type, ...rest);
  };
});
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errs.push("CONSOLE " + m.text());
});

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1400);

const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 600) {
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await page.waitForTimeout(45);
}
await page.waitForTimeout(600);

const gl = await page.evaluate(() =>
  window.__gl.filter((t) => String(t).startsWith("webgl")).length
);
const videos = await page.evaluate(() => document.querySelectorAll("video").length);
const dpr = await page.evaluate(() => window.devicePixelRatio);

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.keyboard.press("End");
await page.waitForTimeout(2000);
const atBottom = await page.evaluate(
  () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
);

await page.evaluate(() => window.scrollTo(0, 0));
const stops = [];
for (let i = 0; i < 30; i++) {
  await page.keyboard.press("Tab");
  const d = await page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    return a.tagName + ":" + (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 30);
  });
  if (d && !stops.includes(d)) stops.push(d);
  if (stops.some((s) => s.includes("hello@"))) break;
}

console.log(`[${tag}] webgl=${gl} videos=${videos} End→bottom=${atBottom} docH=${h} dpr=${dpr}`);
console.log(`[${tag}] tab: ${stops.join(" | ")}`);
console.log(`[${tag}] errors: ${errs.length}`);
errs.slice(0, 8).forEach((e) => console.log("   !", e));
await browser.close();
