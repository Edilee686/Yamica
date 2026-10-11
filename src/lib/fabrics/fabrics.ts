// Fabric references and surface textures.
//
// Fabric type (what it is), surface texture (how it looks) and print (pattern on
// top) are separate: a panel can be linen + slub texture + botanical print. The
// properties here are general material references, not specifications of a
// purchasable textile.

import type { FabricReference, SurfaceTexture } from "@/lib/model/types";

export const TEXTURES: SurfaceTexture[] = [
  { id: "smooth", name: "Smooth weave", description: "A fine, even plain weave." },
  { id: "twill", name: "Diagonal twill", description: "Fine diagonal ribs, like denim or chino." },
  { id: "slub", name: "Slub", description: "Irregular thick-and-thin yarns, typical of linen." },
  { id: "knit", name: "Jersey knit", description: "Tiny interlocking knit loops." },
  { id: "sheen", name: "Satin sheen", description: "A soft light reflection across the surface." },
  { id: "brushed", name: "Brushed", description: "A soft, slightly fuzzy face, like flannel." },
  { id: "mesh", name: "Open mesh", description: "An open grid of small holes." },
  { id: "rib", name: "Corded rib", description: "Raised vertical wales, like corduroy." },
  { id: "crepe", name: "Crepe grain", description: "A fine pebbly grain." },
];

export const FABRICS: FabricReference[] = [
  {
    id: "cotton-poplin",
    name: "Cotton poplin",
    summary: "Crisp, smooth and breathable. A shirting staple.",
    weight: "light",
    drape: "crisp",
    stretch: "none",
    opacity: "opaque",
    uses: ["Shirts", "Dresses", "Summer trousers"],
    textureId: "smooth",
    swatchColor: "#F3EEE3",
  },
  {
    id: "cotton-twill",
    name: "Cotton twill",
    summary: "Sturdy and soft with a diagonal weave. Ideal for workwear shapes.",
    weight: "medium",
    drape: "structured",
    stretch: "none",
    opacity: "opaque",
    uses: ["Jackets", "Trousers", "Skirts"],
    textureId: "twill",
    swatchColor: "#C9D3BF",
  },
  {
    id: "linen",
    name: "Linen",
    summary: "Cool and textured with natural slubs. Creases beautifully.",
    weight: "light-medium",
    drape: "soft",
    stretch: "none",
    opacity: "semi-sheer",
    uses: ["Shirts", "Trousers", "Resortwear"],
    textureId: "slub",
    swatchColor: "#E4DCCB",
  },
  {
    id: "denim-light",
    name: "Lightweight denim",
    summary: "A softer denim with classic twill character.",
    weight: "medium",
    drape: "structured",
    stretch: "slight",
    opacity: "opaque",
    uses: ["Jackets", "Trousers", "Shirts", "Skirts"],
    textureId: "twill",
    swatchColor: "#6F7F97",
  },
  {
    id: "jersey",
    name: "Cotton jersey",
    summary: "Soft single knit with natural stretch.",
    weight: "light",
    drape: "fluid",
    stretch: "moderate",
    opacity: "opaque",
    uses: ["T-shirts", "Dresses", "Loungewear"],
    textureId: "knit",
    swatchColor: "#ECE6DA",
  },
  {
    id: "satin",
    name: "Satin",
    summary: "Smooth with a liquid sheen. Catches the light.",
    weight: "light",
    drape: "very fluid",
    stretch: "none",
    opacity: "opaque",
    uses: ["Occasion dresses", "Skirts", "Blouses"],
    textureId: "sheen",
    swatchColor: "#B9A9C9",
  },
  {
    id: "wool-flannel",
    name: "Wool flannel",
    summary: "Warm, brushed and gently structured.",
    weight: "medium-heavy",
    drape: "soft",
    stretch: "none",
    opacity: "opaque",
    uses: ["Tailoring", "Trousers", "Skirts"],
    textureId: "brushed",
    swatchColor: "#8E8A85",
  },
  {
    id: "mesh",
    name: "Sport mesh",
    summary: "Open and airy with a technical feel.",
    weight: "light",
    drape: "soft",
    stretch: "moderate",
    opacity: "semi-sheer",
    uses: ["Layering tops", "Streetwear", "Linings"],
    textureId: "mesh",
    swatchColor: "#D9D6D0",
  },
  {
    id: "corduroy",
    name: "Corduroy",
    summary: "Velvety vertical wales with a retro warmth.",
    weight: "medium-heavy",
    drape: "structured",
    stretch: "slight",
    opacity: "opaque",
    uses: ["Trousers", "Jackets", "Skirts"],
    textureId: "rib",
    swatchColor: "#B48A64",
  },
  {
    id: "crepe",
    name: "Crepe",
    summary: "Matte and pebbly with a graceful drape.",
    weight: "light-medium",
    drape: "fluid",
    stretch: "slight",
    opacity: "opaque",
    uses: ["Dresses", "Blouses", "Wide trousers"],
    textureId: "crepe",
    swatchColor: "#34312E",
  },
];

