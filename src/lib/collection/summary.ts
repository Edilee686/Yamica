import type { Collection, GarmentDesign } from "@/lib/model/types";
import { getTemplate, CATEGORY_LABELS } from "@/lib/garments/templates";
import { buildGarment, resolveColor, resolvePanelConfig } from "@/lib/garments/resolve";
import { activePalette, swatchLookup } from "@/lib/model/factory";
import { getVectorPrint, resolvePrintColors } from "@/lib/prints/prints";
import { getFabric } from "@/lib/fabrics/fabrics";
import { deltaE, luminance, nameColor } from "@/lib/color/color";

/** Designs on the collection board, in board order. */
export function lineup(c: Collection): GarmentDesign[] {
  const byId = new Map(c.designs.map((d) => [d.id, d]));
  const out: GarmentDesign[] = [];
  const seen = new Set<string>();
  for (const id of c.boardOrder) {
    const d = byId.get(id);
    if (d?.onBoard && !seen.has(id)) (out.push(d), seen.add(id));
  }
  for (const d of c.designs) if (d.onBoard && !seen.has(d.id)) out.push(d);
  return out;
}

/** Rough visual area of an SVG path, from its bounding box. */
function pathArea(d: string) {
  const n = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  if (n.length < 4) return 0;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
    y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
  }
  return Math.max(0, (x1 - x0) * (y1 - y0));
}

export interface DesignMaterials {
  colors: Map<string, number>; // hex -> weight
  prints: Set<string>;
  fabrics: Set<string>;
}

/** Colours (weighted by visible area), prints and fabrics a design uses on its front view. */
export function designMaterials(c: Collection, d: GarmentDesign): DesignMaterials {
  const lookup = swatchLookup(c);
  const colors = new Map<string, number>();
  const prints = new Set<string>();
  const fabrics = new Set<string>();
  const add = (hex: string, w: number) => colors.set(hex.toLowerCase(), (colors.get(hex.toLowerCase()) ?? 0) + w);
  const built = buildGarment(d.templateId, d.options, "front");
  for (const p of built.panels) {
    if (p.shade) continue;
    const cfg = resolvePanelConfig(d, p.id, p.configFrom);
    const w = pathArea(p.d);
    if (cfg.fabricId) fabrics.add(cfg.fabricId);
    if (cfg.fill.type === "solid") add(resolveColor(cfg.fill.color, lookup), w);
    else {
      prints.add(cfg.fill.printId);
      const vp = getVectorPrint(cfg.fill.printId);
      if (vp) {
        const over: Record<string, { hex: string }> = {};
        for (const [k, v] of Object.entries(cfg.fill.colors)) over[k] = { hex: resolveColor(v, lookup) };
        const resolved = resolvePrintColors(vp, over);
        const cols = vp.slots.map((sl) => resolved[sl.key]).filter(Boolean);
        // the ground carries most of the visible area
        cols.forEach((hex, i) => add(hex, i === 0 ? w * 0.65 : (w * 0.35) / Math.max(1, cols.length - 1)));
      }
    }
  }
  return { colors, prints, fabrics };
}

export interface CollectionSummary {
  count: number;
  categories: { id: string; label: string; count: number }[];
  colors: { hex: string; name: string; share: number; inPalette: boolean }[];
  fabrics: { id: string; name: string; count: number }[];
  prints: { id: string; name: string; count: number }[];
  statuses: Record<GarmentDesign["status"], number>;
}

export function summarise(c: Collection, designs = lineup(c)): CollectionSummary {
  const palette = activePalette(c).swatches;
  const cats = new Map<string, number>();
  const colorW = new Map<string, number>();
  const fab = new Map<string, number>();
  const pr = new Map<string, number>();
  const statuses = { draft: 0, exploring: 0, selected: 0, final: 0 };
  for (const d of designs) {
    const cat = getTemplate(d.templateId).category;
    cats.set(cat, (cats.get(cat) ?? 0) + 1);
    statuses[d.status]++;
    const m = designMaterials(c, d);
    const total = [...m.colors.values()].reduce((a, b) => a + b, 0) || 1;
    // merge near-identical colours so tiny hex differences don't split the count
    for (const [hex, w] of m.colors) {
      const near = [...colorW.keys()].find((k) => deltaE(k, hex) < 4);
      colorW.set(near ?? hex, (colorW.get(near ?? hex) ?? 0) + w / total);
    }
    for (const f of m.fabrics) fab.set(f, (fab.get(f) ?? 0) + 1);
    for (const p of m.prints) pr.set(p, (pr.get(p) ?? 0) + 1);
  }
  const totalW = [...colorW.values()].reduce((a, b) => a + b, 0) || 1;
  const swName = (hex: string) => palette.find((s) => deltaE(s.hex, hex) < 6)?.name;
  return {
    count: designs.length,
    categories: [...cats].map(([id, count]) => ({ id, label: CATEGORY_LABELS[id as keyof typeof CATEGORY_LABELS] ?? id, count })).sort((a, b) => b.count - a.count),
    colors: [...colorW]
      .map(([hex, w]) => ({ hex, name: swName(hex) ?? nameColor(hex), share: w / totalW, inPalette: !!swName(hex) }))
      .sort((a, b) => b.share - a.share),
    fabrics: [...fab].map(([id, count]) => ({ id, name: getFabric(id)?.name ?? id, count })).sort((a, b) => b.count - a.count),
    prints: [...pr]
      .map(([id, count]) => ({ id, name: getVectorPrint(id)?.name ?? c.imagePrints.find((p) => p.id === id)?.name ?? "Image print", count }))
      .sort((a, b) => b.count - a.count),
    statuses,
  };
}

