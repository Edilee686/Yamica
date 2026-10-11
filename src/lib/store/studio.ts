"use client";

// Central studio state. Collections are immutable documents updated through
// `update()`, which records undo history and schedules an autosave.

import { create } from "zustand";
import { produce, type Draft } from "immer";
import type { Collection, Preferences, UploadMeta } from "@/lib/model/types";
import { duplicateCollectionData, newCollection } from "@/lib/model/factory";
import { createSoftCity, SAMPLE_ID } from "@/lib/model/sample";
import { migrateCollection } from "@/lib/model/schema";
import * as db from "./db";
import { prepareUpload } from "./uploads";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEFAULT_PREFS: Preferences = {
  mode: "guided",
  onboarded: false,
  favorites: { inspiration: [], prints: [], fabrics: [] },
  recentInspiration: [],
  recentMaterials: [],
};

interface History {
  past: Collection[];
  future: Collection[];
  lastKey?: string;
  lastAt: number;
}

interface StudioState {
  hydrated: boolean;
  storageError?: string;
  collections: Record<string, Collection>;
  prefs: Preferences;
  uploads: Record<string, UploadMeta>;
  uploadUrls: Record<string, string>;
  save: { status: SaveStatus; at?: number; error?: string };
  historyTick: number;

  hydrate(): Promise<void>;
  create(starter?: string, name?: string): string;
  update(id: string, recipe: (draft: Draft<Collection>) => void, opts?: { coalesce?: string; history?: boolean }): void;
  rename(id: string, name: string): void;
  duplicate(id: string): string | undefined;
  remove(id: string): Collection | undefined;
  restore(c: Collection): void;
  importCollection(c: Collection): string;
  resetSample(): void;
  undo(id: string): void;
  redo(id: string): void;
  canUndo(id: string): boolean;
  canRedo(id: string): boolean;
  setPrefs(recipe: (p: Draft<Preferences>) => void): void;
  toggleFavorite(kind: keyof Preferences["favorites"], id: string): void;
  noteRecent(kind: "inspiration" | "fabric" | "print", id: string): void;
  addUpload(file: File): Promise<UploadMeta>;
  addUploadBlob(meta: UploadMeta, blob: Blob): Promise<void>;
  removeUpload(id: string): Promise<void>;
}

const histories = new Map<string, History>();
const dirty = new Set<string>();
const deleted = new Set<string>();
let prefsDirty = false;
let uploadsDirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function hist(id: string): History {
  let h = histories.get(id);
  if (!h) histories.set(id, (h = { past: [], future: [], lastAt: 0 }));
  return h;
}

