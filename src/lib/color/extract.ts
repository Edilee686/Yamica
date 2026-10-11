// Palette extraction from real image pixels (canvas + k-means in Lab space).
import { RGB, deltaE, nameColor, rgbToHex, rgbToLab } from "./color";

export interface ExtractedColor {
  hex: string;
  name: string;
  share: number; // 0..1 of sampled pixels
}

export class ExtractionError extends Error {}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  try {
    await img.decode();
  } catch {
    throw new ExtractionError("This image couldn't be loaded, so its colours can't be read. Try another image or add colours by hand.");
  }
  return img;
}

export async function extractPalette(src: string, count = 6): Promise<ExtractedColor[]> {
  const img = await loadImage(src);
  const size = 72;
  const ratio = img.naturalWidth / img.naturalHeight || 1;
  const w = ratio >= 1 ? size : Math.round(size * ratio);
  const h = ratio >= 1 ? Math.round(size / ratio) : size;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ExtractionError("Your browser couldn't read image pixels here. Add colours by hand instead.");
  ctx.drawImage(img, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    throw new ExtractionError("This image comes from another site that doesn't allow reading its pixels. Upload a copy or pick colours by hand.");
  }
  const px: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) px.push([data[i], data[i + 1], data[i + 2]]);
  if (px.length < 10) throw new ExtractionError("This image is mostly transparent, so there aren't enough colours to read.");
  const labs = px.map(rgbToLab);

  // k-means++ seeding (deterministic: farthest point from previous centres)
  const k = Math.min(count + 2, 10);
  const centres: [number, number, number][] = [labs[Math.floor(labs.length / 2)]];
  while (centres.length < k) {
    let best = 0, bestD = -1;
    for (let i = 0; i < labs.length; i += 3) {
      const d = Math.min(...centres.map((c) => (c[0] - labs[i][0]) ** 2 + (c[1] - labs[i][1]) ** 2 + (c[2] - labs[i][2]) ** 2));
      if (d > bestD) (bestD = d), (best = i);
    }
    centres.push([...labs[best]] as [number, number, number]);
  }
  const assign = new Array(labs.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    for (let i = 0; i < labs.length; i++) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (centres[c][0] - labs[i][0]) ** 2 + (centres[c][1] - labs[i][1]) ** 2 + (centres[c][2] - labs[i][2]) ** 2;
        if (d < bd) (bd = d), (bi = c);
      }
      assign[i] = bi;
    }
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < labs.length; i++) {
      const s = sums[assign[i]];
      s[0] += labs[i][0]; s[1] += labs[i][1]; s[2] += labs[i][2]; s[3]++;
    }
    sums.forEach((s, c) => s[3] && (centres[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]));
  }
  // average RGB per cluster for exact display colours
  const rgbSums = centres.map(() => [0, 0, 0, 0]);
  for (let i = 0; i < px.length; i++) {
    const s = rgbSums[assign[i]];
    s[0] += px[i][0]; s[1] += px[i][1]; s[2] += px[i][2]; s[3]++;
  }
  let colors = rgbSums
    .filter((s) => s[3] > 0)
    .map((s) => ({ hex: rgbToHex([s[0] / s[3], s[1] / s[3], s[2] / s[3]]), share: s[3] / px.length }))
    .sort((a, b) => b.share - a.share);
  // merge near-duplicates
  const out: { hex: string; share: number }[] = [];
  for (const c of colors) {
    const dup = out.find((o) => deltaE(o.hex, c.hex) < 5);
    if (dup) dup.share += c.share;
    else out.push(c);
  }
  colors = out.slice(0, count);
  return colors.map((c) => ({ ...c, name: nameColor(c.hex) }));
}
