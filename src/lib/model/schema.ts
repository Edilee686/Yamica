// Saved-project schema versioning.
//
// Every collection document stores `schemaVersion`. When the model changes,
// bump CURRENT_SCHEMA and add a step to MIGRATIONS that upgrades the previous
// version's shape. Loading always runs documents through `migrateCollection`.

import type { Collection } from "./types";

export const CURRENT_SCHEMA = 1;
export const BUNDLE_FORMAT = "yamica-studio-bundle";
export const BUNDLE_VERSION = 1;

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

// version N -> N+1
const MIGRATIONS: Record<number, Migration> = {
  // 1: (doc) => ({ ...doc, newField: defaultValue, schemaVersion: 2 }),
};

export class SchemaError extends Error {}

export function migrateCollection(raw: unknown): Collection {
  if (!raw || typeof raw !== "object") throw new SchemaError("This isn't a Yamica Studio collection.");
  let doc = raw as Record<string, unknown>;
  let v = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 1;
  if (v > CURRENT_SCHEMA) throw new SchemaError("This collection was saved by a newer version of Yamica Studio.");
  while (v < CURRENT_SCHEMA) {
    const step = MIGRATIONS[v];
    if (!step) throw new SchemaError(`No migration from schema ${v}.`);
    doc = step(doc);
    v++;
  }
  const c = doc as unknown as Collection;
  if (typeof c.id !== "string" || !Array.isArray(c.designs) || !Array.isArray(c.palettes) || !Array.isArray(c.moodboards)) {
    throw new SchemaError("This collection file is incomplete or damaged.");
  }
  // Fill fields that may be missing in hand-edited or partial files.
  c.saved ??= { inspiration: [], uploads: [], fabrics: [], prints: [] };
  c.looks ??= [];
  c.boardOrder ??= c.designs.filter((d) => d.onBoard).map((d) => d.id);
  c.imagePrints ??= [];
  c.notes ??= "";
  c.schemaVersion = CURRENT_SCHEMA;
  return c;
}
