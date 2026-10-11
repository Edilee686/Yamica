// The built-in garment template library.
//
// Each template builds editable fashion flats from a fixed set of compatible
// components. Options only offer preset geometry, and `requires` rules prevent
// combinations whose parts would not attach cleanly. These are visual design
// flats, not sewing patterns.

import { C, CX, L, M, Pt, Q, Seg, Z, cont, lerp, mirror, qAt, qSplit, reverse, symmetric, toD } from "./path";
import {
  NeckStyle,
  buttonHoles,
  buttons,
  insideBack,
  mirrorD,
  neckBand,
  neckline,
  patchPocket,
  pocketStitch,
  sleevePair,
} from "./parts";
import type { BuiltDetail, BuiltGarment, BuiltPanel, GarmentTemplate } from "./types";

/* ---------------------------------------------------------------- helpers */

/** Full body from a neckline (left→right) and the left side chain (neckL → bottom centre). */
function body(neck: Seg[], leftChain: Seg[]): string {
  return toD([...neck, ...cont(mirror(leftChain)), ...cont(reverse(leftChain)), Z]);
}

const stitch = (segs: Seg[]): BuiltDetail => ({ kind: "stitch", d: toD(segs) });
const seam = (segs: Seg[]): BuiltDetail => ({ kind: "seam", d: toD(segs) });
const fold = (segs: Seg[]): BuiltDetail => ({ kind: "fold", d: toD(segs) });
const gather = (segs: Seg[]): BuiltDetail => ({ kind: "gather", d: toD(segs) });

function both(d: BuiltDetail): BuiltDetail[] {
  return [d, { ...d, d: mirrorD(d.d) }];
}

function pocketPair(segs: Seg[], idBase: string, label: string, origin: Pt): BuiltPanel[] {
  return [
    { id: `${idBase}L`, label: `Left ${label}`, kind: "pocket", d: toD(segs), mirrorGroup: `${idBase}s`, origin },
    { id: `${idBase}R`, label: `Right ${label}`, kind: "pocket", d: toD(mirror(segs)), mirrorGroup: `${idBase}s`, origin: [2 * CX - origin[0], origin[1]] },
  ];
}

function hemStitch(sideX: number, y: number, drop: number): BuiltDetail {
  return stitch([M([sideX + 2, y - 9]), Q([CX, y - 9 + drop * 2], [2 * CX - sideX - 2, y - 9])]);
}

const ivory = "#F3EEE3";
const charcoal = "#34312E";

/* -------------------------------------------------------------- T-shirt */

const tee: GarmentTemplate = {
  id: "tee",
  name: "Relaxed T-shirt",
  category: "tshirts",
  description: "An easy jersey tee with a ribbed neckband. Change the sleeves, neckline and length.",
  views: ["front", "back"],
  options: [
    {
      id: "sleeve",
      label: "Sleeves",
      default: "short",
      values: [
        { id: "short", label: "Short" },
        { id: "long", label: "Long" },
        { id: "sleeveless", label: "Sleeveless" },
      ],
    },
    {
      id: "neckline",
      label: "Neckline",
      default: "round",
      values: [
        { id: "round", label: "Round" },
        { id: "v", label: "V-neck" },
        { id: "square", label: "Square", requires: { sleeve: ["short", "long"] }, requiresLabel: "Needs sleeves" },
      ],
    },
    {
      id: "length",
      label: "Length",
      default: "regular",
      values: [
        { id: "cropped", label: "Cropped" },
        { id: "regular", label: "Regular" },
        { id: "long", label: "Long" },
      ],
    },
    {
      id: "pocket",
      label: "Pocket",
      default: "none",
      views: ["front"],
      values: [
        { id: "none", label: "None" },
        { id: "chest", label: "Chest pocket" },
      ],
    },
  ],
  notes: ["Square necklines are offered on sleeved versions, where the shoulders are wide enough to hold them."],
  defaults: {
    body: { hex: ivory, fabricId: "jersey" },
    neckband: { hex: ivory, fabricId: "jersey" },
    cuffL: { hex: ivory, fabricId: "jersey" },
    cuffR: { hex: ivory, fabricId: "jersey" },
  },
  build(o, view) {
    const sleeveless = o.sleeve === "sleeveless";
    const hw = 33;
    const y0 = 56;
    const style: NeckStyle = view === "back" ? "back" : (o.neckline as NeckStyle);
    const depth = view === "back" ? 8 : o.neckline === "v" ? 66 : o.neckline === "square" ? 40 : 30;
    const hemY = o.length === "cropped" ? 300 : o.length === "long" ? 455 : 405;
    const sideX = o.length === "long" ? 106 : o.length === "cropped" ? 111 : 108;
    const S: Pt = sleeveless ? [141, 64] : [114, 74];
    const A: Pt = sleeveless ? [150, 132] : [124, 118];
    const U: Pt = sleeveless ? [112, 170] : [110, 160];
    const neck = neckline(style, hw, y0, depth);
    const chain: Seg[] = [M([CX - hw, y0]), L(S), Q(A, U), L([sideX, hemY]), Q([150, hemY + 5], [CX, hemY + 5])];
    const panels: BuiltPanel[] = [];
    const details: BuiltDetail[] = [];
    if (view === "front") {
      panels.push({ id: "inside", label: "Inside back", kind: "body", d: insideBack(hw, y0, 9, neck), configFrom: "body", shade: 0.22, origin: [CX, y0] });
    }
    let cuffs: BuiltPanel[] = [];
    if (!sleeveless) {
      const sp = sleevePair(
        { S, U, A },
        o.sleeve === "long"
          ? { O: [42, 376], I: [80, 386], bow: [66, 150], cuff: 18 }
          : { O: [58, 150], I: [88, 176], bow: [80, 98], hemStitch: true },
      );
      panels.push(...sp.panels);
      cuffs = sp.cuffs.map((c) => ({ ...c, label: c.label.replace("cuff", "rib cuff") }));
      details.push(...sp.details);
    }
    panels.push({ id: "body", label: view === "back" ? "Back body" : "Main body", kind: "body", d: body(neck, chain), origin: [CX, 220] });
    panels.push({ id: "neckband", label: "Neckband", kind: "trim", d: neckBand(style, hw, y0, depth, 7), origin: [CX, y0 + depth] });
    panels.push(...cuffs);
    if (view === "front" && o.pocket === "chest") {
      const pk = patchPocket(234, 118, 34, 38);
      panels.push({ id: "pocket", label: "Chest pocket", kind: "pocket", d: toD(pk), origin: [251, 137] });
      details.push(pocketStitch(234, 118, 34, 38));
    }
    if (sleeveless) {
      details.push(...both(stitch([M([S[0] + 6, S[1] + 2]), Q([A[0] + 8, A[1] - 4], [U[0] + 5, U[1] + 6])])));
    }
    details.push(hemStitch(sideX, hemY, 2.5));
    if (view === "back") details.push(seam([M([CX - 10, y0 + 18]), L([CX + 10, y0 + 18])]));
    return { panels, details };
  },
};

