// Reusable garment components with fixed attachment points.
import { C, CX, L, M, Pt, Q, Seg, Z, cont, lerp, mirror, qAt, reverse, toD } from "./path";
import type { BuiltDetail, BuiltPanel } from "./types";

/* -------------------------------------------------------------- necklines */

export type NeckStyle = "round" | "v" | "square" | "back" | "high";

/** Neckline from the left neck point to the right neck point (starts with M). */
export function neckline(style: NeckStyle, hw: number, y0: number, depth: number): Seg[] {
  const l: Pt = [CX - hw, y0];
  const rr: Pt = [CX + hw, y0];
  const bottom: Pt = [CX, y0 + depth];
  switch (style) {
    case "v":
      return [M(l), Q([CX - hw * 0.55, y0 + depth * 0.45], bottom), Q([CX + hw * 0.55, y0 + depth * 0.45], rr)];
    case "square":
      return [M(l), L([CX - hw + 3, y0 + depth]), L([CX + hw - 3, y0 + depth]), L(rr)];
    case "round":
    case "back":
    case "high":
    default:
      return [
        M(l),
        C([CX - hw + 3, y0 + depth * 0.72], [CX - hw * 0.52, y0 + depth], bottom),
        C([CX + hw * 0.52, y0 + depth], [CX + hw - 3, y0 + depth * 0.72], rr),
      ];
  }
}

/** A band that follows a neckline (rib or binding). */
export function neckBand(style: NeckStyle, hw: number, y0: number, depth: number, width: number, slope = 0.34): string {
  const inner = neckline(style, hw, y0, depth);
  const outer = neckline(style, hw + width, y0 + width * slope, depth + width * (style === "v" ? 1.4 : 1));
  return toD([...outer, L([CX + hw, y0]), ...cont(reverse(inner)), Z]);
}

/** Inside of the back neck seen through a front neckline. */
export function insideBack(hw: number, y0: number, backDepth: number, frontNeck: Seg[]): string {
  const back = neckline("back", hw, y0, backDepth);
  return toD([...back, ...cont(reverse(frontNeck)), Z]);
}

/* ---------------------------------------------------------------- sleeves */

export interface SleeveFrame {
  S: Pt; // shoulder point
  U: Pt; // underarm point
  A: Pt; // armhole control (shared with the body)
}

export interface SleeveSpec {
  O: Pt; // outer end
  I: Pt; // inner end
  bow: Pt; // control for the outer edge
  cuff?: number; // cuff height
  puff?: boolean;
  band?: number; // narrow band at the end (puff)
  hemStitch?: boolean;
}

export interface BuiltSleeve {
  sleeve: Seg[];
  cuff?: Seg[];
  details: BuiltDetail[];
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Left sleeve on the viewer's left. Use mirrorSleeve for the right. */
export function buildSleeve(f: SleeveFrame, s: SleeveSpec): BuiltSleeve {
  const { S, U, A } = f;
  const details: BuiltDetail[] = [];
  let sleeve: Seg[];
  if (s.puff) {
    const b1: Pt = [S[0] - 40, S[1] - 18];
    const b2: Pt = [s.O[0] - 22, s.O[1] - 30];
    sleeve = [M(S), C(b1, b2, s.O), L(s.I), Q([s.I[0] + 16, s.I[1] - 14], U), Q(A, S), Z];
    // gathers at the sleeve head and above the band
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const p = lerp(S, U, t * 0.7);
      details.push({ kind: "gather", d: toD([M([p[0] - 3, p[1] + 2]), Q([p[0] - 10, p[1] - 4], [p[0] - 18, p[1] + 2])]) });
    }
  } else {
    sleeve = [M(S), Q(s.bow, s.O), L(s.I), L(U), Q(A, S), Z];
  }
  let cuff: Seg[] | undefined;
  const h = s.cuff ?? s.band;
  if (h) {
    let topO: Pt;
    if (s.puff) topO = lerp(s.O, [s.O[0] + 8, s.O[1] - 30], h / 30);
    else topO = qAt(S, s.bow, s.O, 1 - h / dist(S, s.O));
    const topI = lerp(s.I, U, h / dist(s.I, U));
    cuff = [M(topO), L(s.O), L(s.I), L(topI), Z];
    if (s.cuff && !s.puff) {
      // cuff placket opening
      const p = lerp(topO, topI, 0.3);
      details.push({ kind: "seam", d: toD([M(p), L(lerp(p, lerp(S, U, 0.5), 0.16))]) });
    }
  } else if (s.hemStitch) {
    const a = qAt(S, s.bow, s.O, 1 - 8 / dist(S, s.O));
    const b = lerp(s.I, U, 8 / dist(s.I, U));
    details.push({ kind: "stitch", d: toD([M(a), L(b)]) });
  }
  return { sleeve, cuff, details };
}

