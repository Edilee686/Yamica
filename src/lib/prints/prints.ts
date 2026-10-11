// Original vector print library.
//
// Every print is drawn from code as a seamless tile with named colour slots, so
// it can be recoloured, scaled, rotated and offset inside any garment panel.
// Prints are original artwork made for Yamica Studio.

import type { AssetLicense, VectorPrint } from "@/lib/model/types";

const ORIGINAL: AssetLicense = {
  creator: "Yamica Studio",
  license: "Original · free to use in your designs",
  usage: "Drawn for Yamica Studio. You can use it in your own designs, presentations and products.",
  source: "Built-in vector print",
};

type Colors = Record<string, string>;

interface PrintDef extends Omit<VectorPrint, "kind" | "license"> {
  /** Draws the tile motifs (without the ground colour). */
  draw: (c: Colors, w: number, h: number) => string;
}

const f = (n: number) => Math.round(n * 100) / 100;

/** Draw a motif at (x, y) and at every wrapped copy so tiles join seamlessly. */
function wrap(w: number, h: number, x: number, y: number, draw: (x: number, y: number) => string): string {
  let out = "";
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) out += draw(x + dx, y + dy);
  return out;
}

function flower(cx: number, cy: number, r: number, petals: number, rot: number, petal: string, centre: string, ry = 1.75) {
  let s = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${rot})">`;
  for (let i = 0; i < petals; i++) {
    s += `<ellipse cx="0" cy="${f(-r)}" rx="${f(r * 0.52)}" ry="${f(r * ry * 0.55)}" fill="${petal}" transform="rotate(${f((360 / petals) * i)})"/>`;
  }
  s += `<circle r="${f(r * 0.42)}" fill="${centre}"/></g>`;
  return s;
}

