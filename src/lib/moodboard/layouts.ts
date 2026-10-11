// Moodboard starting layouts. Applying a layout only rearranges existing items:
// nothing is deleted, and items that don't fit a slot are stacked in an
// overflow row so they stay visible.

import type { MoodItem, MoodLayoutId } from "@/lib/model/types";

export const BOARD_W = 1600;
export const BOARD_H = 1000;

interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
}

interface LayoutDef {
  id: MoodLayoutId;
  name: string;
  description: string;
  images: Slot[];
  texts: Slot[];
  swatches: Slot; // row area for swatches
  background: string;
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: "editorial-grid",
    name: "Editorial grid",
    description: "A calm magazine grid with one hero image.",
    background: "#FBF8F2",
    images: [
      { x: 60, y: 60, w: 480, h: 880 },
      { x: 580, y: 200, w: 360, h: 380 },
      { x: 970, y: 200, w: 570, h: 380 },
      { x: 580, y: 610, w: 300, h: 330 },
      { x: 910, y: 610, w: 330, h: 330 },
    ],
    texts: [
      { x: 580, y: 56, w: 640, h: 110 },
      { x: 1270, y: 610, w: 270, h: 120 },
      { x: 1270, y: 740, w: 270, h: 60 },
    ],
    swatches: { x: 1270, y: 830, w: 270, h: 110 },
  },
  {
    id: "freeform",
    name: "Freeform collage",
    description: "Overlapping, slightly tilted pieces for an expressive mood.",
    background: "#F3EEE3",
    images: [
      { x: 90, y: 90, w: 420, h: 520, r: -3 },
      { x: 430, y: 380, w: 480, h: 360, r: 2.5 },
      { x: 860, y: 80, w: 380, h: 470, r: 4 },
      { x: 1180, y: 300, w: 340, h: 420, r: -2 },
      { x: 120, y: 640, w: 300, h: 300, r: 3 },
      { x: 930, y: 600, w: 300, h: 330, r: -4 },
      { x: 560, y: 70, w: 260, h: 260, r: -1.5 },
    ],
    texts: [
      { x: 520, y: 780, w: 420, h: 110, r: -2 },
      { x: 1240, y: 760, w: 300, h: 80 },
      { x: 1240, y: 840, w: 300, h: 60 },
    ],
    swatches: { x: 1240, y: 120, w: 320, h: 120 },
  },
  {
    id: "minimal",
    name: "Minimal concept board",
    description: "Two images, a statement and plenty of air.",
    background: "#FFFDF9",
    images: [
      { x: 820, y: 100, w: 340, h: 800 },
      { x: 1200, y: 100, w: 340, h: 520 },
      { x: 1200, y: 660, w: 160, h: 240 },
      { x: 1380, y: 660, w: 160, h: 240 },
    ],
    texts: [
      { x: 100, y: 120, w: 620, h: 180 },
      { x: 100, y: 330, w: 560, h: 160 },
      { x: 100, y: 520, w: 560, h: 80 },
    ],
    swatches: { x: 100, y: 780, w: 620, h: 120 },
  },
  {
    id: "texture",
    name: "Texture-focused board",
    description: "An even grid of close-ups for materials and surfaces.",
    background: "#EFE9DE",
    images: Array.from({ length: 10 }, (_, i) => ({ x: 60 + (i % 5) * 300, y: 60 + Math.floor(i / 5) * 300, w: 280, h: 280 })),
    texts: [
      { x: 60, y: 690, w: 560, h: 90 },
      { x: 60, y: 790, w: 560, h: 120 },
      { x: 660, y: 690, w: 400, h: 60 },
    ],
    swatches: { x: 1100, y: 680, w: 440, h: 240 },
  },
];

export function getLayout(id: MoodLayoutId) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function applyLayout(id: MoodLayoutId, items: MoodItem[]): { items: MoodItem[]; overflow: number } {
  const L = getLayout(id);
  const images = items.filter((i) => i.type === "image");
  const texts = items.filter((i) => i.type === "text");
  const swatches = items.filter((i) => i.type === "swatch");
  let overflow = 0;
  const placed = new Map<string, MoodItem>();

  images.forEach((it, i) => {
    const s = L.images[i];
    if (s) placed.set(it.id, { ...it, x: s.x, y: s.y, w: s.w, h: s.h, rotation: s.r ?? 0 });
    else {
      overflow++;
      const k = i - L.images.length;
      placed.set(it.id, { ...it, x: 40 + k * 70, y: BOARD_H - 190 - (k % 2) * 20, w: 150, h: 150, rotation: 0 });
    }
  });
  texts.forEach((it, i) => {
    const s = L.texts[i];
    if (s) placed.set(it.id, { ...it, x: s.x, y: s.y, w: s.w, h: s.h, rotation: s.r ?? 0 });
    else {
      overflow++;
      placed.set(it.id, { ...it, x: BOARD_W - 360, y: 40 + (i - L.texts.length) * 70, rotation: 0 });
    }
  });
  if (swatches.length) {
    const area = L.swatches;
    const perRow = Math.min(swatches.length, Math.max(1, Math.floor((area.w + 10) / 50)));
    const rows = Math.ceil(swatches.length / perRow);
    const gap = 10;
    const size = Math.min((area.w - gap * (perRow - 1)) / perRow, (area.h - gap * (rows - 1)) / rows, 120);
    swatches.forEach((it, i) => {
      placed.set(it.id, { ...it, x: area.x + (i % perRow) * (size + gap), y: area.y + Math.floor(i / perRow) * (size + gap), w: size, h: size, rotation: 0 });
    });
  }
  return { items: items.map((it) => placed.get(it.id) ?? it), overflow };
}