export function getFabric(id?: string) {
  return FABRICS.find((f) => f.id === id);
}

export const WEIGHT_LABELS: Record<string, string> = {
  sheer: "Sheer",
  light: "Light",
  "light-medium": "Light–medium",
  medium: "Medium",
  "medium-heavy": "Medium–heavy",
  heavy: "Heavy",
};

/**
 * Texture overlay tile (white highlights + dark lowlights at low opacity) so it
 * reads on any colour or print. Returns null for gradient-based textures.
 */
export function textureTile(id: string): { w: number; h: number; body: string } | null {
  const D = "#000";
  const W = "#fff";
  switch (id) {
    case "smooth":
      return { w: 4, h: 4, body: `<rect x="0" y="0" width="2" height="2" fill="${D}" opacity=".035"/><rect x="2" y="2" width="2" height="2" fill="${D}" opacity=".035"/>` };
    case "twill":
      return {
        w: 6,
        h: 6,
        body: `<path d="M-1.5 1.5 L1.5 -1.5 M0 6 L6 0 M4.5 7.5 L7.5 4.5" stroke="${D}" stroke-width="1.1" opacity=".13"/><path d="M-1.5 4.5 L4.5 -1.5 M1.5 7.5 L7.5 1.5" stroke="${W}" stroke-width=".7" opacity=".14"/>`,
      };
    case "slub":
      return {
        w: 40,
        h: 12,
        body: `<path d="M0 2.5 H14 M20 2.6 H40 M0 6.5 H8 M12 6.4 H31 M34 6.5 H40 M0 10 H22 M26 10.1 H40" stroke="${D}" stroke-width=".6" opacity=".09"/><path d="M3 2.5 H10 M24 6.4 H30 M6 10 H12" stroke="${D}" stroke-width="1.5" opacity=".07"/><path d="M15 4.4 H24 M2 8.4 H9 M30 8.4 H38" stroke="${W}" stroke-width=".8" opacity=".2"/>`,
      };
    case "knit":
      return { w: 5, h: 5, body: `<path d="M0 0.5 L1.25 4 L2.5 0.5 M2.5 0.5 L3.75 4 L5 0.5" fill="none" stroke="${D}" stroke-width=".5" opacity=".1"/>` };
    case "brushed":
      return {
        w: 18,
        h: 18,
        body: `<path d="M1 2 l3 1 M8 5 l3 -1 M14 9 l3 1 M3 12 l3 -1 M11 15 l3 1 M6 8 l2 1 M15 2 l2 1" stroke="${W}" stroke-width=".9" opacity=".2" stroke-linecap="round"/><path d="M4 4 l2 1 M12 11 l3 -1 M1 16 l3 1 M9 1 l2 1" stroke="${D}" stroke-width=".8" opacity=".1" stroke-linecap="round"/>`,
      };
    case "mesh":
      return { w: 6, h: 6, body: `<circle cx="3" cy="3" r="1.25" fill="${D}" opacity=".22"/><circle cx="3" cy="3.4" r="1.25" fill="${W}" opacity=".08"/>` };
    case "rib":
      return { w: 6, h: 10, body: `<rect x="0" y="0" width="1.5" height="10" fill="${D}" opacity=".16"/><rect x="3" y="0" width="1.4" height="10" fill="${W}" opacity=".16"/>` };
    case "crepe":
      return {
        w: 9,
        h: 9,
        body: `<circle cx="1" cy="2" r=".6" fill="${D}" opacity=".12"/><circle cx="5" cy="1" r=".5" fill="${W}" opacity=".2"/><circle cx="7.5" cy="5" r=".6" fill="${D}" opacity=".12"/><circle cx="3" cy="6.5" r=".55" fill="${W}" opacity=".18"/><circle cx="6" cy="8" r=".45" fill="${D}" opacity=".1"/>`,
      };
    default:
      return null;
  }
}
