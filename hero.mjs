import { chromium } from "playwright";
import fs from "node:fs";
const OUT = "/tmp/claude-0/-home-user-StayMateAI-Landing/7f8cf269-2c71-508a-a5ec-ae541a4c666c/scratchpad/shots";
fs.mkdirSync(OUT, { recursive: true });
const tag = process.argv[2] ?? "hero";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

// Let the cue draw and the plate decode.
await page.waitForTimeout(4200);
await page.screenshot({ path: `${OUT}/${tag}-rest.png` });

// Cursor parallax: move the pointer to a corner, let it settle, shoot.
await page.mouse.move(1300, 180);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/${tag}-ptr-tr.png` });
const tr = await page.evaluate(() => ({
  plate: document.querySelector('[data-hero="plate"] > div')?.style.transform,
  lamp: document.querySelector('[data-hero="plate"] > div:nth-child(2)')?.style.transform,
}));
await page.mouse.move(140, 780);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/${tag}-ptr-bl.png` });
const bl = await page.evaluate(() => ({
  plate: document.querySelector('[data-hero="plate"] > div')?.style.transform,
  lamp: document.querySelector('[data-hero="plate"] > div:nth-child(2)')?.style.transform,
}));
console.log("pointer top-right:", JSON.stringify(tr));
console.log("pointer bottom-left:", JSON.stringify(bl));

// The cue must go on first scroll and stay gone.
const before = await page.evaluate(
  () => document.querySelector('[data-copy="cue"]')?.dataset.gone
);
await page.mouse.wheel(0, 200);
await page.waitForTimeout(900);
const after = await page.evaluate(
  () => document.querySelector('[data-copy="cue"]')?.dataset.gone
);
console.log("cue data-gone before/after scroll:", before, "/", after);

// Nav vs hero wordmark: they must never both be visible.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(700);
const overlap = [];
for (let y = 0; y <= 900; y += 45) {
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await page.waitForTimeout(90);
  const o = await page.evaluate(() => ({
    y: Math.round(window.scrollY),
    hero: +(getComputedStyle(document.querySelector('[data-copy="hero"]')).opacity),
    nav: +(getComputedStyle(document.querySelector('[data-site="nav"]')).opacity),
    plate: +(getComputedStyle(document.querySelector('[data-hero="plate"]')).opacity),
  }));
  overlap.push(o);
}
const both = overlap.filter((o) => o.hero > 0.02 && o.nav > 0.02);
console.log("frames where hero AND nav are both visible:", both.length);
if (both.length) console.log("  ", JSON.stringify(both.slice(0, 5)));
console.log("plate opacity trace:", overlap.map((o) => `${o.y}:${o.plate.toFixed(2)}`).join(" "));

await page.evaluate(() => window.scrollTo(0, 380));
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/${tag}-descent.png` });

console.log("pageerrors:", errs.length);
errs.forEach((e) => console.log("  !", e));
await browser.close();
