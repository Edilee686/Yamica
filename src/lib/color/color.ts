export type RGB = [number, number, number];

export function normaliseHex(input: string): string | null {
  let h = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return "#" + h.toUpperCase();
}

export function hexToRgb(hex: string): RGB {
  const h = (normaliseHex(hex) ?? "#000000").slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function lin(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text colour that stays readable on top of a swatch. */
export function inkOn(hex: string) {
  return contrast(hex, "#2B2826") >= contrast(hex, "#FFFDF9") ? "#2B2826" : "#FFFDF9";
}

export function rgbToLab([r, g, b]: RGB): [number, number, number] {
  const R = lin(r), G = lin(g), B = lin(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function deltaE(a: string, b: string) {
  const A = rgbToLab(hexToRgb(a));
  const B = rgbToLab(hexToRgb(b));
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

// A small, fashion-flavoured naming vocabulary. Names are suggestions the user can edit.
const NAMES: [string, string][] = [
  ["Ivory", "#F3EEE3"], ["Chalk", "#FAF8F3"], ["Bone", "#E6DFD1"], ["Oat", "#DCCFB8"], ["Sand", "#D6C2A0"], ["Stone", "#BDB5A8"],
  ["Pale concrete", "#CFCAC2"], ["Fog", "#D9DCDF"], ["Pebble", "#9E978D"], ["Taupe", "#8C7F72"], ["Mushroom", "#A99B8C"],
  ["Charcoal", "#34312E"], ["Ink", "#1F1E21"], ["Graphite", "#4E4D4F"], ["Slate", "#5E6670"], ["Navy", "#2F3A56"], ["Denim", "#55657E"],
  ["Powder blue", "#B8C7D6"], ["Sky", "#9FB7CC"], ["Sea glass", "#B9C9C1"], ["Teal", "#3F6E6E"],
  ["Sage", "#A9B89E"], ["Pale sage", "#C9D3BF"], ["Moss", "#6E7A4E"], ["Olive", "#7C7A4A"], ["Fern", "#6E8466"], ["Forest", "#2F4A3A"],
  ["Butter", "#EFD98F"], ["Pale butter", "#F3E5B5"], ["Mustard", "#C9A13B"], ["Honey", "#D9A35B"], ["Ochre", "#C38A3C"],
  ["Apricot", "#E9B28A"], ["Terracotta", "#C26D4E"], ["Rust", "#A2502F"], ["Clay", "#B98067"], ["Caramel", "#B48A64"], ["Cocoa", "#6B4A3A"],
  ["Blush", "#E9C9C0"], ["Rose", "#D9A3A0"], ["Dusty pink", "#C98E8A"], ["Coral", "#E07A66"], ["Cherry", "#A1303A"], ["Wine", "#6C2B3A"],
  ["Lilac", "#B9A9C9"], ["Dusty lilac", "#A893C4"], ["Lavender", "#C9BFE0"], ["Mauve", "#9C7E94"], ["Plum", "#5E3E5E"], ["Violet", "#6E5690"],
];

export function nameColor(hex: string): string {
  let best = NAMES[0][0];
  let d = Infinity;
  for (const [n, h] of NAMES) {
    const e = deltaE(hex, h);
    if (e < d) (d = e), (best = n);
  }
  return best;
}

export function familyOf(hex: string): string {
  const [L, a, b] = rgbToLab(hexToRgb(hex));
  const chroma = Math.hypot(a, b);
  if (L < 25) return "dark";
  if (chroma < 10) return "neutral";
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  if (hue > -30 && hue < 30) return "pink";
  if (hue >= 30 && hue < 70) return "warm";
  if (hue >= 70 && hue < 105) return "yellow";
  if (hue >= 105 && hue < 180) return "green";
  if (hue < -30 && hue > -100) return "purple";
  return "blue";
}