/* ---------------------------------------------------------------- Shirt */

function shirtCollar(kind: string, view: "front" | "back", big = false): { d: string; details: BuiltDetail[] } {
  const k = big ? 1.12 : 1;
  if (view === "back") {
    if (kind === "none") return { d: "", details: [] };
    if (kind === "band" || kind === "stand") return { d: toD([M([166, 40]), Q([CX, 34], [234, 40]), L([235, 54]), Q([CX, 60], [165, 54]), Z]), details: [] };
    return {
      d: toD([M([166, 42]), Q([CX, 34], [234, 42]), L([240, 64 * k]), Q([CX, 74 * k], [160, 64 * k]), Z]),
      details: [seam([M([165, 50]), Q([CX, 44], [235, 50])])],
    };
  }
  if (kind === "band" || kind === "stand") {
    const left: Seg[] = [M([196, 76]), Q([182, 72], [168, 52]), L([167, 40]), Q([184, 36], [CX, 35])];
    const d = toD([...left, ...cont(reverse(mirror(left))), Z]);
    return { d, details: [stitch([M([170, 45]), Q([CX, 40], [230, 45])])] };
  }
  // point collar: stand behind the neck + two leaves
  const back = toD([M([168, 46]), Q([CX, 38], [232, 46]), L([233, 54]), Q([CX, 60], [167, 54]), Z]);
  const tipX = big ? 166 : 176;
  const tipY = big ? 124 : 108;
  const leaf: Seg[] = [M([199, 75]), Q([178, 70], [170, 45]), L(big ? [150, 56] : [157, 54]), Q([big ? 150 : 160, 90], [tipX, tipY]), Q([190, 94], [199, 75]), Z];
  const d = [back, toD(leaf), toD(mirror(leaf))].join(" ");
  const st = stitch([M([big ? 154 : 160, 60]), Q([big ? 155 : 163, 90], [tipX + 3, tipY - 6])]);
  return { d, details: both(st) };
}

