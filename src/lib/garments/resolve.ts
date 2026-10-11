import type { ColorValue, GarmentDesign, ImagePrint, PanelConfig } from "@/lib/model/types";
import { getTemplate } from "./templates";
import type { BuiltGarment, GarmentTemplate } from "./types";

const cache = new Map<string, BuiltGarment>();

/** Build (and memoise) a garment's geometry for its option set and view. */
export function buildGarment(templateId: string, options: Record<string, string>, view: "front" | "back"): BuiltGarment {
  const t = getTemplate(templateId);
  const v = t.views.includes(view) ? view : "front";
  const key = `${t.id}|${v}|${t.options.map((o) => `${o.id}=${options[o.id] ?? o.default}`).join(",")}`;
  let built = cache.get(key);
  if (!built) {
    built = t.build(normaliseOptions(t, options), v);
    cache.set(key, built);
  }
  return built;
}

/** Fill in defaults and drop values that break compatibility rules. */
export function normaliseOptions(t: GarmentTemplate, options: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const o of t.options) out[o.id] = o.values.some((v) => v.id === options[o.id]) ? options[o.id] : o.default;
  // Resolve rules repeatedly in case one fallback affects another.
  for (let pass = 0; pass < 3; pass++) {
    for (const o of t.options) {
      const v = o.values.find((x) => x.id === out[o.id]);
      if (v && !isAllowed(v.requires, out)) out[o.id] = firstAllowed(t, o.id, out);
    }
  }
  return out;
}

export function isAllowed(requires: Record<string, string[]> | undefined, options: Record<string, string>) {
  if (!requires) return true;
  return Object.entries(requires).every(([k, vals]) => vals.includes(options[k]));
}

function firstAllowed(t: GarmentTemplate, optionId: string, options: Record<string, string>) {
  const o = t.options.find((x) => x.id === optionId)!;
  const def = o.values.find((v) => v.id === o.default);
  if (def && isAllowed(def.requires, options)) return def.id;
  return (o.values.find((v) => isAllowed(v.requires, options)) ?? o.values[0]).id;
}

/** Apply one option change, returning the new options and any values that were reset. */
export function changeOption(t: GarmentTemplate, options: Record<string, string>, optionId: string, value: string) {
  const before = normaliseOptions(t, options);
  const after = normaliseOptions(t, { ...before, [optionId]: value });
  const reset = t.options
    .filter((o) => o.id !== optionId && before[o.id] !== after[o.id])
    .map((o) => ({
      option: o.label,
      from: o.values.find((v) => v.id === before[o.id])?.label ?? before[o.id],
      to: o.values.find((v) => v.id === after[o.id])?.label ?? after[o.id],
    }));
  return { options: after, reset };
}

export function templateDefaultPanel(t: GarmentTemplate, panelId: string): PanelConfig {
  const d = t.defaults[panelId] ?? t.defaults.body ?? Object.values(t.defaults)[0] ?? { hex: "#F3EEE3", fabricId: "cotton-poplin" };
  return { fill: { type: "solid", color: { hex: d.hex } }, fabricId: d.fabricId, outline: true };
}

export function resolvePanelConfig(design: GarmentDesign, panelId: string, configFrom?: string): PanelConfig {
  const t = getTemplate(design.templateId);
  return design.panels[configFrom ?? panelId] ?? templateDefaultPanel(t, configFrom ?? panelId);
}

export type SwatchLookup = (id: string) => string | undefined;

export function resolveColor(c: ColorValue, lookup?: SwatchLookup): string {
  if (c.swatchId && lookup) return lookup(c.swatchId) ?? c.hex;
  return c.hex;
}

export type ImagePrintLookup = (id: string) => { print: ImagePrint; url?: string } | undefined;
