import type { Draft } from "immer";
import type { GarmentDesign, PanelConfig } from "@/lib/model/types";
import { buildGarment, resolvePanelConfig } from "./resolve";
import { getTemplate } from "./templates";
import type { BuiltPanel } from "./types";

/** All panels this design can show, across its supported views. */
export function allPanels(d: Pick<GarmentDesign, "templateId" | "options">): BuiltPanel[] {
  const t = getTemplate(d.templateId);
  const map = new Map<string, BuiltPanel>();
  for (const v of t.views) for (const p of buildGarment(t.id, d.options, v).panels) if (!p.configFrom && !map.has(p.id)) map.set(p.id, p);
  return [...map.values()];
}

export function panelInfo(d: Pick<GarmentDesign, "templateId" | "options">, id: string) {
  return allPanels(d).find((p) => p.id === id);
}

/** Panels edited together with `id` (itself plus linked mirror partners). */
export function editTargets(d: GarmentDesign, id: string): string[] {
  const p = panelInfo(d, id);
  if (!p?.mirrorGroup || d.mirrorLinks[p.mirrorGroup] === false) return [id];
  return allPanels(d)
    .filter((x) => x.mirrorGroup === p.mirrorGroup)
    .map((x) => x.id);
}

export function editPanel(d: Draft<GarmentDesign>, id: string, fn: (cfg: Draft<PanelConfig>) => void) {
  for (const target of editTargets(d as GarmentDesign, id)) {
    if (!d.panels[target]) d.panels[target] = structuredClone(resolvePanelConfig(d as GarmentDesign, target));
    fn(d.panels[target]);
  }
  d.updatedAt = Date.now();
}
