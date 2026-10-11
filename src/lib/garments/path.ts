// Tiny vector path toolkit for garment geometry.
//
// Garments are authored as point lists on the viewer's left side of a 400×500
// artboard (centre line x = 200) and mirrored for the right side, so seams and
// attachment points always line up.

export type Pt = [number, number];

export type Seg =
  | { c: "M"; p: Pt }
  | { c: "L"; p: Pt }
  | { c: "Q"; q: Pt; p: Pt }
  | { c: "C"; a: Pt; b: Pt; p: Pt }
  | { c: "Z" };

export const CX = 200;

const r = (n: number) => Math.round(n * 100) / 100;

export function toD(segs: Seg[]): string {
  return segs
    .map((s) => {
      switch (s.c) {
        case "M":
        case "L":
          return `${s.c}${r(s.p[0])} ${r(s.p[1])}`;
        case "Q":
          return `Q${r(s.q[0])} ${r(s.q[1])} ${r(s.p[0])} ${r(s.p[1])}`;
        case "C":
          return `C${r(s.a[0])} ${r(s.a[1])} ${r(s.b[0])} ${r(s.b[1])} ${r(s.p[0])} ${r(s.p[1])}`;
        case "Z":
          return "Z";
      }
    })
    .join(" ");
}

export const mx = (p: Pt): Pt => [2 * CX - p[0], p[1]];

export function mirror(segs: Seg[]): Seg[] {
  return segs.map((s) => {
    switch (s.c) {
      case "M":
      case "L":
        return { c: s.c, p: mx(s.p) };
      case "Q":
        return { c: "Q", q: mx(s.q), p: mx(s.p) };
      case "C":
        return { c: "C", a: mx(s.a), b: mx(s.b), p: mx(s.p) };
      default:
        return s;
    }
  });
}

/** Reverse an open path that starts with M. */
export function reverse(segs: Seg[]): Seg[] {
  const pts: Pt[] = [];
  const draw = segs.filter((s) => s.c !== "Z");
  for (const s of draw) pts.push((s as Exclude<Seg, { c: "Z" }>).p);
  const out: Seg[] = [{ c: "M", p: pts[pts.length - 1] }];
  for (let i = draw.length - 1; i >= 1; i--) {
    const s = draw[i];
    const prev = pts[i - 1];
    if (s.c === "L") out.push({ c: "L", p: prev });
    else if (s.c === "Q") out.push({ c: "Q", q: s.q, p: prev });
    else if (s.c === "C") out.push({ c: "C", a: s.b, b: s.a, p: prev });
  }
  return out;
}

/** Drop the leading M so a path can continue another one. */
export const cont = (segs: Seg[]): Seg[] => segs.slice(1);

export const M = (p: Pt): Seg => ({ c: "M", p });
export const L = (p: Pt): Seg => ({ c: "L", p });
export const Q = (q: Pt, p: Pt): Seg => ({ c: "Q", q, p });
export const C = (a: Pt, b: Pt, p: Pt): Seg => ({ c: "C", a, b, p });
export const Z: Seg = { c: "Z" };

export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function qAt(p0: Pt, q: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * q[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * q[1] + t * t * p1[1]];
}

/** Split a quadratic curve at t, returning the control points of both halves. */
export function qSplit(p0: Pt, q: Pt, p1: Pt, t: number) {
  const a = lerp(p0, q, t);
  const b = lerp(q, p1, t);
  const m = lerp(a, b, t);
  return { first: { q: a, p: m }, second: { q: b, p: p1 }, mid: m };
}

export function polygon(pts: Pt[]): string {
  return toD([M(pts[0]), ...pts.slice(1).map(L), Z]);
}

/** Closed shape from left-half segments + its mirror, joined at the centre line. */
export function symmetric(leftFromCentreTop: Seg[]): Seg[] {
  // leftFromCentreTop runs from a point on the centre line, around the left side,
  // to another point on the centre line. The mirror runs back.
  const right = reverse(mirror(leftFromCentreTop));
  return [...leftFromCentreTop, ...cont(right), Z];
}

export function circleD(cx: number, cy: number, rad: number): string {
  return `M${r(cx - rad)} ${r(cy)} a${r(rad)} ${r(rad)} 0 1 0 ${r(rad * 2)} 0 a${r(rad)} ${r(rad)} 0 1 0 ${r(-rad * 2)} 0 Z`;
}

/** Offset a straight segment a→b by distance d (positive = left of direction). */
export function offsetLine(a: Pt, b: Pt, d: number): [Pt, Pt] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * d;
  const ny = (dx / len) * d;
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
  ];
}

/** Bounding box of a set of points (used for print origins). */
export function bbox(pts: Pt[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export function segPoints(segs: Seg[]): Pt[] {
  const out: Pt[] = [];
  for (const s of segs) {
    if (s.c === "Z") continue;
    out.push(s.p);
    if (s.c === "Q") out.push(s.q);
  }
  return out;
}
