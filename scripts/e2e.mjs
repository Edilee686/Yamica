// End-to-end check of the 14 acceptance criteria against a running dev or
// production server.  Usage: node scripts/e2e.mjs [baseUrl] [outDir]
// Requires Playwright with a Chromium build (set CHROMIUM_PATH if needed).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import zlib from "node:zlib";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "e2e-output";
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (n, name, ok, detail = "") => {
  results.push({ n, name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${String(n).padStart(2)}. ${name}${detail ? `  (${detail})` : ""}`);
};

// A small valid PNG to upload (solid colour), built without extra dependencies.
function makePng(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([r, (g + y) & 255, b], y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const readCol = (id) =>
  page.evaluate(
    (id) =>
      new Promise((res, rej) => {
        const r = indexedDB.open("yamica-studio");
        r.onerror = () => rej(r.error);
        r.onsuccess = () => {
          const g = r.result.transaction("kv").objectStore("kv").get(`col:${id}`);
          g.onsuccess = () => res(g.result);
          g.onerror = () => rej(g.error);
        };
      }),
    id,
  );
const settle = () => page.waitForTimeout(900); // autosave is debounced
const go = async (path) => (await page.goto(BASE + path, { waitUntil: "networkidle" }), page.waitForTimeout(400));

let id;
try {
  // 1 ── new collection
  await go("/studio");
  const skip = page.getByRole("button", { name: /skip/i });
  if (await skip.count()) await skip.first().click();
  await page.getByRole("button", { name: "Create a collection" }).first().click();
  await page.locator("#new-name").fill("E2E Atelier");
  await page.getByRole("button", { name: "Create collection" }).click();
  await page.waitForURL(/stage=concept/);
  id = new URL(page.url()).searchParams.get("id");
  await settle();
  let c = await readCol(id);
  check(1, "Start a new collection and name it", c?.name === "E2E Atelier", `id ${id}`);

  // 2 ── library images + upload on the moodboard
  await go(`/studio/collection?id=${id}&stage=moodboard`);
  const libAdds = page.getByRole("button", { name: /to the moodboard$/ });
  await libAdds.nth(0).click();
  await libAdds.nth(1).click();
  const png = join(OUT, "upload-sample.png");
  writeFileSync(png, makePng(320, 240, [168, 147, 196]));
  await page.getByRole("radio", { name: "Saved" }).click();
  await page.locator('input[type="file"]').first().setInputFiles(png);
  await page.waitForTimeout(1500);
  await settle();
  c = await readCol(id);
  let imgs = c.moodboards[0].items.filter((i) => i.type === "image");
  check(2, "Add library images and an uploaded image to a moodboard", imgs.filter((i) => i.image.kind === "library").length >= 2 && imgs.some((i) => i.image.kind === "upload"), `${imgs.length} images`);

  // 3 ── move + resize, then saved
  const target = c.moodboards[0].items.filter((i) => i.type === "image").at(-1); // topmost image
  const el = page.locator(`[data-item="${target.id}"]`).first();
  const box = await el.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const handle = page.locator('rect[style*="nwse-resize"]').last();
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 50, hb.y + hb.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await settle();
  c = await readCol(id);
  const moved = c.moodboards[0].items.find((i) => i.id === target.id);
  check(3, "Reposition, resize and save moodboard objects", Math.abs(moved.x - target.x) > 5 && moved.w > target.w + 5, `x ${target.x.toFixed(0)}→${moved.x.toFixed(0)}, w ${target.w.toFixed(0)}→${moved.w.toFixed(0)}`);

  // 13a ── moodboard PNG
  const [mbDl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export PNG/ }).click()]);
  const mbPath = join(OUT, "moodboard.png");
  await mbDl.saveAs(mbPath);
  const mbBuf = readFileSync(mbPath);
  const mbOk = mbBuf.subarray(1, 4).toString() === "PNG" && mbBuf.readUInt32BE(16) > 1000 && mbBuf.length > 50_000;

  // 4 ── palette
  await go(`/studio/collection?id=${id}&stage=colors`);
  const before = (await readCol(id)).palettes[0].swatches.length;
  await page.getByLabel("New colour HEX").last().fill("#7A9E7E");
  await page.getByRole("button", { name: "Add", exact: true }).last().click();
  await page.waitForTimeout(300);
  await page.getByLabel("Colour name").last().fill("Moss");
  await page.getByLabel("New colour HEX").last().fill("#C98F6E");
  await page.getByRole("button", { name: "Add", exact: true }).last().click();
  await page.waitForTimeout(300);
  await page.getByLabel("Colour name").last().fill("Clay");
  await settle();
  c = await readCol(id);
  const moss = c.palettes[0].swatches.find((s) => s.name === "Moss");
  const clay = c.palettes[0].swatches.find((s) => s.name === "Clay");
  check(4, "Create and edit a palette", c.palettes[0].swatches.length === before + 2 && moss?.hex.toUpperCase() === "#7A9E7E" && clay?.hex.toUpperCase() === "#C98F6E", `${before}→${c.palettes[0].swatches.length} colours`);

  // 5 ── template
  await go(`/studio/collection?id=${id}&stage=garments`);
  await page.getByRole("button", { name: /New design|Choose a template/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /Relaxed shirt/ }).click();
  await page.waitForURL(/design=/);
  await page.waitForTimeout(500);
  const designId = new URL(page.url()).searchParams.get("design");
  await settle();
  c = await readCol(id);
  check(5, "Choose a garment template", c.designs.some((d) => d.id === designId && d.templateId === "shirt"));

  // 6 ── compatible component
  await page.getByRole("button", { name: "Band collar" }).click();
  await settle();
  c = await readCol(id);
  check(6, "Change a compatible garment component", c.designs.find((d) => d.id === designId).options.collar === "band", `collar=${c.designs.find((d) => d.id === designId).options.collar}`);

  // 7 ── select a panel
  // click the body away from the placket and pocket
  const bb = await page.locator('[data-panel="body"]').first().boundingBox();
  await page.mouse.click(bb.x + bb.width * 0.3, bb.y + bb.height * 0.7);
  await page.waitForTimeout(300);
  const selectedLabel = await page.getByText("Selected panel").locator("xpath=following-sibling::p[1]").textContent().catch(() => "");
  check(7, "Select an individual garment panel", /body/i.test(selectedLabel ?? ""), selectedLabel ?? "");

  // 8 ── palette colour on that panel
  await page.getByRole("button", { name: "Apply Clay" }).first().click();
  await settle();
  c = await readCol(id);
  let body = c.designs.find((d) => d.id === designId).panels.body;
  const placket = c.designs.find((d) => d.id === designId).panels.placket;
  check(8, "Apply a palette colour to that panel", body?.fill?.type === "solid" && body.fill.color.swatchId === clay.id && placket?.fill?.color?.swatchId !== clay.id, body?.fill?.color?.hex);

  // 9 ── print + scale/rotation/offset
  await page.getByRole("radio", { name: "Print", exact: true }).click();
  await page.getByRole("button", { name: "Use Botanical line" }).first().click();
  await page.getByRole("slider", { name: "Scale" }).fill("1.5");
  await page.getByRole("slider", { name: "Rotation" }).fill("30");
  await page.getByRole("slider", { name: "Horizontal offset" }).fill("20");
  await page.getByRole("slider", { name: "Vertical offset" }).fill("-10");
  await settle();
  c = await readCol(id);
  body = c.designs.find((d) => d.id === designId).panels.body;
  const f = body.fill;
  check(9, "Apply a print and adjust scale, rotation and offset", f.type === "print" && f.printId === "botanical-line" && f.scale === 1.5 && f.rotation === 30 && f.offsetX === 20 && f.offsetY === -10, JSON.stringify({ s: f.scale, r: f.rotation, x: f.offsetX, y: f.offsetY }));

  // 13b ── garment PNG
  await page.getByRole("button", { name: /^Export/ }).click();
  const [gDl] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: /PNG/ }).click()]);
  const gPath = join(OUT, "garment.png");
  await gDl.saveAs(gPath);
  const gBuf = readFileSync(gPath);
  const gOk = gBuf.subarray(1, 4).toString() === "PNG" && gBuf.readUInt32BE(16) === 1600;

  // 10 ── variation
  const countBefore = c.designs.length;
  await page.getByRole("button", { name: /Save variation/ }).click();
  await settle();
  c = await readCol(id);
  const variation = c.designs.find((d) => d.variationOf === designId);
  check(10, "Duplicate the garment into a distinct variation", c.designs.length === countBefore + 1 && !!variation && variation.id !== designId, variation?.name);

  // 11 ── board + reorder
  await go(`/studio/collection?id=${id}&stage=collection`);
  c = await readCol(id);
  const order0 = c.boardOrder.filter((x) => c.designs.some((d) => d.id === x && d.onBoard));
  await page.getByRole("button", { name: "Move later" }).first().click();
  await settle();
  c = await readCol(id);
  const order1 = c.boardOrder.filter((x) => c.designs.some((d) => d.id === x && d.onBoard));
  check(11, "Add designs to the collection board and reorder them", order0.length >= 2 && order1[0] === order0[1] && order1[1] === order0[0], `${order0.length} on board`);

  // 12 ── persistence across reload
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const titleShown = await page.evaluate(() => [...document.querySelectorAll("input, h1, h2, span")].filter((e) => (e.value ?? e.textContent) === "E2E Atelier").length);
  const linesShown = await page.locator("li.relative.rounded-xl").count();
  check(12, "Refresh and recover the saved project", titleShown > 0 && linesShown === order1.length, `${linesShown} line-up cards after reload`);

  // 13 ── image export
  check(13, "Export a usable moodboard or garment image", mbOk && gOk, `moodboard ${mbBuf.readUInt32BE(16)}×${mbBuf.readUInt32BE(20)}, garment ${gBuf.readUInt32BE(16)}×${gBuf.readUInt32BE(20)}`);

  // 14 ── presentation PDF
  await go(`/studio/collection?id=${id}&stage=presentation`);
  await page.locator("#pr-designer").fill("E2E Designer");
  await settle();
  const [pdfDl] = await Promise.all([page.waitForEvent("download", { timeout: 180_000 }), page.getByRole("button", { name: /Export PDF/ }).click()]);
  const pdfPath = join(OUT, "presentation.pdf");
  await pdfDl.saveAs(pdfPath);
  const pdf = readFileSync(pdfPath);
  const pdfPages = (pdf.toString("latin1").match(/\/Type \/Page[^s]/g) ?? []).length;
  const expected = await page.locator("li.scroll-mt-32").count();
  await settle();
  c = await readCol(id);
  check(14, "Export a presentation PDF with actual project content", pdf.subarray(0, 4).toString() === "%PDF" && pdfPages === expected && statSync(pdfPath).size > 200_000 && !!c.presentation.lastExportedAt, `${pdfPages} pages, ${(statSync(pdfPath).size / 1024).toFixed(0)} KB`);
} catch (e) {
  console.error("Run stopped:", e.message);
  await page.screenshot({ path: join(OUT, "failure.png") }).catch(() => {});
}

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/14 passed${errors.length ? `\nPage errors:\n${errors.join("\n")}` : ""}`);
writeFileSync(join(OUT, "results.json"), JSON.stringify({ results, errors }, null, 2));
process.exit(passed === 14 ? 0 : 1);