export const useStudio = create<StudioState>((set, get) => {
  function scheduleSave() {
    set({ save: { ...get().save, status: "saving" } });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 450);
  }

  async function flush() {
    saveTimer = null;
    const s = get();
    try {
      const ids = [...dirty];
      dirty.clear();
      await Promise.all(ids.map((id) => s.collections[id] && db.saveCollection(s.collections[id])));
      const gone = [...deleted];
      deleted.clear();
      await Promise.all(gone.map((id) => db.deleteCollection(id)));
      if (prefsDirty) (prefsDirty = false), await db.savePrefs(get().prefs);
      if (uploadsDirty) (uploadsDirty = false), await db.saveUploadIndex(Object.values(get().uploads));
      set({ save: { status: "saved", at: Date.now() } });
    } catch (e) {
      const msg = e instanceof Error && /quota/i.test(e.message) ? "Browser storage is full. Remove unused uploads or download a backup." : "Couldn't save to this browser.";
      set({ save: { status: "error", at: Date.now(), error: msg } });
    }
  }

  function put(c: Collection) {
    dirty.add(c.id);
    deleted.delete(c.id);
    set((s) => ({ collections: { ...s.collections, [c.id]: c } }));
    scheduleSave();
  }

  return {
    hydrated: false,
    collections: {},
    prefs: DEFAULT_PREFS,
    uploads: {},
    uploadUrls: {},
    save: { status: "idle" },
    historyTick: 0,

    async hydrate() {
      if (get().hydrated) return;
      try {
        const data = await db.loadAll();
        const collections: Record<string, Collection> = {};
        for (const raw of data.collections) {
          try {
            const c = migrateCollection(raw);
            collections[c.id] = c;
          } catch {
            /* skip unreadable documents */
          }
        }
        const prefs = { ...DEFAULT_PREFS, ...(data.prefs ?? {}) };
        const uploads: Record<string, UploadMeta> = {};
        const uploadUrls: Record<string, string> = {};
        for (const u of data.uploads ?? []) {
          uploads[u.id] = u;
          const blob = await db.loadBlob(u.id);
          if (blob) uploadUrls[u.id] = URL.createObjectURL(blob);
        }
        // First visit: install the sample collection.
        if (!data.prefs && !collections[SAMPLE_ID]) {
          const sample = createSoftCity();
          collections[sample.id] = sample;
          dirty.add(sample.id);
          prefsDirty = true;
        }
        set({ collections, prefs, uploads, uploadUrls, hydrated: true });
        if (dirty.size || prefsDirty) scheduleSave();
      } catch {
        // IndexedDB unavailable (private mode etc.): keep working in memory.
        const sample = createSoftCity();
        set({
          hydrated: true,
          collections: { [sample.id]: sample },
          storageError: "This browser isn't letting Yamica Studio save. Your work will be lost when you close the tab, so download a backup before leaving.",
        });
      }
    },

    create(starter, name) {
      const c = newCollection(starter, name);
      put(c);
      get().setPrefs((p) => void (p.lastCollectionId = c.id));
      return c.id;
    },

    update(id, recipe, opts) {
      const prev = get().collections[id];
      if (!prev) return;
      const next = produce(prev, (d) => {
        recipe(d);
      });
      if (next === prev) return;
      const stamped = { ...next, updatedAt: Date.now() };
      if (opts?.history !== false) {
        const h = hist(id);
        const now = Date.now();
        const coalesce = opts?.coalesce && h.lastKey === opts.coalesce && now - h.lastAt < 1500;
        if (!coalesce) {
          h.past.push(prev);
          if (h.past.length > 80) h.past.shift();
        }
        h.future = [];
        h.lastKey = opts?.coalesce;
        h.lastAt = now;
        set((s) => ({ historyTick: s.historyTick + 1 }));
      }
      put(stamped);
    },

    rename(id, name) {
      get().update(id, (d) => void (d.name = name.slice(0, 80)), { coalesce: "rename" });
    },

    duplicate(id) {
      const c = get().collections[id];
      if (!c) return;
      const copy = duplicateCollectionData(c, `${c.name} (copy)`);
      put(copy);
      return copy.id;
    },

    remove(id) {
      const c = get().collections[id];
      if (!c) return;
      const { [id]: _gone, ...rest } = get().collections;
      dirty.delete(id);
      deleted.add(id);
      histories.delete(id);
      set({ collections: rest });
      scheduleSave();
      return c;
    },

    restore(c) {
      put(c);
    },

    importCollection(c) {
      const exists = get().collections[c.id];
      const doc = exists ? duplicateCollectionData(c, `${c.name} (restored)`) : c;
      put(doc);
      return doc.id;
    },

    resetSample() {
      put(createSoftCity());
      histories.delete(SAMPLE_ID);
    },

    undo(id) {
      const h = hist(id);
      const cur = get().collections[id];
      const prev = h.past.pop();
      if (!prev || !cur) return;
      h.future.push(cur);
      h.lastKey = undefined;
      put(prev);
      set((s) => ({ historyTick: s.historyTick + 1 }));
    },

    redo(id) {
      const h = hist(id);
      const cur = get().collections[id];
      const next = h.future.pop();
      if (!next || !cur) return;
      h.past.push(cur);
      h.lastKey = undefined;
      put(next);
      set((s) => ({ historyTick: s.historyTick + 1 }));
    },

    canUndo: (id) => (histories.get(id)?.past.length ?? 0) > 0,
    canRedo: (id) => (histories.get(id)?.future.length ?? 0) > 0,

    setPrefs(recipe) {
      set((s) => ({ prefs: produce(s.prefs, recipe) }));
      prefsDirty = true;
      scheduleSave();
    },

    toggleFavorite(kind, id) {
      get().setPrefs((p) => {
        const list = p.favorites[kind];
        const i = list.indexOf(id);
        if (i >= 0) list.splice(i, 1);
        else list.unshift(id);
      });
    },

    noteRecent(kind, id) {
      get().setPrefs((p) => {
        if (kind === "inspiration") {
          p.recentInspiration = [id, ...p.recentInspiration.filter((x) => x !== id)].slice(0, 12);
        } else {
          p.recentMaterials = [{ kind, id }, ...p.recentMaterials.filter((x) => !(x.kind === kind && x.id === id))].slice(0, 12);
        }
      });
    },

    async addUpload(file) {
      const { meta, blob } = await prepareUpload(file);
      await get().addUploadBlob(meta, blob);
      return meta;
    },

    async addUploadBlob(meta, blob) {
      await db.saveBlob(meta.id, blob);
      const url = URL.createObjectURL(blob);
      set((s) => ({ uploads: { ...s.uploads, [meta.id]: meta }, uploadUrls: { ...s.uploadUrls, [meta.id]: url } }));
      uploadsDirty = true;
      scheduleSave();
    },

    async removeUpload(id) {
      await db.deleteBlob(id);
      const url = get().uploadUrls[id];
      if (url) URL.revokeObjectURL(url);
      set((s) => {
        const { [id]: _a, ...uploads } = s.uploads;
        const { [id]: _b, ...uploadUrls } = s.uploadUrls;
        return { uploads, uploadUrls };
      });
      uploadsDirty = true;
      scheduleSave();
    },
  };
});

/** Flush pending saves when the tab is hidden or closed. */
if (typeof window !== "undefined") {
  const flushNow = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {}, 0);
      // run the scheduled save immediately
      const s = useStudio.getState();
      for (const id of dirty) if (s.collections[id]) void db.saveCollection(s.collections[id]);
      dirty.clear();
      if (prefsDirty) void db.savePrefs(s.prefs), (prefsDirty = false);
      if (uploadsDirty) void db.saveUploadIndex(Object.values(s.uploads)), (uploadsDirty = false);
      useStudio.setState({ save: { status: "saved", at: Date.now() } });
    }
  };
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushNow());
  window.addEventListener("pagehide", flushNow);
}

export function useCollection(id: string | null | undefined) {
  return useStudio((s) => (id ? s.collections[id] : undefined));
}
