import { chromium } from "playwright";
import fs from "node:fs";
const OUT = "/tmp/claude-0/-home-user-StayMateAI-Landing/7f8cf269-2c71-508a-a5ec-ae541a4c666c/scratchpad/shots";
fs.mkdirSync(OUT, { recursive: true });
const tag = process.argv[2] ?? "name";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
const top = await page.locator('[aria-labelledby="name-heading"]')
  .evaluate((n) => n.getBoundingClientRect().top + window.scrollY);
await page.evaluate((t) => window.scrollTo(0, t), Math.round(top));
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/${tag}-default.png` });

// Keyboard only: tab to the input from the top of the section, then type.
const input = page.locator('input[type="text"]');
await input.focus();
await input.type("Hotel Marbella", { delay: 45 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/${tag}-typed.png` });
const cardText = await page.locator('[aria-labelledby="name-heading"] .font-display').nth(2).textContent();
console.log("card shows:", JSON.stringify(cardText));

// Long name must shrink, not overflow.
await input.fill("");
await input.type("The Grand Pavilion and Spa Resort", { delay: 8 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/${tag}-long.png` });
const info = await page.evaluate(() => {
  const card = document.querySelector('[aria-labelledby="name-heading"] [aria-hidden="true"] > div');
  const name = card?.querySelector("p");
  const r = card.getBoundingClientRect(), nr = name.getBoundingClientRect();
  return {
    value: document.querySelector('input[type="text"]').value,
    fontSize: getComputedStyle(name).fontSize,
    overflow: Math.round(nr.width - r.width),
    cardH: Math.round(r.height),
  };
});
console.log("long name:", JSON.stringify(info));

// Injection-ish input must be stripped, and nothing may be stored.
await input.fill("");
await input.type('<script>x</script>\tThe  Ritz', { delay: 5 });
await page.waitForTimeout(300);
console.log("sanitised to:", JSON.stringify(await input.inputValue()));
const stored = await page.evaluate(() => ({
  ls: Object.keys(localStorage).length,
  ss: Object.keys(sessionStorage).length,
  cookie: document.cookie,
}));
console.log("storage after typing:", JSON.stringify(stored));
console.log("pageerrors:", errs.length);
errs.forEach((e) => console.log("  !", e));
await browser.close();
