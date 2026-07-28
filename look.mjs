import { chromium } from "playwright";
import fs from "node:fs";
const OUT = "/tmp/claude-0/-home-user-StayMateAI-Landing/7f8cf269-2c71-508a-a5ec-ae541a4c666c/scratchpad/shots";
fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const reduced = args.includes("--reduced");
const tag = args.find((a) => !a.startsWith("--")) ?? "look";

const TARGETS = {
  slab: '[aria-labelledby="slab-heading"]',
  ask: '[aria-labelledby="ask-heading"]',
  room: '[data-flat="room"]',
  lang: '[aria-label="The same question in eight languages"]',
  staff: '[aria-labelledby="staff-heading"]',
  plans: '[aria-labelledby="plans-heading"]',
  pilot: '[aria-labelledby="pilot-heading"]',
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: reduced ? "reduce" : "no-preference",
});
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

// Absolute scroll positions requested as --y=1234,5678
const yArg = args.find((a) => a.startsWith("--y="));
if (yArg) {
  for (const y of yArg.slice(4).split(",").map(Number)) {
    await page.evaluate((t) => window.scrollTo(0, t), y);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${tag}-y${y}.png` });
    console.log("shot y", y);
  }
} else {
  const names = args.filter((a) => !a.startsWith("--") && a !== tag);
  const list = names.length ? names : Object.keys(TARGETS);
  for (const name of list) {
    const sel = TARGETS[name];
    if (!sel) { console.log("unknown", name); continue; }
    const el = page.locator(sel).first();
    if (!(await el.count())) { console.log("MISSING", name); continue; }
    const top = await el.evaluate((n) => n.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((t) => window.scrollTo(0, t), Math.round(top));
    await page.waitForTimeout(reduced ? 400 : 2200);
    await page.screenshot({ path: `${OUT}/${tag}-${name}.png` });
    console.log(name, "top", Math.round(top));
  }
}
await browser.close();
