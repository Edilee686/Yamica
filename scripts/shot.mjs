// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { chromium } from "playwright";
const [url, out, w = "1600", h = "1000", full = "1"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: full === "1" });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
