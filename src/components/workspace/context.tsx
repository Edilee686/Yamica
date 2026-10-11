"use client";
import { createContext, useContext } from "react";
import type { Draft } from "immer";
import type { Collection, ExperienceMode, StageId } from "@/lib/model/types";

export interface WorkspaceCtx {
  c: Collection;
  update: (recipe: (d: Draft<Collection>) => void, opts?: { coalesce?: string; history?: boolean }) => void;
  mode: ExperienceMode;
  goto: (stage: StageId, extra?: Record<string, string>) => void;
  param: (key: string) => string | null;
  setParam: (key: string, value: string | null) => void;
}

export const Ctx = createContext<WorkspaceCtx | null>(null);

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace outside workspace");
  return v;
}