const shirt: GarmentTemplate = {
  id: "shirt",
  name: "Relaxed shirt",
  category: "tops",
  description: "A soft button-front shirt with a curved hem. Swap collars, sleeves and pockets.",
  views: ["front", "back"],
  options: [
    {
      id: "collar",
      label: "Collar",
      default: "point",
      values: [
        { id: "point", label: "Shirt collar" },
        { id: "band", label: "Band collar" },
        { id: "none", label: "Collarless" },
      ],
    },
    {
      id: "sleeve",
      label: "Sleeves",
      default: "long",
      values: [
        { id: "long", label: "Long with cuffs" },
        { id: "short", label: "Short" },
      ],
    },
    {
      id: "length",
      label: "Length",
      default: "regular",
      values: [
        { id: "cropped", label: "Cropped" },
        { id: "regular", label: "Regular" },
        { id: "tunic", label: "Tunic" },
      ],
    },
    {
      id: "hem",
      label: "Hem",
      default: "curved",
      values: [
        { id: "curved", label: "Curved" },
        { id: "straight", label: "Straight" },
      ],
    },
    {
      id: "pockets",
      label: "Pockets",
      default: "one",
      views: ["front"],
      values: [
        { id: "none", label: "None" },
        { id: "one", label: "One" },
        { id: "two", label: "Two" },
      ],
    },
    {
      id: "placket",
      label: "Closure",
      default: "buttons",
      views: ["front"],
      values: [
        { id: "buttons", label: "Visible buttons" },
        { id: "hidden", label: "Hidden placket" },
      ],
    },
  ],
  notes: ["Cuffs come with long sleeves; short sleeves have a stitched hem."],
  defaults: {
    body: { hex: ivory, fabricId: "cotton-poplin" },
    buttons: { hex: "#E9E2D3", fabricId: "cotton-poplin" },
  },
  build(o, view) {
    const hw = 30;
    const y0 = 50;
    const hemY = o.length === "cropped" ? 330 : o.length === "tunic" ? 470 : 425;
    const S: Pt = [110, 72];
    const A: Pt = [120, 122];
    const U: Pt = [102, 172];
    const sideX = 100;
    const curved = o.hem === "curved";
    const front = view === "front";
    const depth = front ? (o.collar === "none" ? 28 : 24) : 8;
    const style: NeckStyle = front ? "round" : "back";
    const neck = neckline(style, hw, y0, depth);
    const chain: Seg[] = curved
      ? [M([CX - hw, y0]), L(S), Q(A, U), L([sideX, hemY - 28]), C([103, hemY - 4], [150, hemY + 2], [CX, hemY + 2])]
      : [M([CX - hw, y0]), L(S), Q(A, U), L([sideX, hemY - 2]), Q([150, hemY + 2], [CX, hemY + 2])];
    const panels: BuiltPanel[] = [];
    const details: BuiltDetail[] = [];
    if (front && o.collar === "none") {
      panels.push({ id: "inside", label: "Inside back", kind: "body", d: insideBack(hw, y0, 9, neck), configFrom: "body", shade: 0.22, origin: [CX, y0] });
    }
    const sp = sleevePair(
      { S, U, A },
      o.sleeve === "long" ? { O: [48, 388], I: [88, 396], bow: [70, 176], cuff: 28 } : { O: [56, 180], I: [88, 202], bow: [80, 104], hemStitch: true },
    );
    panels.push(...sp.panels);
    details.push(...sp.details);
    panels.push({ id: "body", label: front ? "Main body" : "Back body", kind: "body", d: body(neck, chain), origin: [CX, 240] });
    if (front) {
      const top = y0 + depth - 1;
      panels.push({ id: "placket", label: "Button placket", kind: "trim", d: toD([M([191, top]), L([209, top]), L([209, hemY + 2]), L([191, hemY + 2]), Z]), origin: [CX, 200] });
      if (o.placket === "buttons") {
        const pts: Pt[] = [];
        for (let y = top + 14; y < hemY - 18; y += 50) pts.push([CX, y]);
        panels.push({ id: "buttons", label: "Buttons", kind: "button", d: buttons(pts, 4.2), origin: [CX, 200] });
        details.push(...buttonHoles(pts));
      } else {
        details.push(stitch([M([204, top + 2]), L([204, hemY - 6])]));
      }
      if (o.pockets !== "none") {
        const pk = patchPocket(132, 110, 36, 42, true);
        if (o.pockets === "two") panels.push(...pocketPair(pk, "pocket", "pocket", [150, 130]));
        else panels.push({ id: "pocketR", label: "Chest pocket", kind: "pocket", d: toD(mirror(pk)), mirrorGroup: "pockets", origin: [250, 130] });
        const ps = stitch([M([134, 118]), L([166, 118])]);
        details.push(o.pockets === "two" ? ps : { ...ps, d: mirrorD(ps.d) });
        if (o.pockets === "two") details.push({ ...ps, d: mirrorD(ps.d) });
      }
    } else {
      // back yoke and box pleat
      const split = qSplit(S, A, U, 0.38);
      const yokeLeft: Seg[] = [M([CX, y0 + 8]), Q([178, y0 + 8], [CX - hw, y0]), L(S), Q(split.first.q, split.first.p), Q([150, 116], [CX, 118])];
      panels.push({ id: "yoke", label: "Back yoke", kind: "panel", d: toD(symmetric(yokeLeft)), origin: [CX, 90] });
      details.push(fold([M([190, 118]), L([188, 170])]), fold([M([210, 118]), L([212, 170])]));
    }
    panels.push(...sp.cuffs);
    const collar = shirtCollar(o.collar, view);
    if (collar.d) panels.push({ id: "collar", label: o.collar === "band" ? "Band collar" : "Collar", kind: "collar", d: collar.d, origin: [CX, 60] });
    details.push(...collar.details);
    if (o.collar === "none" && front) details.push(stitch(neckline("round", hw + 6, y0 + 2, depth + 6)));
    details.push(curved ? stitch([M([sideX + 2, hemY - 36]), C([106, hemY - 13], [150, hemY - 7], [CX, hemY - 7]), C([250, hemY - 7], [294, hemY - 13], [298, hemY - 36])]) : hemStitch(sideX, hemY + 2, 1.5));
    return { panels, details };
  },
};

/* ---------------------------------------------------------------- Dress */

