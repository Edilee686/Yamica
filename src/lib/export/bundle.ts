// Project backup and restore: a .yamica file (zip) holding collection JSON and
// the user's uploaded images, so work can move between browsers or devices.
import JSZip from "jszip";
import type { Collection, UploadMeta } from "@/lib/model/types";
import { BUNDLE_FORMAT, BUNDLE_VERSION, CURRENT_SCHEMA, SchemaError, migrateCollection } from "@/lib/model/schema";
import { loadBlob } from "@/lib/store/db";
import { useStudio } from "@/lib/store/studio";
import { downloadBlob, safeFileName } from "./download";

interface Manifest {
  format: string;
  version: number;
  schemaVersion: number;
  exportedAt: string;
  collections: Collection[];
  uploads: UploadMeta[];
}

function uploadsUsedBy(c: Collection): string[] {
  const ids = new Set<string>(c.saved.uploads);
  for (const m of c.moodboards) for (const it of m.items) if (it.type === "image" && it.image.kind === "upload") ids.add(it.image.id);
  for (const p of c.imagePrints) ids.add(p.uploadId);
  return [...ids];
}

export async function exportBundle(collectionIds: string[]) {
  const s = useStudio.getState();
  const collections = collectionIds.map((id) => s.collections[id]).filter(Boolean);
  const uploadIds = new Set(collections.flatMap(uploadsUsedBy));
  const uploads = [...uploadIds].map((id) => s.uploads[id]).filter(Boolean);
  const zip = new JSZip();
  const manifest: Manifest = { format: BUNDLE_FORMAT, version: BUNDLE_VERSION, schemaVersion: CURRENT_SCHEMA, exportedAt: new Date().toISOString(), collections, uploads };
  zip.file("project.json", JSON.stringify(manifest, null, 2));
  for (const u of uploads) {
    const blob = await loadBlob(u.id);
    if (blob) zip.file(`uploads/${u.id}`, blob);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const name = collections.length === 1 ? safeFileName(collections[0].name) : "yamica-studio-backup";
  downloadBlob(blob, `${name}.yamica`);
  return { collections: collections.length, uploads: uploads.length };
}

const MAX_BUNDLE = 200 * 1024 * 1024;

export async function importBundle(file: File): Promise<{ imported: string[]; uploads: number }> {
  if (file.size > MAX_BUNDLE) throw new SchemaError("This backup is larger than 200 MB.");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new SchemaError("This file isn't a Yamica Studio backup (.yamica).");
  }
  const raw = await zip.file("project.json")?.async("string");
  if (!raw) throw new SchemaError("This backup is missing its project data.");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    throw new SchemaError("This backup's project data is damaged.");
  }
  if (manifest.format !== BUNDLE_FORMAT) throw new SchemaError("This file isn't a Yamica Studio backup.");
  const collections = (manifest.collections ?? []).map(migrateCollection);
  const store = useStudio.getState();
  let uploads = 0;
  for (const u of manifest.uploads ?? []) {
    if (store.uploads[u.id]) continue;
    const entry = zip.file(`uploads/${u.id}`);
    if (!entry) continue;
    const data = await entry.async("blob");
    // Only raster image types are accepted back in; SVG uploads were rasterised on import.
    if (!/^image\/(png|jpeg|webp|gif)$/.test(u.type)) continue;
    await store.addUploadBlob(u, new Blob([data], { type: u.type }));
    uploads++;
  }
  const imported = collections.map((c) => useStudio.getState().importCollection(c));
  return { imported, uploads };
}
