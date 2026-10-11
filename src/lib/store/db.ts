// Browser persistence. Projects live in IndexedDB on this device only.
import { createStore, del, get, keys, set, getMany } from "idb-keyval";
import type { Collection, Preferences, UploadMeta } from "@/lib/model/types";

let store: ReturnType<typeof createStore> | null = null;
const db = () => (store ??= createStore("yamica-studio", "kv"));

export async function loadAll(): Promise<{ collections: unknown[]; prefs?: Preferences; uploads?: UploadMeta[] }> {
  const all = (await keys(db())) as string[];
  const colKeys = all.filter((k) => k.startsWith("col:"));
  const collections = colKeys.length ? await getMany(colKeys, db()) : [];
  const [prefs, uploads] = await Promise.all([get<Preferences>("prefs", db()), get<UploadMeta[]>("uploads", db())]);
  return { collections, prefs, uploads };
}

export const saveCollection = (c: Collection) => set(`col:${c.id}`, c, db());
export const deleteCollection = (id: string) => del(`col:${id}`, db());
export const savePrefs = (p: Preferences) => set("prefs", p, db());
export const saveUploadIndex = (u: UploadMeta[]) => set("uploads", u, db());
export const saveBlob = (id: string, blob: Blob) => set(`blob:${id}`, blob, db());
export const loadBlob = (id: string) => get<Blob>(`blob:${id}`, db());
export const deleteBlob = (id: string) => del(`blob:${id}`, db());

export async function storageEstimate(): Promise<{ usage?: number; quota?: number; persisted?: boolean }> {
  try {
    const est = await navigator.storage?.estimate?.();
    const persisted = await navigator.storage?.persisted?.();
    return { usage: est?.usage, quota: est?.quota, persisted };
  } catch {
    return {};
  }
}
