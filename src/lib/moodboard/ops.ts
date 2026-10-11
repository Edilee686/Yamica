import type { ImageRef, MoodImageItem, MoodItem, MoodShapeItem, MoodSwatchItem, MoodTextItem } from "@/lib/model/types";
import { uid } from "@/lib/model/ids";
import { wrapText } from "@/lib/text/wrap";
import { BOARD_H, BOARD_W } from "./layouts";

export function imageItem(image: ImageRef, aspect: number, at?: { x: number; y: number }): MoodImageItem {
  let w = 340;
  let h = w / aspect;
  if (h > 460) (h = 460), (w = h * aspect);
  const cx = at?.x ?? BOARD_W / 2 + (Math.random() - 0.5) * 120;
  const cy = at?.y ?? BOARD_H / 2 + (Math.random() - 0.5) * 80;
  return { id: uid("mi"), type: "image", image, x: cx - w / 2, y: cy - h / 2, w, h, rotation: 0, crop: { zoom: 1, fx: 0, fy: 0 } };
}

export function textItem(kind: "heading" | "note" | "label", at?: { x: number; y: number }): MoodTextItem {
  const base =
    kind === "heading"
      ? { text: "Your heading", font: "serif" as const, size: 72, w: 560, weight: 400 }
      : kind === "label"
        ? { text: "LABEL", font: "sans" as const, size: 16, w: 240, weight: 600 }
        : { text: "A note about the mood, a material or a feeling.", font: "sans" as const, size: 22, w: 340, weight: 400 };
  const it: MoodTextItem = { id: uid("mi"), type: "text", color: kind === "label" ? "#6E5690" : "#2B2826", align: "start", rotation: 0, x: 0, y: 0, h: 0, ...base };
  it.h = textHeight(it);
  it.x = (at?.x ?? BOARD_W / 2) - it.w / 2;
  it.y = (at?.y ?? BOARD_H / 2) - it.h / 2;
  return it;
}

export function textHeight(it: Pick<MoodTextItem, "text" | "font" | "size" | "w" | "weight" | "italic">) {
  const lines = wrapText(it.text || " ", { family: it.font, size: it.size, weight: it.weight, italic: it.italic, width: it.w }).length;
  const lh = it.size * (it.font === "serif" ? 1.05 : 1.3);
  return Math.ceil(lines * lh + it.size * 0.25);
}

export function swatchItem(hex: string, label?: string, swatchId?: string, at?: { x: number; y: number }): MoodSwatchItem {
  const s = 100;
  return { id: uid("mi"), type: "swatch", hex, label, swatchId, w: s, h: s, rotation: 0, x: (at?.x ?? BOARD_W / 2) - s / 2, y: (at?.y ?? BOARD_H / 2) - s / 2 };
}

export function shapeItem(shape: MoodShapeItem["shape"], at?: { x: number; y: number }): MoodShapeItem {
  const w = shape === "line" ? 320 : 240;
  const h = shape === "line" ? 24 : shape === "ellipse" ? 240 : 160;
  return {
    id: uid("mi"),
    type: "shape",
    shape,
    fill: shape === "line" ? "transparent" : "#EBE4F3",
    stroke: "#2B2826",
    strokeWidth: shape === "line" ? 3 : 0,
    w,
    h,
    rotation: 0,
    x: (at?.x ?? BOARD_W / 2) - w / 2,
    y: (at?.y ?? BOARD_H / 2) - h / 2,
  };
}

export function duplicateItem(it: MoodItem): MoodItem {
  return { ...structuredClone(it), id: uid("mi"), x: it.x + 24, y: it.y + 24 };
}

/** Compute snap adjustments for a moving box against other items and the board. */
export function snapBox(box: { x: number; y: number; w: number; h: number }, others: MoodItem[], tol: number) {
  const xs = [0, BOARD_W / 2, BOARD_W];
  const ys = [0, BOARD_H / 2, BOARD_H];
  for (const o of others) {
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  const mine = { x: [box.x, box.x + box.w / 2, box.x + box.w], y: [box.y, box.y + box.h / 2, box.y + box.h] };
  let dx = 0, dy = 0, gx: number | null = null, gy: number | null = null, bx = tol + 1, by = tol + 1;
  for (const m of mine.x) for (const t of xs) if (Math.abs(t - m) < bx) (bx = Math.abs(t - m)), (dx = t - m), (gx = t);
  for (const m of mine.y) for (const t of ys) if (Math.abs(t - m) < by) (by = Math.abs(t - m)), (dy = t - m), (gy = t);
  return { dx: bx <= tol ? dx : 0, dy: by <= tol ? dy : 0, guideX: bx <= tol ? gx : null, guideY: by <= tol ? gy : null };
}
