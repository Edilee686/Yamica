import type {
  Collection,
  GarmentDesign,
  Moodboard,
  Palette,
  PanelConfig,
  PresentationSettings,
  Swatch,
  SwatchRole,
} from "./types";
import { uid } from "./ids";
import { CURRENT_SCHEMA } from "./schema";
import { getTemplate } from "@/lib/garments/templates";
import { buildGarment, normaliseOptions, templateDefaultPanel } from "@/lib/garments/resolve";

export function swatch(hex: string, name: string, role: SwatchRole = "none"): Swatch {
  return { id: uid("sw"), hex: hex.toUpperCase(), name, role };
}

export function newPalette(name: string, swatches: Swatch[] = []): Palette {
  return { id: uid("pal"), name, swatches };
}

export function newMoodboard(name = "Moodboard"): Moodboard {
  return { id: uid("mb"), name, layout: "freeform", background: "#FBF8F2", items: [] };
}

export function defaultPresentation(): PresentationSettings {
  return {
    style: "editorial",
    sections: { cover: true, concept: true, moodboard: true, palette: true, materials: true, lineup: true, garments: true, notes: true },
    designer: "",
    credits: "",
    garmentPages: "board",
  };
}

export function newDesign(templateId: string, name?: string, palette?: Palette): GarmentDesign {
  const t = getTemplate(templateId);
  const options = normaliseOptions(t, {});
  const panels: Record<string, PanelConfig> = {};
  const primary = palette?.swatches.find((s) => s.role === "primary") ?? palette?.swatches[0];
  const accent = palette?.swatches.find((s) => s.role === "accent") ?? palette?.swatches[2];
  // Pre-fill every panel the template can produce in any of its views.
  for (const view of t.views) {
    for (const p of buildGarment(t.id, options, view).panels) {
      if (p.configFrom || panels[p.id]) continue;
      const base = templateDefaultPanel(t, p.id);
      if (primary && (p.kind === "body" || p.kind === "sleeve" || p.kind === "leg" || p.kind === "skirt")) {
        base.fill = { type: "solid", color: { hex: primary.hex, swatchId: primary.id } };
      } else if (accent && p.kind === "button") {
        base.fill = { type: "solid", color: { hex: accent.hex, swatchId: accent.id } };
      } else if (primary && p.kind !== "button" && p.kind !== "hem" && p.kind !== "waistband") {
        base.fill = { type: "solid", color: { hex: primary.hex, swatchId: primary.id } };
      }
      panels[p.id] = base;
    }
  }
  const now = Date.now();
  return {
    id: uid("gd"),
    name: name ?? t.name,
    templateId: t.id,
    options,
    view: "front",
    panels,
    mirrorLinks: { sleeves: true, cuffs: true, pockets: true, legs: true, fronts: true },
    notes: "",
    status: "draft",
    onBoard: true,
    createdAt: now,
    updatedAt: now,
  };
}

export interface StarterDef {
  id: string;
  name: string;
  blurb: string;
  keywords: string[];
  season: string;
  target: number;
  palette: [string, string, SwatchRole][];
  templates: string[];
}

