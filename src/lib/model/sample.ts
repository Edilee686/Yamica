// "Soft City": the complete sample collection that ships with the studio.
import type { Collection, GarmentDesign, MoodItem, PanelConfig, Swatch } from "./types";
import { newCollection, newDesign, swatch } from "./factory";
import { uid } from "./ids";
import { applyLayout } from "@/lib/moodboard/layouts";

export const SAMPLE_ID = "col_softcity";

export function createSoftCity(): Collection {
  const c = newCollection("scratch", "Soft City");
  c.id = SAMPLE_ID;
  c.isSample = true;
  c.starter = "casual";
  const ivory = swatch("#F3EEE3", "Ivory", "neutral");
  const charcoal = swatch("#34312E", "Charcoal", "secondary");
  const sage = swatch("#A9B89E", "Sage", "primary");
  const lilac = swatch("#B9A9C9", "Dusty lilac", "accent");
  const butter = swatch("#EAD89A", "Muted butter", "accent");
  const pal = c.palettes[0];
  pal.name = "Soft City";
  pal.swatches = [ivory, charcoal, sage, lilac, butter];
  c.palettes.push({ id: uid("pal"), name: "Evening alternate", swatches: [swatch("#E6DFD1", "Bone", "neutral"), swatch("#2F3A56", "Navy", "primary"), swatch("#9C7E94", "Mauve", "accent"), swatch("#C9D3BF", "Pale sage", "secondary")] });

  c.concept = {
    statement: "A relaxed urban capsule inspired by pale concrete, botanical forms, and soft morning light.",
    season: "Spring / Summer",
    audience: "City people who like ease, quiet detail and pieces that work together.",
    keywords: ["relaxed", "urban", "minimal", "botanical"],
    garmentTarget: 6,
    silhouettes: ["Relaxed", "Wide-leg", "A-line"],
    materials: ["Cotton", "Linen", "Lightweight denim", "Jersey"],
  };
  c.saved = {
    inspiration: ["arch-concrete-arches", "nature-leaf-shadow", "abs-gradient-dawn", "urban-skyline", "tex-linen", "life-window-light", "urban-windows"],
    uploads: [],
    fabrics: ["cotton-poplin", "linen", "denim-light", "jersey"],
    prints: ["fine-stripe", "botanical-line", "soft-geometry"],
  };

  // Moodboard
  const img = (id: string): MoodItem => ({ id: uid("mi"), type: "image", image: { kind: "library", id }, x: 0, y: 0, w: 300, h: 300, rotation: 0, crop: { zoom: 1, fx: 0, fy: 0 } });
  const items: MoodItem[] = [
    img("nature-leaf-shadow"),
    img("arch-concrete-arches"),
    img("urban-skyline"),
    img("tex-linen"),
    img("life-window-light"),
    { id: uid("mi"), type: "text", text: "Soft City", font: "serif", size: 92, color: "#2B2826", align: "start", x: 0, y: 0, w: 600, h: 110, rotation: 0 },
    { id: uid("mi"), type: "text", text: "Pale concrete, botanical shadows and the first light of the morning.", font: "sans", size: 22, color: "#57514C", align: "start", x: 0, y: 0, w: 270, h: 120, rotation: 0 },
    { id: uid("mi"), type: "text", text: "SPRING / SUMMER", font: "sans", size: 16, color: "#6E5690", align: "start", weight: 600, x: 0, y: 0, w: 270, h: 40, rotation: 0 },
    ...[ivory, charcoal, sage, lilac, butter].map<MoodItem>((s: Swatch) => ({ id: uid("mi"), type: "swatch", hex: s.hex, swatchId: s.id, label: s.name, x: 0, y: 0, w: 60, h: 60, rotation: 0 })),
  ];
  const mb = c.moodboards[0];
  mb.name = "Soft City board";
  mb.layout = "editorial-grid";
  mb.items = applyLayout("editorial-grid", items).items;

  const link = (s: Swatch) => ({ hex: s.hex, swatchId: s.id });
  const solid = (s: Swatch, fabricId: string): PanelConfig => ({ fill: { type: "solid", color: link(s) }, fabricId, outline: true });
  const print = (printId: string, fabricId: string, colors: Record<string, Swatch>, scale = 1, rotation = 0): PanelConfig => ({
    fill: { type: "print", printId, scale, rotation, offsetX: 0, offsetY: 0, colors: Object.fromEntries(Object.entries(colors).map(([k, s]) => [k, link(s)])) },
    fabricId,
    outline: true,
  });
  const set = (d: GarmentDesign, ids: string[], cfg: PanelConfig) => ids.forEach((id) => (d.panels[id] = structuredClone(cfg)));

  // 1. Relaxed shirt in fine stripe cotton
  const shirt = newDesign("shirt", "Relaxed shirt", pal);
  const stripe = print("fine-stripe", "cotton-poplin", { ground: ivory, line: charcoal });
  set(shirt, ["body", "sleeveL", "sleeveR", "placket", "yoke", "pocketL", "pocketR"], stripe);
  set(shirt, ["collar", "cuffL", "cuffR"], solid(ivory, "cotton-poplin"));
  set(shirt, ["buttons"], solid(charcoal, "cotton-poplin"));
  shirt.status = "final";
  shirt.notes = "Fine stripe runs vertically on the body and sleeves. Plain ivory collar and cuffs keep it soft.";

  // 2. Graphic T-shirt
  const tee = newDesign("tee", "Graphic T-shirt", pal);
  tee.options = { ...tee.options, pocket: "chest" };
  set(tee, ["body", "sleeveL", "sleeveR"], solid(ivory, "jersey"));
  set(tee, ["neckband"], solid(charcoal, "jersey"));
  set(tee, ["pocket"], print("soft-geometry", "jersey", { ground: ivory, a: lilac, b: butter, line: charcoal }, 0.7));
  tee.status = "selected";
  tee.notes = "The soft geometry print appears as a small graphic pocket.";

  // 3. Wide-leg trousers in sage linen
  const trousers = newDesign("trousers", "Wide-leg trousers", pal);
  trousers.options = { ...trousers.options, leg: "wide", pleats: "pleated" };
  set(trousers, ["legL", "legR", "waistband", "pocketL", "pocketR", "cuffL", "cuffR"], solid(sage, "linen"));
  set(trousers, ["buttons"], solid(ivory, "linen"));
  trousers.status = "final";

  // 4. A-line skirt in the botanical print
  const skirt = newDesign("skirt", "Botanical A-line skirt", pal);
  set(skirt, ["skirt", "pocketL", "pocketR", "hemband"], print("botanical-line", "linen", { ground: ivory, ink: sage }, 1.1));
  set(skirt, ["waistband"], solid(sage, "linen"));
  skirt.options = { ...skirt.options, pockets: "patch" };
  skirt.status = "selected";

  // 5. Simple dress in lilac jersey
  const dress = newDesign("dress", "Morning dress", pal);
  dress.options = { ...dress.options, sleeve: "short", silhouette: "aline", waist: "band" };
  set(dress, ["bodice", "skirt", "sleeveL", "sleeveR"], solid(lilac, "jersey"));
  set(dress, ["waistband"], solid(butter, "jersey"));
  dress.status = "exploring";

  // 6. Light jacket in denim
  const jacket = newDesign("jacket", "Light jacket", pal);
  set(jacket, ["frontL", "frontR", "sleeveL", "sleeveR", "cuffL", "cuffR", "collar", "hemband"], solid(charcoal, "denim-light"));
  set(jacket, ["pocketL", "pocketR"], print("soft-geometry", "denim-light", { ground: charcoal, a: lilac, b: butter, line: ivory }, 0.8));
  set(jacket, ["buttons"], solid(ivory, "denim-light"));
  jacket.status = "final";

  // A colourway of the tee
  const teeButter = structuredClone(tee);
  teeButter.id = uid("gd");
  teeButter.name = "Graphic T-shirt · butter";
  teeButter.variationOf = tee.id;
  teeButter.variationKind = "colorway";
  set(teeButter, ["body", "sleeveL", "sleeveR"], solid(butter, "jersey"));
  teeButter.status = "exploring";
  teeButter.onBoard = true;

  const designs = [shirt, trousers, jacket, tee, skirt, dress, teeButter];
  const t0 = Date.now() - 1000 * 60 * 60 * 26;
  designs.forEach((d, i) => (d.createdAt = d.updatedAt = t0 + i * 60000));
  c.designs = designs;
  c.boardOrder = designs.map((d) => d.id);
  c.looks = [
    { id: uid("lk"), name: "Morning commute", description: "Striped shirt, sage trousers and the denim jacket.", designIds: [shirt.id, trousers.id, jacket.id] },
    { id: uid("lk"), name: "Courtyard", description: "Graphic tee with the botanical skirt.", designIds: [tee.id, skirt.id] },
    { id: uid("lk"), name: "First light", description: "The lilac dress on its own.", designIds: [dress.id] },
  ];
  c.notes = "Keep the palette quiet. Lilac and butter only appear as accents.";
  c.presentation = { ...c.presentation, designer: "Yamica Studio sample", credits: "Inspiration imagery and prints: original Yamica Studio artwork." };
  c.createdAt = t0;
  c.updatedAt = t0 + 1000 * 60 * 30;
  return c;
}