function skirtShape(silhouette: string, top: number, topHalf: number, hemY: number) {
  const len = hemY - top;
  if (silhouette === "sheath") {
    const hip: Pt = [CX - topHalf - 18, top + Math.min(70, len * 0.4)];
    const hem: Pt = [CX - topHalf - 12, hemY];
    const chain: Seg[] = [M([CX, top]), L([CX - topHalf, top]), Q([hip[0] + 2, top + 18], hip), L(hem), Q([150, hemY + 3], [CX, hemY + 3])];
    return { chain, hem, wavy: false, sideAt: (t: number) => (t < 0.4 ? lerp([CX - topHalf, top], hip, t / 0.4) : lerp(hip, hem, (t - 0.4) / 0.6)) };
  }
  const flare = silhouette === "full" ? 0.62 : 0.36;
  const half = Math.min(topHalf + len * flare, silhouette === "full" ? 178 : 150);
  const hem: Pt = [CX - half, hemY];
  const topPt: Pt = [CX - topHalf, top];
  if (silhouette === "full") {
    const ctrl: Pt = [CX - topHalf - len * 0.18, top + len * 0.35];
    const segs: Seg[] = [M([CX, top]), L(topPt), Q(ctrl, hem)];
    // gentle waves along the hem
    const waves = 4;
    for (let i = 1; i <= waves; i++) {
      const x0 = hem[0] + ((CX - hem[0]) * (i - 1)) / waves;
      const x1 = hem[0] + ((CX - hem[0]) * i) / waves;
      segs.push(Q([(x0 + x1) / 2, hemY + (i % 2 ? 12 : 4)], [x1, hemY + 6]));
    }
    return { chain: segs, hem, wavy: true, sideAt: (t: number) => qAt(topPt, ctrl, hem, t) };
  }
  const chain: Seg[] = [M([CX, top]), L(topPt), L(hem), Q([150, hemY + 7], [CX, hemY + 7])];
  return { chain, hem, wavy: false, sideAt: (t: number) => lerp(topPt, hem, t) };
}

const dress: GarmentTemplate = {
  id: "dress",
  name: "Simple dress",
  category: "dresses",
  description: "A waist-seamed dress. Mix bodice details with three skirt silhouettes and lengths.",
  views: ["front"],
  options: [
    {
      id: "neckline",
      label: "Neckline",
      default: "round",
      values: [
        { id: "round", label: "Round" },
        { id: "v", label: "V-neck" },
        { id: "square", label: "Square" },
      ],
    },
    {
      id: "sleeve",
      label: "Sleeves",
      default: "short",
      values: [
        { id: "sleeveless", label: "Sleeveless" },
        { id: "short", label: "Short" },
        { id: "puff", label: "Puff" },
        { id: "long", label: "Long" },
      ],
    },
    {
      id: "silhouette",
      label: "Skirt silhouette",
      default: "aline",
      values: [
        { id: "aline", label: "A-line" },
        { id: "sheath", label: "Straight" },
        { id: "full", label: "Full" },
      ],
    },
    {
      id: "length",
      label: "Length",
      default: "midi",
      values: [
        { id: "mini", label: "Mini" },
        { id: "midi", label: "Midi" },
        { id: "maxi", label: "Maxi" },
      ],
    },
    {
      id: "waist",
      label: "Waist",
      default: "seam",
      values: [
        { id: "seam", label: "Seam" },
        { id: "band", label: "Contrast band" },
      ],
    },
    {
      id: "hem",
      label: "Hem detail",
      default: "none",
      values: [
        { id: "none", label: "None" },
        { id: "band", label: "Contrast band", requires: { length: ["midi", "maxi"] }, requiresLabel: "Needs midi or maxi length" },
      ],
    },
  ],
  notes: ["The contrast hem band needs midi or maxi length to sit in proportion.", "Back view isn't drawn for this template yet."],
  defaults: {
    bodice: { hex: "#B9A9C9", fabricId: "cotton-poplin" },
    skirt: { hex: "#B9A9C9", fabricId: "cotton-poplin" },
    waistband: { hex: charcoal, fabricId: "cotton-poplin" },
    hemband: { hex: charcoal, fabricId: "cotton-poplin" },
  },
  build(o) {
    const sleeveless = o.sleeve === "sleeveless";
    const hw = 30;
    const y0 = 54;
    const depth = o.neckline === "v" ? 62 : o.neckline === "square" ? 36 : 30;
    const S: Pt = sleeveless ? [148, 60] : [126, 68];
    const A: Pt = sleeveless ? [152, 128] : [133, 110];
    const U: Pt = sleeveless ? [126, 158] : [124, 150];
    const waistY = 212;
    const banded = o.waist === "band";
    const neck = neckline(o.neckline as NeckStyle, hw, y0, depth);
    const bodiceChain: Seg[] = [M([CX - hw, y0]), L(S), Q(A, U), Q([128, 186], [136, waistY]), Q([170, waistY + 2], [CX, waistY + 2])];
    const panels: BuiltPanel[] = [];
    const details: BuiltDetail[] = [];
    panels.push({ id: "inside", label: "Inside back", kind: "body", d: insideBack(hw, y0, 9, neck), configFrom: "bodice", shade: 0.22, origin: [CX, y0] });
    if (!sleeveless) {
      const spec =
        o.sleeve === "long"
          ? { O: [68, 370] as Pt, I: [98, 376] as Pt, bow: [86, 170] as Pt, cuff: 14 }
          : o.sleeve === "puff"
            ? { O: [84, 134] as Pt, I: [112, 152] as Pt, bow: [90, 80] as Pt, puff: true, band: 9 }
            : { O: [80, 150] as Pt, I: [104, 168] as Pt, bow: [98, 94] as Pt, hemStitch: true };
      const sp = sleevePair({ S, U, A }, spec);
      panels.push(...sp.panels);
      details.push(...sp.details);
      panels.push(...sp.cuffs.map((c) => ({ ...c, label: c.label.replace("cuff", o.sleeve === "puff" ? "sleeve band" : "cuff") })));
    }
    const top = banded ? 224 : waistY;
    const topHalf = banded ? 61 : 64;
    const hemY = o.length === "mini" ? 330 : o.length === "maxi" ? 484 : 420;
    const shape = skirtShape(o.silhouette, top, topHalf, hemY);
    panels.push({ id: "skirt", label: "Skirt", kind: "skirt", d: toD(symmetric(shape.chain)), origin: [CX, (top + hemY) / 2] });
    panels.push({ id: "bodice", label: "Bodice", kind: "body", d: body(neck, bodiceChain), origin: [CX, 140] });
    if (banded) {
      panels.push({
        id: "waistband",
        label: "Waistband",
        kind: "waistband",
        d: toD([M([135, 203]), Q([170, 206], [CX, 206]), Q([230, 206], [265, 203]), L([263, 226]), Q([230, 228], [CX, 228]), Q([170, 228], [137, 226]), Z]),
        origin: [CX, 215],
      });
    }
    if (o.hem === "band" && o.length !== "mini") panels.push({ id: "hemband", label: "Hem band", kind: "hem", d: hemBandD(shape, top, hemY, 28), origin: [CX, hemY - 14] });
    // bodice darts and skirt details
    details.push(...both(fold([M([162, waistY - 2]), L([166, 162])])));
    if (o.silhouette === "full") {
      for (const x of [148, 166, 184]) details.push(...both(gather([M([x, top + 2]), L([x - 4, top + 26])])));
    }
    if (!shape.wavy) details.push(stitch([M([shape.hem[0] + 2, hemY - 8]), Q([150, hemY - 2], [CX, hemY - 2]), Q([250, hemY - 2], [2 * CX - shape.hem[0] - 2, hemY - 8])]));
    if (sleeveless) details.push(...both(stitch([M([S[0] + 6, S[1] + 2]), Q([A[0] + 8, A[1] - 4], [U[0] + 5, U[1] + 6])])));
    return { panels, details };
  },
};

