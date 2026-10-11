// Validates and prepares user uploads. Files never leave the browser.
import type { UploadMeta } from "@/lib/model/types";
import { uid } from "@/lib/model/ids";
import { rgbToHex } from "@/lib/color/color";

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
export const ACCEPT_ATTR = ".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 2400;

export class UploadError extends Error {}

function readImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UploadError("This file couldn't be opened as an image."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new UploadError("Couldn't process this image."))), type, q));
}

/**
 * Validate a file and produce a safe raster blob plus metadata.
 * SVGs are rasterised to PNG (scripts never run inside an <img>), so no SVG
 * markup from uploads is ever inserted into the page.
 */
export async function prepareUpload(file: File): Promise<{ meta: UploadMeta; blob: Blob }> {
  const type = file.type || (file.name.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "");
  if (!ACCEPTED_TYPES.includes(type)) throw new UploadError(`${file.name}: use PNG, JPG, WebP, GIF or SVG images.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(`${file.name} is larger than 12 MB. Try a smaller version.`);
  const isSvg = type === "image/svg+xml";
  const source = isSvg ? new Blob([await file.arrayBuffer()], { type: "image/svg+xml" }) : file;
  const img = await readImage(source);
  let w = img.naturalWidth || (isSvg ? 1200 : 0);
  let h = img.naturalHeight || (isSvg ? 1200 : 0);
  if (!w || !h) throw new UploadError(`${file.name} has no readable size.`);
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h), isSvg ? 1600 / Math.max(w, h) : 1);
  let blob: Blob = file;
  const canvas = document.createElement("canvas");
  const tw = Math.max(1, Math.round(w * (isSvg ? Math.max(scale, 1600 / Math.max(w, h)) : scale)));
  const th = Math.max(1, Math.round(h * (tw / w)));
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, tw, th);
  URL.revokeObjectURL(img.src);
  if (isSvg) blob = await canvasToBlob(canvas, "image/png");
  else if (scale < 1) blob = await canvasToBlob(canvas, type === "image/png" ? "image/png" : "image/jpeg", 0.9);
  if (isSvg || scale < 1) (w = tw), (h = th);
  // dominant colour
  const s = document.createElement("canvas");
  s.width = s.height = 8;
  const sx = s.getContext("2d")!;
  sx.drawImage(canvas, 0, 0, 8, 8);
  const d = sx.getImageData(0, 0, 8, 8).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30) (r += d[i]), (g += d[i + 1]), (b += d[i + 2]), n++;
  const meta: UploadMeta = {
    id: uid("up"),
    name: file.name.replace(/\.[^.]+$/, "") || "Upload",
    type: blob.type || type,
    size: blob.size,
    width: w,
    height: h,
    createdAt: Date.now(),
    dominant: n ? rgbToHex([r / n, g / n, b / n]) : "#E2DACD",
  };
  return { meta, blob };
}