export interface CohesionNote {
  id: string;
  tone: "info" | "nudge";
  text: string;
  designIds?: string[];
}

const BOTTOMS = new Set(["trousers", "skirts"]);
const TOPS = new Set(["tops", "tshirts"]);

/** Rule-based observations about the line-up. Worded as observations, not verdicts. */
export function cohesionNotes(c: Collection): CohesionNote[] {
  const designs = lineup(c);
  const notes: CohesionNote[] = [];
  if (designs.length === 0) return [{ id: "empty", tone: "nudge", text: "Add designs to the line-up to see how they work together." }];
  const s = summarise(c, designs);
  const palette = activePalette(c).swatches;

  // colours outside the palette
  const off = designs.filter((d) => {
    const m = designMaterials(c, d);
    const tot = [...m.colors.values()].reduce((a, b) => a + b, 0) || 1;
    const offW = [...m.colors].filter(([hex]) => !palette.some((p) => deltaE(p.hex, hex) < 8)).reduce((a, [, w]) => a + w, 0);
    return offW / tot > 0.25;
  });
  if (off.length && palette.length)
    notes.push({ id: "off-palette", tone: "nudge", text: `${off.length === 1 ? off[0].name : `${off.length} pieces`} ${off.length === 1 ? "leans" : "lean"} on colours that aren't in your palette.`, designIds: off.map((d) => d.id) });

  // palette colours that barely appear
  for (const sw of palette) {
    const uses = designs.filter((d) => [...designMaterials(c, d).colors.keys()].some((hex) => deltaE(hex, sw.hex) < 6));
    if (uses.length === 0) notes.push({ id: `unused-${sw.id}`, tone: "info", text: `${sw.name} is in your palette but doesn't appear in any piece yet.` });
    else if (uses.length === 1 && designs.length >= 4) notes.push({ id: `once-${sw.id}`, tone: "info", text: `${sw.name} appears in only one piece (${uses[0].name}). Repeating it once more can help it read as intentional.`, designIds: [uses[0].id] });
  }

  // dominant colour
  if (s.colors[0] && s.colors[0].share > 0.6 && designs.length >= 3) notes.push({ id: "dominant", tone: "info", text: `${s.colors[0].name} covers about ${Math.round(s.colors[0].share * 100)}% of the line-up.` });

  // prints
  if (s.prints.length === 0 && designs.length >= 3) notes.push({ id: "no-prints", tone: "info", text: "Every piece is a solid colour. That reads calm and clean; a print on one piece would add a focal point." });
  if (s.prints.length >= 4) notes.push({ id: "many-prints", tone: "nudge", text: `The line-up uses ${s.prints.length} different prints. Repeating one or two across pieces tends to tie looks together.` });
  if (s.prints.length >= 1 && s.prints.every((p) => p.count === 1) && designs.length >= 4) notes.push({ id: "print-once", tone: "info", text: "Each print appears on a single piece only." });

  // category balance
  const has = (set: Set<string>) => s.categories.filter((x) => set.has(x.id)).reduce((a, x) => a + x.count, 0);
  const tops = has(TOPS), bottoms = has(BOTTOMS);
  if (tops >= 2 && bottoms === 0) notes.push({ id: "no-bottoms", tone: "nudge", text: `There are ${tops} tops and no trousers or skirts yet, so tops have nothing to pair with.` });
  if (bottoms >= 2 && tops === 0) notes.push({ id: "no-tops", tone: "nudge", text: `There are ${bottoms} bottoms and no tops yet.` });

  // light / dark balance
  const lum = s.colors.reduce((a, x) => a + luminance(x.hex) * x.share, 0);
  if (designs.length >= 3 && lum > 0.72) notes.push({ id: "light", tone: "info", text: "The line-up is mostly light tones. A darker piece would give the eye somewhere to rest." });
  if (designs.length >= 3 && lum < 0.12) notes.push({ id: "dark", tone: "info", text: "The line-up is mostly dark tones." });

  // fabrics
  if (s.fabrics.length > 5) notes.push({ id: "many-fabrics", tone: "info", text: `${s.fabrics.length} different fabrics are in use across ${designs.length} pieces.` });
  const savedUnused = c.saved.fabrics.filter((f) => !s.fabrics.some((x) => x.id === f));
  if (savedUnused.length && designs.length >= 2) notes.push({ id: "saved-unused", tone: "info", text: `Saved but not used yet: ${savedUnused.map((f) => getFabric(f)?.name ?? f).join(", ")}.` });

  // plan & progress
  const target = c.concept.garmentTarget;
  if (target && designs.length < target) notes.push({ id: "target", tone: "info", text: `${designs.length} of the ${target} pieces you planned are in the line-up.` });
  const loose = designs.filter((d) => !c.looks.some((l) => l.designIds.includes(d.id)));
  if (c.looks.length && loose.length) notes.push({ id: "loose", tone: "info", text: `${loose.length === 1 ? loose[0].name + " isn't" : loose.length + " pieces aren't"} part of any look yet.`, designIds: loose.map((d) => d.id) });
  if (!s.statuses.final && !s.statuses.selected) notes.push({ id: "status", tone: "info", text: "Nothing is marked selected or final yet." });

  if (!notes.length) notes.push({ id: "ok", tone: "info", text: "Colours, prints and categories look evenly spread across the line-up." });
  return notes;
}
