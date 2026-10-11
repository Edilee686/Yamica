import type { Draft } from "immer";
import type { Collection, ColorValue } from "./types";

function* colorRefs(c: Collection | Draft<Collection>): Generator<{ value: ColorValue; designId: string }> {
  for (const d of c.designs) {
    for (const p of Object.values(d.panels)) {
      if (p.fill.type === "solid") yield { value: p.fill.color, designId: d.id };
      else for (const v of Object.values(p.fill.colors ?? {})) yield { value: v, designId: d.id };
    }
  }
}

export function swatchUsage(c: Collection, swatchId: string) {
  let panels = 0;
  const designs = new Set<string>();
  for (const r of colorRefs(c)) if (r.value.swatchId === swatchId) (panels++, designs.add(r.designId));
  return { panels, designs: designs.size };
}

/** Linked panels follow the new colour (hex kept in sync for safety). */
export function syncSwatch(d: Draft<Collection>, swatchId: string, hex: string) {
  for (const r of colorRefs(d)) if (r.value.swatchId === swatchId) r.value.hex = hex;
  for (const m of d.moodboards) for (const it of m.items) if (it.type === "swatch" && it.swatchId === swatchId) it.hex = hex;
}

/** Detach references from a swatch, keeping the colour they currently show. */
export function freezeSwatch(d: Draft<Collection>, swatchId: string, keepHex: string) {
  for (const r of colorRefs(d)) if (r.value.swatchId === swatchId) (r.value.hex = keepHex, delete r.value.swatchId);
  for (const m of d.moodboards) for (const it of m.items) if (it.type === "swatch" && it.swatchId === swatchId) (it.hex = keepHex, delete it.swatchId);
}
