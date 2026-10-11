"use client";
import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Draft } from "immer";
import { Ctx, type WorkspaceCtx } from "./context";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { useCollection, useStudio } from "@/lib/store/studio";
import { STAGES } from "@/lib/model/progress";
import type { Collection, StageId } from "@/lib/model/types";
import { ConceptStage } from "@/components/stages/ConceptStage";
import { MoodboardStage } from "@/components/stages/MoodboardStage";
import { ColorsStage } from "@/components/stages/ColorsStage";
import { MaterialsStage } from "@/components/stages/MaterialsStage";
import { GarmentsStage } from "@/components/stages/GarmentsStage";
import { CollectionStage } from "@/components/stages/CollectionStage";
import { PresentationStage } from "@/components/stages/PresentationStage";
import { ButtonLink } from "@/components/ui/Button";
import { collectionHref } from "@/lib/routes";

export function Workspace() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const stage = (STAGES.includes(params.get("stage") as StageId) ? params.get("stage") : "concept") as StageId;
  const c = useCollection(id);
  const mode = useStudio((s) => s.prefs.mode);
  const updateStore = useStudio((s) => s.update);

  useEffect(() => {
    if (c) useStudio.getState().setPrefs((p) => void (p.lastCollectionId = c.id));
  }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    (recipe: (d: Draft<Collection>) => void, opts?: { coalesce?: string; history?: boolean }) => id && updateStore(id, recipe, opts),
    [id, updateStore],
  );
  const goto = useCallback(
    (s: StageId, extra?: Record<string, string>) => {
      if (!id) return;
      router.push(collectionHref(id, s, extra), { scroll: true });
    },
    [id, router],
  );
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const q = new URLSearchParams(params.toString());
      if (value === null) q.delete(key);
      else q.set(key, value);
      router.replace(`/studio/collection?${q.toString()}`, { scroll: false });
    },
    [params, router],
  );

  // Global undo / redo shortcuts (ignored while typing in a field).
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useStudio.getState().redo(id);
        else useStudio.getState().undo(id);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useStudio.getState().redo(id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id]);

  const ctx = useMemo<WorkspaceCtx | null>(() => (c ? { c, update, mode, goto, param: (k) => params.get(k), setParam } : null), [c, update, mode, goto, params, setParam]);

  if (!c || !ctx) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="display text-4xl">We couldn't find that collection.</p>
        <p className="text-ink-3">It may have been deleted, or it was saved in a different browser.</p>
        <ButtonLink href="/studio" variant="primary">Back to My Studio</ButtonLink>
      </div>
    );
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className="flex min-h-dvh flex-col">
        <WorkspaceHeader stage={stage} />
        <main className="flex min-h-0 flex-1 flex-col" key={stage}>
          {stage === "concept" && <ConceptStage />}
          {stage === "moodboard" && <MoodboardStage />}
          {stage === "colors" && <ColorsStage />}
          {stage === "materials" && <MaterialsStage />}
          {stage === "garments" && <GarmentsStage />}
          {stage === "collection" && <CollectionStage />}
          {stage === "presentation" && <PresentationStage />}
        </main>
      </div>
    </Ctx.Provider>
  );
}