export const STARTERS: StarterDef[] = [
  { id: "scratch", name: "Start from scratch", blurb: "A blank studio. Begin with a feeling.", keywords: [], season: "", target: 6, palette: [], templates: [] },
  {
    id: "casual",
    name: "Casual capsule",
    blurb: "Easy pieces that mix and match all week.",
    keywords: ["relaxed", "minimal"],
    season: "All year",
    target: 6,
    palette: [["#F3EEE3", "Ivory", "neutral"], ["#55657E", "Denim", "primary"], ["#C9D3BF", "Pale sage", "secondary"], ["#E9C9C0", "Blush", "accent"]],
    templates: ["tee", "trousers", "shirt"],
  },
  {
    id: "streetwear",
    name: "Streetwear collection",
    blurb: "Graphic, roomy and made for the city.",
    keywords: ["urban", "playful", "experimental"],
    season: "Autumn / Winter",
    target: 8,
    palette: [["#1F1E21", "Ink", "primary"], ["#D9DCDF", "Fog", "neutral"], ["#C9A13B", "Mustard", "accent"], ["#6E7A4E", "Moss", "secondary"]],
    templates: ["tee", "jacket", "trousers"],
  },
  {
    id: "occasion",
    name: "Occasionwear",
    blurb: "Pieces for evenings, ceremonies and celebrations.",
    keywords: ["romantic", "sculptural"],
    season: "Celebrations",
    target: 5,
    palette: [["#6C2B3A", "Wine", "primary"], ["#E9C9C0", "Blush", "secondary"], ["#D9C38F", "Antique gold", "accent"], ["#2B2826", "Ink", "neutral"]],
    templates: ["dress", "skirt"],
  },
  {
    id: "resort",
    name: "Resort collection",
    blurb: "Light layers for sun, sea and slow days.",
    keywords: ["relaxed", "playful"],
    season: "Resort",
    target: 6,
    palette: [["#F6EFD9", "Sand", "neutral"], ["#9FB7CC", "Sky", "primary"], ["#E07A66", "Coral", "accent"], ["#6E8466", "Fern", "secondary"]],
    templates: ["shirt", "skirt", "dress"],
  },
  {
    id: "neutral-essentials",
    name: "Gender-neutral essentials",
    blurb: "Considered basics designed for every body.",
    keywords: ["minimal", "tailored", "relaxed"],
    season: "All year",
    target: 6,
    palette: [["#E6DFD1", "Bone", "neutral"], ["#4E4D4F", "Graphite", "primary"], ["#8C7F72", "Taupe", "secondary"], ["#A9B89E", "Sage", "accent"]],
    templates: ["shirt", "trousers", "jacket"],
  },
];

export function newCollection(starterId = "scratch", name?: string): Collection {
  const st = STARTERS.find((s) => s.id === starterId) ?? STARTERS[0];
  const palette = newPalette("Main palette", st.palette.map(([hex, n, role]) => swatch(hex, n, role)));
  const mb = newMoodboard();
  const now = Date.now();
  return {
    id: uid("col"),
    schemaVersion: CURRENT_SCHEMA,
    name: name?.trim() || (st.id === "scratch" ? "Untitled collection" : st.name),
    starter: st.id,
    createdAt: now,
    updatedAt: now,
    concept: {
      statement: "",
      season: st.season,
      audience: "",
      keywords: [...st.keywords],
      garmentTarget: st.target,
      silhouettes: [],
      materials: [],
    },
    saved: { inspiration: [], uploads: [], fabrics: [], prints: [] },
    moodboards: [mb],
    activeMoodboardId: mb.id,
    palettes: [palette],
    activePaletteId: palette.id,
    designs: [],
    boardOrder: [],
    looks: [],
    notes: "",
    presentation: defaultPresentation(),
    imagePrints: [],
  };
}

/** Deep copy with fresh ids for the collection and everything inside it. */
export function duplicateCollectionData(c: Collection, name: string): Collection {
  const copy: Collection = structuredClone(c);
  const now = Date.now();
  copy.id = uid("col");
  copy.name = name;
  copy.createdAt = now;
  copy.updatedAt = now;
  copy.isSample = false;
  return copy;
}

export function activePalette(c: Collection): Palette {
  return c.palettes.find((p) => p.id === c.activePaletteId) ?? c.palettes[0];
}

export function activeMoodboard(c: Collection): Moodboard {
  return c.moodboards.find((m) => m.id === c.activeMoodboardId) ?? c.moodboards[0];
}

/** Look up a swatch in any palette of the collection. */
export function swatchLookup(c: Collection) {
  const map = new Map<string, string>();
  for (const p of c.palettes) for (const s of p.swatches) map.set(s.id, s.hex);
  return (id: string) => map.get(id);
}