/** Hem band region: the bottom h units of a skirt shape. */
function hemBandD(shape: ReturnType<typeof skirtShape>, top: number, hemY: number, h: number): string {
  const p = shape.sideAt(1 - h / (hemY - top));
  const hemSegs = shape.chain.slice(3); // segments after the side line reach the hem
  const left: Seg[] = [M([CX, p[1] + 6]), Q([150, p[1] + 5], p), L(shape.hem), ...hemSegs];
  return toD(symmetric(left));
}

/* ---------------------------------------------------------------- Skirt */

const skirt: GarmentTemplate = {
  id: "skirt",
  name: "Skirt",
  category: "skirts",
  description: "A waistband skirt in A-line, pencil or full shapes, with optional pockets and button front.",
  views: ["front", "back"],
  options: [
    {
      id: "silhouette",
      label: "Silhouette",
      default: "aline",
      values: [
        { id: "aline", label: "A-line" },
        { id: "pencil", label: "Pencil" },
        { id: "full", label: "Full" },
      ],
    },
    {
      id: "length",
      label: "Length",
      default: "midi",
      values: [
        { id: "mini", label: "Mini" },
        { id: "midi", label: "Midi" },
        { id: "maxi", label: "Maxi" },
      ],
    },
    {
      id: "waistband",
      label: "Waistband",
      default: "standard",
      values: [
        { id: "standard", label: "Standard" },
        { id: "wide", label: "Wide" },
      ],
    },
    {
      id: "pockets",
      label: "Pockets",
      default: "none",
      views: ["front"],
      values: [
        { id: "none", label: "None" },
        { id: "patch", label: "Patch pockets" },
      ],
    },
    {
      id: "front",
      label: "Front",
      default: "plain",
      views: ["front"],
      values: [
        { id: "plain", label: "Plain" },
        { id: "buttons", label: "Button front", requires: { silhouette: ["aline", "pencil"] }, requiresLabel: "Not with gathered full skirts" },
      ],
    },
    {
      id: "hem",
      label: "Hem detail",
      default: "none",
      values: [
        { id: "none", label: "None" },
        { id: "band", label: "Contrast band" },
      ],
    },
  ],
  notes: ["A button front needs a flat front, so it isn't available with the gathered full silhouette."],
  defaults: {
    skirt: { hex: "#C9D3BF", fabricId: "linen" },
    waistband: { hex: "#C9D3BF", fabricId: "linen" },
    hemband: { hex: charcoal, fabricId: "linen" },
    buttons: { hex: ivory, fabricId: "linen" },
  },
  build(o, view) {
    const front = view === "front";
    const wbH = o.waistband === "wide" ? 32 : 18;
    const wy = 58;
    const top = wy + wbH;
    const topHalf = 66;
    const hemY = o.length === "mini" ? 250 : o.length === "maxi" ? 466 : 364;
    const sil = o.silhouette === "pencil" ? "sheath" : o.silhouette;
    const shape = skirtShape(sil, top, topHalf, hemY);
    const panels: BuiltPanel[] = [];
    const details: BuiltDetail[] = [];
    panels.push({ id: "skirt", label: front ? "Skirt front" : "Skirt back", kind: "skirt", d: toD(symmetric(shape.chain)), origin: [CX, (top + hemY) / 2] });
    panels.push({
      id: "waistband",
      label: "Waistband",
      kind: "waistband",
      d: toD([M([CX - topHalf - 1, wy]), Q([CX, wy + 4], [CX + topHalf + 1, wy]), L([CX + topHalf, top]), Q([CX, top + 4], [CX - topHalf, top]), Z]),
      origin: [CX, wy + wbH / 2],
    });
    if (o.hem === "band") panels.push({ id: "hemband", label: "Hem band", kind: "hem", d: hemBandD(shape, top, hemY, o.length === "mini" ? 20 : 30), origin: [CX, hemY - 14] });
    if (front && o.pockets === "patch") {
      const pk = patchPocket(140, top + 26, 36, 40);
      panels.push(...pocketPair(pk, "pocket", "pocket", [158, top + 46]));
      details.push(pocketStitch(140, top + 26, 36, 40), { ...pocketStitch(140, top + 26, 36, 40), d: mirrorD(pocketStitch(140, top + 26, 36, 40).d) });
    }
    if (front && o.front === "buttons" && o.silhouette !== "full") {
      const pts: Pt[] = [];
      for (let y = top + 20; y < hemY - 16; y += 42) pts.push([206, y]);
      details.push(stitch([M([212, top + 2]), L([212, hemY - 4])]));
      panels.push({ id: "buttons", label: "Buttons", kind: "button", d: buttons(pts, 4), origin: [206, 200] });
      details.push(...buttonHoles(pts));
    }
    if (o.silhouette === "full") for (const x of [146, 164, 184]) details.push(...both(gather([M([x, top + 2]), L([x - 4, top + 22])])));
    else details.push(...both(fold([M([164, top]), L([166, top + 40])])));
    if (!front) {
      details.push(seam([M([CX, top]), L([CX, hemY])]), stitch([M([CX + 4, top + 2]), L([CX + 4, top + 84]), L([CX, top + 88])]));
      if (o.silhouette === "pencil") details.push(stitch([M([CX - 4, hemY - 44]), L([CX - 4, hemY])]));
    }
    details.push(stitch([M([CX - topHalf + 2, wy + wbH / 2 + 0.5]), Q([CX, wy + wbH / 2 + 4.5], [CX + topHalf - 2, wy + wbH / 2 + 0.5])]));
    if (!shape.wavy) details.push(stitch([M([shape.hem[0] + 2, hemY - 8]), Q([150, hemY - 1], [CX, hemY - 1]), Q([250, hemY - 1], [2 * CX - shape.hem[0] - 2, hemY - 8])]));
    return { panels, details };
  },
};

