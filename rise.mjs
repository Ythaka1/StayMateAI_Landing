import { chromium } from "playwright";
import fs from "node:fs";
const OUT = "/tmp/claude-0/-home-user-StayMateAI-Landing/7f8cf269-2c71-508a-a5ec-ae541a4c666c/scratchpad/shots";
fs.mkdirSync(OUT, { recursive: true });
const tag = process.argv[2] ?? "rise";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
for (const y of [0, 500, 900, 1400, 1900, 2500, 3100, 3800]) {
  await page.evaluate((t) => window.scrollTo(0, t), y);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/${tag}-${y}.png` });
}
console.log("pageerrors:", errs.length);
errs.forEach((e) => console.log("  !", e));
await browser.close();