function leaf(x: number, y: number, len: number, rot: number, color: string, width = 0.38) {
  const w = len * width;
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${rot})" d="M0 0 Q${f(w)} ${f(-len / 2)} 0 ${f(-len)} Q${f(-w)} ${f(-len / 2)} 0 0Z" fill="${color}"/>`;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const DEFS: PrintDef[] = [
  {
    id: "fine-stripe",
    name: "Fine stripe",
    category: "stripes",
    description: "A crisp pinstripe that reads as texture from a distance.",
    tags: ["shirting", "classic", "minimal"],
    slots: [
      { key: "ground", label: "Ground", default: "#F3EEE3" },
      { key: "line", label: "Stripe", default: "#4A4744" },
    ],
    tile: { w: 9, h: 9 },
    draw: (c, w, h) => `<rect x="0" y="0" width="1.3" height="${h}" fill="${c.line}"/>`,
  },
  {
    id: "breton",
    name: "Breton stripe",
    category: "stripes",
    description: "Even horizontal stripes with a nautical rhythm.",
    tags: ["nautical", "classic"],
    slots: [
      { key: "ground", label: "Ground", default: "#F3EEE3" },
      { key: "stripe", label: "Stripe", default: "#2F3A56" },
    ],
    tile: { w: 28, h: 26 },
    draw: (c, w) => `<rect x="0" y="0" width="${w}" height="8.5" fill="${c.stripe}"/>`,
  },
  {
    id: "candy-stripe",
    name: "Awning stripe",
    category: "stripes",
    description: "Two-tone vertical stripes with a fine accent line.",
    tags: ["summer", "playful", "resort"],
    slots: [
      { key: "ground", label: "Ground", default: "#F6EFD9" },
      { key: "wide", label: "Wide stripe", default: "#E6B9AE" },
      { key: "fine", label: "Fine stripe", default: "#8C6E9E" },
    ],
    tile: { w: 36, h: 36 },
    draw: (c, w, h) => `<rect x="0" y="0" width="13" height="${h}" fill="${c.wide}"/><rect x="22" y="0" width="2" height="${h}" fill="${c.fine}"/>`,
  },
  {
    id: "gingham",
    name: "Gingham",
    category: "checks",
    description: "Woven-look check with soft overlapping bands.",
    tags: ["picnic", "romantic", "vintage"],
    slots: [
      { key: "ground", label: "Ground", default: "#FBF8F1" },
      { key: "check", label: "Check", default: "#8FA58A" },
    ],
    tile: { w: 20, h: 20 },
    draw: (c, w, h) =>
      `<rect x="0" y="0" width="10" height="${h}" fill="${c.check}" opacity=".5"/><rect x="0" y="0" width="${w}" height="10" fill="${c.check}" opacity=".5"/>`,
  },
  {
    id: "windowpane",
    name: "Windowpane check",
    category: "checks",
    description: "A large open check with a fine overcheck.",
    tags: ["tailoring", "minimal"],
    slots: [
      { key: "ground", label: "Ground", default: "#DCD6CB" },
      { key: "line", label: "Main line", default: "#34312E" },
      { key: "over", label: "Overcheck", default: "#B9A9C9" },
    ],
    tile: { w: 52, h: 52 },
    draw: (c, w, h) =>
      `<rect x="0" y="0" width="1.4" height="${h}" fill="${c.line}"/><rect x="0" y="0" width="${w}" height="1.4" fill="${c.line}"/><rect x="26" y="0" width="0.7" height="${h}" fill="${c.over}"/><rect x="0" y="26" width="${w}" height="0.7" fill="${c.over}"/>`,
  },
  {
    id: "houndstooth",
    name: "Houndstooth",
    category: "checks",
    description: "The broken-check classic, drawn in crisp vector.",
    tags: ["tailoring", "heritage"],
    slots: [
      { key: "ground", label: "Ground", default: "#F3EEE3" },
      { key: "ink", label: "Ink", default: "#34312E" },
    ],
    tile: { w: 16, h: 16 },
    draw: (c) => `<path fill="${c.ink}" d="M0 0H8V8H0Z M8 0H12L16 4V8Z M0 8V12L4 16H8Z"/>`,
  },
  {
    id: "polka",
    name: "Polka dot",
    category: "dots",
    description: "Evenly spaced dots in a half-drop repeat.",
    tags: ["playful", "retro", "romantic"],
    slots: [
      { key: "ground", label: "Ground", default: "#2F2D2B" },
      { key: "dot", label: "Dot", default: "#F3EEE3" },
    ],
    tile: { w: 24, h: 24 },
    draw: (c) => `<circle cx="6" cy="6" r="3.1" fill="${c.dot}"/><circle cx="18" cy="18" r="3.1" fill="${c.dot}"/>`,
  },
  {
    id: "pin-dot",
    name: "Pin dot",
    category: "dots",
    description: "A tiny dot that softens a solid colour.",
    tags: ["minimal", "shirting"],
    slots: [
      { key: "ground", label: "Ground", default: "#B9A9C9" },
      { key: "dot", label: "Dot", default: "#FBF8F1" },
    ],
    tile: { w: 10, h: 10 },
    draw: (c) => `<circle cx="2.5" cy="2.5" r="0.9" fill="${c.dot}"/><circle cx="7.5" cy="7.5" r="0.9" fill="${c.dot}"/>`,
  },
  {
    id: "ditsy-floral",
    name: "Ditsy floral",
    category: "florals",
    description: "Small scattered blossoms with leaves.",
    tags: ["romantic", "vintage", "summer"],
    slots: [
      { key: "ground", label: "Ground", default: "#F5E9E4" },
      { key: "petal", label: "Petals", default: "#C98E8A" },
      { key: "centre", label: "Centres", default: "#E9C46A" },
      { key: "leaf", label: "Leaves", default: "#7E967A" },
    ],
    tile: { w: 60, h: 60 },
    draw: (c, w, h) => {
      const spots: [number, number, number][] = [
        [12, 14, 20],
        [42, 30, 70],
        [22, 47, 130],
        [52, 54, 10],
      ];
      let s = "";
      for (const [x, y, r] of spots) {
        s += wrap(w, h, x, y, (X, Y) => leaf(X + 4, Y + 4, 8, r + 120, c.leaf) + leaf(X - 4, Y + 4, 7, r - 130, c.leaf) + flower(X, Y, 3.4, 5, r, c.petal, c.centre));
      }
      return s;
    },
  },
  {
    id: "bloom",
    name: "Open bloom",
    category: "florals",
    description: "Generous painterly flowers for statement pieces.",
    tags: ["statement", "romantic", "resort"],
    slots: [
      { key: "ground", label: "Ground", default: "#EFE7D6" },
      { key: "petal", label: "Petals", default: "#B9A9C9" },
      { key: "petal2", label: "Second petals", default: "#E6B9AE" },
      { key: "centre", label: "Centres", default: "#34312E" },
      { key: "leaf", label: "Leaves", default: "#8FA58A" },
    ],
    tile: { w: 130, h: 130 },
    draw: (c, w, h) => {
      let s = "";
      s += wrap(w, h, 34, 38, (x, y) => leaf(x + 14, y + 16, 30, 140, c.leaf) + leaf(x - 16, y + 12, 26, -120, c.leaf) + flower(x, y, 13, 7, 12, c.petal, c.centre));
      s += wrap(w, h, 98, 92, (x, y) => leaf(x - 12, y - 16, 26, -40, c.leaf) + leaf(x + 16, y - 6, 22, 70, c.leaf) + flower(x, y, 11, 6, 40, c.petal2, c.centre));
      s += wrap(w, h, 96, 22, (x, y) => flower(x, y, 5, 5, 0, c.petal, c.centre));
      s += wrap(w, h, 30, 106, (x, y) => flower(x, y, 5.5, 5, 30, c.petal2, c.centre));
      return s;
    },
  },
  {
    id: "botanical-line",
    name: "Botanical line",
    category: "botanical",
    description: "Fine drawn stems and leaves with plenty of air.",
    tags: ["minimal", "soft city", "nature"],
    slots: [
      { key: "ground", label: "Ground", default: "#F3EEE3" },
      { key: "ink", label: "Line", default: "#7E967A" },
    ],
    tile: { w: 90, h: 90 },
    draw: (c, w, h) => {
      const stem = (x: number, y: number, rot: number) => {
        let s = `<g transform="translate(${x} ${y}) rotate(${rot})" fill="none" stroke="${c.ink}" stroke-width="1.15" stroke-linecap="round">`;
        s += `<path d="M0 0 Q4 -16 0 -34"/>`;
        for (const [ly, side] of [
          [-8, 1],
          [-15, -1],
          [-22, 1],
          [-29, -1],
        ] as const) {
          s += `<path d="M${f(side * 0.4)} ${ly} q${side * 7} -2 ${side * 9} -9 q${side * -6} 0 ${side * -9} 9z"/>`;
        }
        return s + "</g>";
      };
      return wrap(w, h, 22, 50, (x, y) => stem(x, y, -12)) + wrap(w, h, 68, 88, (x, y) => stem(x, y, 18)) + wrap(w, h, 64, 30, (x, y) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${c.ink}"/>`);
    },
  },
  {
    id: "palm",
    name: "Palm shade",
    category: "botanical",
    description: "Bold tropical leaves in a loose half-drop.",
    tags: ["resort", "statement", "summer"],
    slots: [
      { key: "ground", label: "Ground", default: "#E9E3CF" },
      { key: "leaf", label: "Leaves", default: "#5E7A62" },
      { key: "leaf2", label: "Shadow leaves", default: "#A9B99E" },
    ],
    tile: { w: 110, h: 110 },
    draw: (c, w, h) => {
      const frond = (x: number, y: number, rot: number, col: string, size: number) => {
        let s = `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${size})">`;
        s += `<path d="M0 0 Q2 -20 0 -44" stroke="${col}" stroke-width="1.6" fill="none"/>`;
        for (let i = 0; i < 6; i++) {
          const yy = -8 - i * 6;
          const len = 15 - Math.abs(i - 2) * 2;
          s += leaf(0, yy, len, 60 - i * 3, col, 0.3) + leaf(0, yy, len, -60 + i * 3, col, 0.3);
        }
        return s + "</g>";
      };
      return wrap(w, h, 30, 60, (x, y) => frond(x, y, -20, c.leaf2, 1)) + wrap(w, h, 80, 104, (x, y) => frond(x, y, 25, c.leaf, 1.1)) + wrap(w, h, 70, 36, (x, y) => frond(x, y, 140, c.leaf, 0.7));
    },
  },
  {
    id: "soft-geometry",
    name: "Soft geometry",
    category: "geometric",
    description: "Quarter circles and blocks inspired by pale concrete and arches.",
    tags: ["soft city", "architectural", "modern"],
    slots: [
      { key: "ground", label: "Ground", default: "#F3EEE3" },
      { key: "a", label: "Arcs", default: "#B9A9C9" },
      { key: "b", label: "Blocks", default: "#E9D79A" },
      { key: "line", label: "Line", default: "#34312E" },
    ],
    tile: { w: 64, h: 64 },
    draw: (c) =>
      `<path d="M0 32 A32 32 0 0 1 32 0 L32 32Z" fill="${c.a}"/><rect x="40" y="40" width="16" height="16" fill="${c.b}"/><path d="M32 64 A32 32 0 0 1 64 32" fill="none" stroke="${c.line}" stroke-width="1.2"/><circle cx="48" cy="14" r="3" fill="${c.line}"/>`,
  },
  {
    id: "triangles",
    name: "Pennant triangles",
    category: "geometric",
    description: "Rows of alternating triangles with a graphic edge.",
    tags: ["graphic", "streetwear", "playful"],
    slots: [
      { key: "ground", label: "Ground", default: "#F3EEE3" },
      { key: "a", label: "Triangles", default: "#34312E" },
      { key: "b", label: "Accent triangles", default: "#C9D3BF" },
    ],
    tile: { w: 40, h: 34.64 },
    draw: (c) => `<path d="M0 34.64 L20 0 L40 34.64Z" fill="${c.a}"/><path d="M20 0 L40 0 L30 17.32Z" fill="${c.b}"/><path d="M0 0 L20 0 L10 17.32Z" fill="${c.b}" opacity="0"/>`,
  },
  {
    id: "brushwork",
    name: "Brushwork",
    category: "abstract",
    description: "Loose organic shapes like paint on paper.",
    tags: ["artistic", "experimental", "expressive"],
    slots: [
      { key: "ground", label: "Ground", default: "#F1EBDD" },
      { key: "a", label: "Shape one", default: "#E6B9AE" },
      { key: "b", label: "Shape two", default: "#8FA58A" },
      { key: "c", label: "Marks", default: "#34312E" },
    ],
    tile: { w: 140, h: 140 },
    draw: (c, w, h) => {
      const blob1 = (x: number, y: number) => `<path transform="translate(${x} ${y})" fill="${c.a}" d="M-22 -6 C-24 -26 6 -32 20 -20 C34 -8 28 14 10 20 C-8 26 -20 14 -22 -6Z"/>`;
      const blob2 = (x: number, y: number) => `<path transform="translate(${x} ${y}) rotate(30)" fill="${c.b}" d="M-30 0 C-28 -14 -6 -16 8 -12 C24 -8 32 6 20 14 C4 22 -32 16 -30 0Z"/>`;
      const mark = (x: number, y: number) => `<path transform="translate(${x} ${y})" fill="none" stroke="${c.c}" stroke-width="2.2" stroke-linecap="round" d="M-14 4 Q-4 -8 6 2 T22 -2"/>`;
      return wrap(w, h, 34, 36, blob1) + wrap(w, h, 102, 98, blob2) + wrap(w, h, 100, 30, mark) + wrap(w, h, 30, 110, mark) + wrap(w, h, 70, 70, (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="${c.c}"/>`);
    },
  },
  {
    id: "rosette",
    name: "Rosette spot",
    category: "animal",
    description: "An animal-inspired rosette, softened and stylised.",
    tags: ["bold", "statement", "urban"],
    slots: [
      { key: "ground", label: "Ground", default: "#E3CFAE" },
      { key: "ring", label: "Rings", default: "#3A2F28" },
      { key: "fill", label: "Centres", default: "#C39A6B" },
    ],
    tile: { w: 72, h: 72 },
    draw: (c, w, h) => {
      const r = rng(7);
      let s = "";
      const spots: [number, number][] = [
        [12, 12],
        [46, 8],
        [30, 36],
        [62, 40],
        [10, 58],
        [44, 64],
      ];
      for (const [x, y] of spots) {
        const rot = Math.round(r() * 360);
        const sc = 0.8 + r() * 0.5;
        s += wrap(w, h, x, y, (X, Y) =>
          `<g transform="translate(${X} ${Y}) rotate(${rot}) scale(${f(sc)})"><ellipse rx="5.2" ry="4" fill="${c.fill}"/><path fill="${c.ring}" d="M-7 -1 Q-6 -6 -1 -6.5 L0 -4.6 Q-4.4 -4.2 -5 -0.6Z M2 -6.4 Q7 -5 7.2 0 L5 0.4 Q5 -3.4 1.6 -4.6Z M6.6 2.6 Q4.6 6.4 0 6.6 L0 4.6 Q3.4 4.4 4.6 1.8Z M-2 6.4 Q-6.4 5.2 -7 2 L-5 1.6 Q-4.4 4 -1.6 4.6Z"/></g>`,
        );
      }
      return s;
    },
  },
  {
    id: "squiggle",
    name: "Hand squiggle",
    category: "hand-drawn",
    description: "Wobbly marker lines and dots with a hand-made feel.",
    tags: ["playful", "artistic", "streetwear"],
    slots: [
      { key: "ground", label: "Ground", default: "#F6EFD9" },
      { key: "line", label: "Line", default: "#34312E" },
      { key: "dot", label: "Dots", default: "#B9A9C9" },
    ],
    tile: { w: 56, h: 56 },
    draw: (c, w, h) =>
      wrap(w, h, 14, 16, (x, y) => `<path transform="translate(${x} ${y}) rotate(-18)" fill="none" stroke="${c.line}" stroke-width="1.6" stroke-linecap="round" d="M-10 0 q2.5 -5 5 0 t5 0 t5 0 t5 0"/>`) +
      wrap(w, h, 40, 42, (x, y) => `<path transform="translate(${x} ${y}) rotate(24)" fill="none" stroke="${c.line}" stroke-width="1.6" stroke-linecap="round" d="M-10 0 q2.5 -5 5 0 t5 0 t5 0 t5 0"/>`) +
      wrap(w, h, 42, 12, (x, y) => `<circle cx="${x}" cy="${y}" r="3" fill="${c.dot}"/>`) +
      wrap(w, h, 12, 44, (x, y) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${c.dot}"/>`),
  },
  {
    id: "retro-arches",
    name: "Seventies arches",
    category: "retro",
    description: "Stacked rainbow arches with a warm 1970s mood.",
    tags: ["retro", "playful", "vintage"],
    slots: [
      { key: "ground", label: "Ground", default: "#F3EEE3" },
      { key: "a", label: "Outer arc", default: "#C98E5A" },
      { key: "b", label: "Middle arc", default: "#E9C46A" },
      { key: "c", label: "Inner arc", default: "#8FA58A" },
    ],
    tile: { w: 60, h: 34 },
    draw: (c) => {
      const arc = (r: number, col: string) => `<path d="M${30 - r} 32 A${r} ${r} 0 0 1 ${30 + r} 32" fill="none" stroke="${col}" stroke-width="4.4"/>`;
      return arc(25, c.a) + arc(18, c.b) + arc(11, c.c) + `<circle cx="30" cy="32" r="3" fill="${c.a}"/>`;
    },
  },
  {
    id: "deco-fan",
    name: "Deco fan",
    category: "retro",
    description: "Art deco scallops with fine radiating lines.",
    tags: ["historical", "occasion", "elegant"],
    slots: [
      { key: "ground", label: "Ground", default: "#2F3A56" },
      { key: "fan", label: "Fans", default: "#D9C38F" },
    ],
    tile: { w: 40, h: 20 },
    draw: (c) => {
      const fan = (x: number, y: number) => {
        let s = `<path d="M${x - 20} ${y} A20 20 0 0 1 ${x + 20} ${y}" fill="none" stroke="${c.fan}" stroke-width="1.1"/>`;
        s += `<path d="M${x - 13} ${y} A13 13 0 0 1 ${x + 13} ${y}" fill="none" stroke="${c.fan}" stroke-width="0.8"/>`;
        for (let i = 1; i < 6; i++) {
          const a = (Math.PI * i) / 6;
          s += `<line x1="${x}" y1="${y}" x2="${f(x - Math.cos(a) * 13)}" y2="${f(y - Math.sin(a) * 13)}" stroke="${c.fan}" stroke-width="0.6"/>`;
        }
        return s;
      };
      return fan(20, 20) + fan(0, 10) + fan(40, 10) + fan(20, 40);
    },
  },
];

export const PRINTS: VectorPrint[] = DEFS.map(({ draw: _draw, ...p }) => ({ ...p, kind: "vector", license: ORIGINAL }));

const DRAW = Object.fromEntries(DEFS.map((d) => [d.id, d.draw]));

export const PRINT_CATEGORY_LABELS: Record<string, string> = {
  florals: "Florals",
  geometric: "Geometric",
  stripes: "Stripes",
  checks: "Checks",
  dots: "Polka dots",
  abstract: "Abstract",
  animal: "Animal-inspired",
  botanical: "Botanical",
  "hand-drawn": "Hand-drawn",
  retro: "Retro",
};

export function getVectorPrint(id: string): VectorPrint | undefined {
  return PRINTS.find((p) => p.id === id);
}

export function resolvePrintColors(print: VectorPrint, overrides?: Record<string, { hex: string }>): Colors {
  const out: Colors = {};
  for (const s of print.slots) out[s.key] = overrides?.[s.key]?.hex ?? s.default;
  return out;
}

/** Motif markup for one tile (ground colour excluded — it is painted underneath). */
export function printMotifs(id: string, colors: Colors): string {
  const p = getVectorPrint(id);
  const draw = DRAW[id];
  if (!p || !draw) return "";
  return draw(colors, p.tile.w, p.tile.h);
}

/** A complete standalone SVG of a print (used for thumbnails and swatches). */
export function printSwatchSVG(id: string, colors?: Colors, size = 120, scale = 1): string {
  const p = getVectorPrint(id);
  if (!p) return "";
  const c = colors ?? resolvePrintColors(p);
  const key = JSON.stringify([c, size, scale]);
  let hsh = 0;
  for (let i = 0; i < key.length; i++) hsh = (hsh * 31 + key.charCodeAt(i)) | 0;
  const pid = `sw-${id}-${(hsh >>> 0).toString(36)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><defs><pattern id="${pid}" width="${p.tile.w}" height="${p.tile.h}" patternUnits="userSpaceOnUse" patternTransform="scale(${scale})">${printMotifs(id, c)}</pattern></defs><rect width="${size}" height="${size}" fill="${c.ground}"/><rect width="${size}" height="${size}" fill="url(#${pid})"/></svg>`;
}