/* -------------------------------------------------------------- Trousers */

const trousers: GarmentTemplate = {
  id: "trousers",
  name: "Trousers",
  category: "trousers",
  description: "Waistband trousers with slant pockets. Choose leg shape, length, pleats and turn-ups.",
  views: ["front", "back"],
  options: [
    {
      id: "leg",
      label: "Leg shape",
      default: "wide",
      values: [
        { id: "wide", label: "Wide leg" },
        { id: "straight", label: "Straight" },
        { id: "tapered", label: "Tapered" },
      ],
    },
    {
      id: "length",
      label: "Length",
      default: "full",
      values: [
        { id: "shorts", label: "Shorts" },
        { id: "cropped", label: "Cropped" },
        { id: "full", label: "Full length" },
      ],
    },
    {
      id: "waistband",
      label: "Waistband",
      default: "standard",
      values: [
        { id: "standard", label: "Standard" },
        { id: "elastic", label: "Elasticated" },
      ],
    },
    {
      id: "pleats",
      label: "Pleats",
      default: "none",
      values: [
        { id: "none", label: "Flat front" },
        { id: "pleated", label: "Front pleats", requires: { waistband: ["standard"] }, requiresLabel: "Needs the standard waistband" },
      ],
    },
    {
      id: "pockets",
      label: "Pockets",
      default: "slant",
      values: [
        { id: "slant", label: "Slant pockets" },
        { id: "none", label: "None" },
      ],
    },
    {
      id: "cuffs",
      label: "Hem",
      default: "plain",
      values: [
        { id: "plain", label: "Plain hem" },
        { id: "turnup", label: "Turn-ups", requires: { length: ["cropped", "full"] }, requiresLabel: "Needs cropped or full length" },
      ],
    },
  ],
  notes: ["Pleats sit under a flat waistband, so they aren't offered with the elasticated waist.", "Turn-ups are offered on cropped and full lengths."],
  defaults: {
    legL: { hex: charcoal, fabricId: "denim-light" },
    legR: { hex: charcoal, fabricId: "denim-light" },
    waistband: { hex: charcoal, fabricId: "denim-light" },
    pocketL: { hex: charcoal, fabricId: "denim-light" },
    pocketR: { hex: charcoal, fabricId: "denim-light" },
    cuffL: { hex: charcoal, fabricId: "denim-light" },
    cuffR: { hex: charcoal, fabricId: "denim-light" },
  },
  build(o, view) {
    const front = view === "front";
    const wy = 40;
    const elastic = o.waistband === "elastic";
    const top = elastic ? 66 : 62;
    const hemY = o.length === "shorts" ? 250 : o.length === "cropped" ? 404 : 470;
    const fit = o.leg === "wide" ? { out: 80, inn: 193 } : o.leg === "tapered" ? { out: 126, inn: 175 } : { out: 106, inn: 181 };
    const hip: Pt = [104, 140];
    const crotch: Pt = [198, 206];
    const tOut = (hemY - hip[1]) / (470 - hip[1]);
    const tIn = (hemY - crotch[1]) / (470 - crotch[1]);
    const outHem = lerp(hip, [fit.out, 470], tOut);
    const inHem = lerp(crotch, [fit.inn, 470], tIn);
    const leg: Seg[] = [M([CX, top]), L([122, top]), Q([104, top + 26], hip), L(outHem), L(inHem), L(crotch), Q([CX, 200], [CX, 190]), Z];
    const panels: BuiltPanel[] = [];
    const details: BuiltDetail[] = [];
    panels.push(
      { id: "legL", label: front ? "Left leg" : "Left leg (back)", kind: "leg", d: toD(leg), mirrorGroup: "legs", origin: [150, 260] },
      { id: "legR", label: front ? "Right leg" : "Right leg (back)", kind: "leg", d: toD(mirror(leg)), mirrorGroup: "legs", origin: [250, 260] },
    );
    panels.push({
      id: "waistband",
      label: elastic ? "Elastic waistband" : "Waistband",
      kind: "waistband",
      d: toD([M([121, wy]), Q([CX, wy + 3], [279, wy]), L([278, top]), Q([CX, top + 3], [122, top]), Z]),
      origin: [CX, (wy + top) / 2],
    });
    if (front && o.pockets === "slant") {
      const pk: Seg[] = [M([150, top]), Q([140, top + 40], [105, top + 64]), Q([106, top + 24], [122, top]), Z];
      panels.push(...pocketPair(pk, "pocket", "pocket facing", [126, top + 22]));
      details.push(...both(stitch([M([155, top + 1]), Q([146, top + 44], [106, top + 72])])));
    }
    if (o.cuffs === "turnup" && o.length !== "shorts") {
      const h = 24;
      const oT = lerp(outHem, hip, h / Math.hypot(outHem[0] - hip[0], outHem[1] - hip[1]));
      const iT = lerp(inHem, crotch, h / Math.hypot(inHem[0] - crotch[0], inHem[1] - crotch[1]));
      const cuff: Seg[] = [M(oT), L(outHem), L(inHem), L(iT), Z];
      panels.push(
        { id: "cuffL", label: "Left turn-up", kind: "cuff", d: toD(cuff), mirrorGroup: "cuffs", origin: lerp(outHem, inHem, 0.5) },
        { id: "cuffR", label: "Right turn-up", kind: "cuff", d: toD(mirror(cuff)), mirrorGroup: "cuffs", origin: [2 * CX - lerp(outHem, inHem, 0.5)[0], hemY] },
      );
    } else {
      details.push(...both(stitch([M(lerp(outHem, hip, 0.03)), L(lerp(inHem, crotch, 0.035))])));
    }
    if (front) {
      details.push(stitch([M([212, top + 2]), L([212, 166]), Q([212, 182], [201, 188])]));
      if (o.pleats === "pleated") details.push(...both(fold([M([164, top]), L([166, top + 70])])), ...both(fold([M([176, top]), L([177, top + 44])])));
      else details.push(...both(fold([M([158, top + 14]), L([(outHem[0] + inHem[0]) / 2, hemY - 30])])));
    } else {
      details.push(seam([M([CX, top]), L([CX, 192])]));
      details.push(...both(stitch([M([140, top + 34]), L([176, top + 34])])), ...both(stitch([M([140, top + 40]), L([176, top + 40])])));
      details.push(...both(fold([M([162, top + 2]), L([164, top + 26])])));
    }
    if (elastic) {
      for (let x = 128; x <= 272; x += 9) details.push(gather([M([x, wy + 4]), L([x + 1, top - 3])]));
    } else {
      details.push(stitch([M([124, wy + 11]), Q([CX, wy + 14], [276, wy + 11])]));
      for (const x of [134, 172]) details.push(...both(seam([M([x, wy - 2]), L([x, top + 4])])));
      if (front) panels.push({ id: "buttons", label: "Button", kind: "button", d: buttons([[208, wy + 11]], 3.8), origin: [208, wy + 11] });
    }
    return { panels, details };
  },
};

