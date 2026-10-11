import type { Collection, StageId } from "./types";
import { activeMoodboard, activePalette } from "./factory";

export const STAGES: StageId[] = ["concept", "moodboard", "colors", "materials", "garments", "collection", "presentation"];

export interface StageStatus {
  done: boolean;
  /** Short description of what's there, e.g. "5 colours". */
  summary: string;
  /** What's still needed when not done. */
  todo: string;
}

export function stageStatus(c: Collection, stage: StageId): StageStatus {
  switch (stage) {
    case "concept": {
      const has = c.name.trim() && c.name !== "Untitled collection" && c.concept.statement.trim().length >= 10 && c.concept.keywords.length > 0;
      return { done: !!has, summary: c.concept.keywords.slice(0, 3).join(" · ") || "No keywords yet", todo: "Add a name, a short statement and a keyword" };
    }
    case "moodboard": {
      const mb = activeMoodboard(c);
      const imgs = mb.items.filter((i) => i.type === "image").length;
      return { done: mb.items.length >= 3 && imgs >= 1, summary: `${imgs} image${imgs === 1 ? "" : "s"}, ${mb.items.length} item${mb.items.length === 1 ? "" : "s"}`, todo: "Add at least 3 items, including an image" };
    }
    case "colors": {
      const n = activePalette(c)?.swatches.length ?? 0;
      return { done: n >= 3, summary: `${n} colour${n === 1 ? "" : "s"}`, todo: "Add at least 3 colours" };
    }
    case "materials": {
      const f = c.saved.fabrics.length;
      const p = c.saved.prints.length + c.imagePrints.length;
      return { done: f >= 1 && p >= 1, summary: `${f} fabric${f === 1 ? "" : "s"}, ${p} print${p === 1 ? "" : "s"}`, todo: "Save a fabric and a print" };
    }
    case "garments": {
      const n = c.designs.length;
      return { done: n >= 1, summary: `${n} design${n === 1 ? "" : "s"}`, todo: "Design your first garment" };
    }
    case "collection": {
      const chosen = c.designs.filter((d) => d.status === "selected" || d.status === "final").length;
      return { done: c.looks.some((l) => l.designIds.length) || chosen >= 1, summary: `${c.looks.length} look${c.looks.length === 1 ? "" : "s"}, ${chosen} selected`, todo: "Create a look or mark a design as selected" };
    }
    case "presentation": {
      return { done: !!c.presentation.lastExportedAt, summary: c.presentation.lastExportedAt ? "Exported" : "Not exported yet", todo: "Export your presentation" };
    }
  }
}

export function progress(c: Collection) {
  const done = STAGES.filter((s) => stageStatus(c, s).done).length;
  return { done, total: STAGES.length, pct: Math.round((done / STAGES.length) * 100) };
}

export function nextStage(c: Collection): StageId {
  return STAGES.find((s) => !stageStatus(c, s).done) ?? "presentation";
}