/** Build both sleeves with mirrored geometry. */
export function sleevePair(
  f: SleeveFrame,
  s: SleeveSpec,
  labels = { sleeve: "sleeve", cuff: "cuff" },
): { panels: BuiltPanel[]; cuffs: BuiltPanel[]; details: BuiltDetail[] } {
  const left = buildSleeve(f, s);
  const rightSleeve = mirror(left.sleeve);
  const rightCuff = left.cuff ? mirror(left.cuff) : undefined;
  const originL = lerp(f.S, s.O, 0.5);
  const originR: Pt = [2 * CX - originL[0], originL[1]];
  const panels: BuiltPanel[] = [
    { id: "sleeveL", label: `Left ${labels.sleeve}`, kind: "sleeve", d: toD(left.sleeve), mirrorGroup: "sleeves", origin: originL },
    { id: "sleeveR", label: `Right ${labels.sleeve}`, kind: "sleeve", d: toD(rightSleeve), mirrorGroup: "sleeves", origin: originR },
  ];
  const cuffs: BuiltPanel[] = [];
  if (left.cuff && rightCuff) {
    const o = lerp(s.O, s.I, 0.5);
    cuffs.push(
      { id: "cuffL", label: `Left ${labels.cuff}`, kind: "cuff", d: toD(left.cuff), mirrorGroup: "cuffs", origin: o },
      { id: "cuffR", label: `Right ${labels.cuff}`, kind: "cuff", d: toD(rightCuff), mirrorGroup: "cuffs", origin: [2 * CX - o[0], o[1]] },
    );
  }
  return { panels, cuffs, details: left.details.concat(mirrorDetailSegs(left.details)) };
}

/* ------------------------------------------------------------ detail utils */

/** Mirror a detail path string (only absolute M/L/Q/C commands, as produced by toD). */
export function mirrorD(d: string): string {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+/g) ?? [];
  const out: string[] = [];
  let idx = 0;
  let cmd = "";
  let coordIndex = 0;
  while (idx < tokens.length) {
    const t = tokens[idx++];
    if (/[MLQCZ]/.test(t)) {
      cmd = t;
      coordIndex = 0;
      out.push(t);
      continue;
    }
    const n = parseFloat(t);
    if (cmd === "Z") continue;
    out.push(String(coordIndex % 2 === 0 ? Math.round((2 * CX - n) * 100) / 100 : n));
    coordIndex++;
  }
  return out.join(" ").replace(/ ([MLQCZ])/g, "$1").replace(/([MLQCZ]) /g, "$1");
}

export function mirrorDetailSegs(ds: BuiltDetail[]): BuiltDetail[] {
  return ds.map((d) => ({ ...d, d: mirrorD(d.d) }));
}

export function stitchLine(pts: Pt[]): BuiltDetail {
  return { kind: "stitch", d: toD([M(pts[0]), ...pts.slice(1).map(L)]) };
}

export function seamLine(segs: Seg[]): BuiltDetail {
  return { kind: "seam", d: toD(segs) };
}

export function buttons(points: Pt[], radius = 4.2): string {
  return points
    .map(([x, y]) => `M${x - radius} ${y} a${radius} ${radius} 0 1 0 ${radius * 2} 0 a${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`)
    .join(" ");
}

export function buttonHoles(points: Pt[]): BuiltDetail[] {
  return points.map(([x, y]) => ({ kind: "hole" as const, d: `M${x - 1.4} ${y - 1.2} h0.01 M${x + 1.4} ${y - 1.2} h0.01 M${x - 1.4} ${y + 1.4} h0.01 M${x + 1.4} ${y + 1.4} h0.01` }));
}

/** Rounded patch pocket on the left; returns path segments. */
export function patchPocket(x: number, y: number, w: number, h: number, pointed = false): Seg[] {
  if (pointed) {
    return [M([x, y]), L([x + w, y]), L([x + w, y + h - 8]), L([x + w / 2, y + h]), L([x, y + h - 8]), Z];
  }
  const rr = Math.min(8, w / 4);
  return [M([x, y]), L([x + w, y]), L([x + w, y + h - rr]), Q([x + w, y + h], [x + w - rr, y + h]), L([x + rr, y + h]), Q([x, y + h], [x, y + h - rr]), Z];
}

export function pocketStitch(x: number, y: number, w: number, h: number): BuiltDetail {
  const i = 3.5;
  return { kind: "stitch", d: toD([M([x + i, y + 9]), L([x + w - i, y + 9])]) + " " + toD([M([x + i, y + 1]), L([x + i, y + h - 9]), Q([x + i, y + h - i], [x + 9, y + h - i]), L([x + w - 9, y + h - i]), Q([x + w - i, y + h - i], [x + w - i, y + h - 9]), L([x + w - i, y + 1])]) };
}