/* ---------------------------------------------------------------- Jacket */

const jacket: GarmentTemplate = {
  id: "jacket",
  name: "Light jacket",
  category: "jackets",
  description: "A boxy unlined jacket. Choose collar, closure, pocket layout and length.",
  views: ["front"],
  options: [
    {
      id: "collar",
      label: "Collar",
      default: "point",
      values: [
        { id: "point", label: "Shirt collar" },
        { id: "stand", label: "Stand collar" },
        { id: "none", label: "Collarless" },
      ],
    },
    {
      id: "length",
      label: "Length",
      default: "hip",
      values: [
        { id: "cropped", label: "Cropped" },
        { id: "hip", label: "Hip" },
        { id: "long", label: "Long" },
      ],
    },
    {
      id: "closure",
      label: "Closure",
      default: "buttons",
      values: [
        { id: "buttons", label: "Buttons" },
        { id: "zip", label: "Zip" },
      ],
    },
    {
      id: "pockets",
      label: "Pockets",
      default: "two",
      values: [
        { id: "none", label: "None" },
        { id: "two", label: "Two hip pockets" },
        { id: "three", label: "Hip + chest", requires: { length: ["hip", "long"] }, requiresLabel: "Needs hip or long length" },
      ],
    },
    {
      id: "hem",
      label: "Hem",
      default: "plain",
      values: [
        { id: "plain", label: "Plain" },
        { id: "band", label: "Hem band" },
      ],
    },
  ],
  notes: ["The chest pocket needs hip or long length so the pockets don't crowd each other.", "Back view isn't drawn for this template yet."],
  defaults: {
    frontL: { hex: "#C9D3BF", fabricId: "cotton-twill" },
    frontR: { hex: "#C9D3BF", fabricId: "cotton-twill" },
    buttons: { hex: charcoal, fabricId: "cotton-twill" },
  },
  build(o) {
    const hw = 34;
    const y0 = 48;
    const depth = o.collar === "none" ? 34 : 30;
    const hemY = o.length === "cropped" ? 330 : o.length === "long" ? 470 : 410;
    const S: Pt = [104, 76];
    const A: Pt = [114, 126];
    const U: Pt = [96, 178];
    const sideX = o.length === "long" ? 98 : 95;
    const neck = neckline("round", hw, y0, depth);
    const firstHalf = neck.slice(0, 2); // M + first C (left neck point → centre)
    const frontL: Seg[] = [...firstHalf, L([CX, hemY]), L([sideX, hemY]), L(U), Q(A, S), Z];
    const panels: BuiltPanel[] = [];
    const details: BuiltDetail[] = [];
    if (o.collar !== "point") panels.push({ id: "inside", label: "Inside back", kind: "body", d: insideBack(hw, y0, 9, neck), configFrom: "frontL", shade: 0.22, origin: [CX, y0] });
    const sp = sleevePair({ S, U, A }, { O: [38, 394], I: [80, 404], bow: [58, 180], cuff: 28 });
    panels.push(...sp.panels);
    details.push(...sp.details);
    panels.push(
      { id: "frontL", label: "Left front", kind: "body", d: toD(frontL), mirrorGroup: "fronts", origin: [150, 240] },
      { id: "frontR", label: "Right front", kind: "body", d: toD(mirror(frontL)), mirrorGroup: "fronts", origin: [250, 240] },
    );
    const bandH = o.hem === "band" ? 24 : 0;
    if (bandH) {
      panels.push({ id: "hemband", label: "Hem band", kind: "hem", d: toD([M([sideX - 0.4, hemY - bandH]), L([2 * CX - sideX + 0.4, hemY - bandH]), L([2 * CX - sideX, hemY]), L([sideX, hemY]), Z]), origin: [CX, hemY - 12] });
    }
    if (o.pockets !== "none") {
      const py = hemY - bandH - (o.length === "cropped" ? 74 : 92);
      const pk = patchPocket(118, py, 54, 60);
      panels.push(...pocketPair(pk, "pocket", "hip pocket", [145, py + 30]));
      details.push(pocketStitch(118, py, 54, 60), { ...pocketStitch(118, py, 54, 60), d: mirrorD(pocketStitch(118, py, 54, 60).d) });
      if (o.pockets === "three" && o.length !== "cropped") {
        const ck = patchPocket(232, 122, 38, 42);
        panels.push({ id: "chestPocket", label: "Chest pocket", kind: "pocket", d: toD(ck), origin: [251, 143] });
        details.push(pocketStitch(232, 122, 38, 42));
      }
    }
    panels.push(...sp.cuffs);
    if (o.closure === "buttons") {
      const pts: Pt[] = [];
      for (let y = y0 + depth + 16; y < hemY - bandH - 20; y += 56) pts.push([CX, y]);
      if (bandH) pts.push([CX, hemY - bandH / 2]);
      panels.push({ id: "buttons", label: "Buttons", kind: "button", d: buttons(pts, 5), origin: [CX, 200] });
      details.push(...buttonHoles(pts));
      details.push(...both(stitch([M([CX - 9, y0 + depth + 2]), L([CX - 9, hemY - 6])])));
    } else {
      details.push(seam([M([CX, y0 + depth]), L([CX, hemY])]), ...both(stitch([M([CX - 5, y0 + depth + 2]), L([CX - 5, hemY - 4])])));
      panels.push({ id: "buttons", label: "Zip pull", kind: "button", d: toD([M([CX - 3, y0 + depth + 4]), L([CX + 3, y0 + depth + 4]), L([CX + 4, y0 + depth + 22]), Q([CX, y0 + depth + 27], [CX - 4, y0 + depth + 22]), Z]), origin: [CX, y0 + depth + 14] });
    }
    const collar = shirtCollar(o.collar === "stand" ? "stand" : o.collar, "front", true);
    if (o.collar !== "none") panels.push({ id: "collar", label: o.collar === "stand" ? "Stand collar" : "Collar", kind: "collar", d: collar.d, origin: [CX, 64] });
    details.push(...collar.details);
    if (o.collar === "none") details.push(stitch(neckline("round", hw + 7, y0 + 2.5, depth + 7)));
    details.push(stitch([M([sideX + 2, hemY - 8]), L([2 * CX - sideX - 2, hemY - 8])]));
    return { panels, details };
  },
};

export const TEMPLATES: GarmentTemplate[] = [shirt, tee, dress, skirt, trousers, jacket];

export function getTemplate(id: string): GarmentTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export const CATEGORY_LABELS: Record<string, string> = {
  tops: "Tops & shirts",
  tshirts: "T-shirts",
  dresses: "Dresses",
  skirts: "Skirts",
  trousers: "Trousers",
  jackets: "Jackets",
};
