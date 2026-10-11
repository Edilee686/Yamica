"use client";
import { useEffect, useMemo, useState } from "react";
import { StudioHeader } from "@/components/common/StudioHeader";
import { useStudio } from "@/lib/store/studio";
import type { Collection } from "@/lib/model/types";

export function LibraryShell({ eyebrow, title, intro, actions, children }: { eyebrow: string; title: string; intro?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <StudioHeader />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 md:px-8">
        <section className="flex flex-col gap-4 pt-10 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display mt-2 text-[40px] md:text-[54px]">{title}</h1>
            {intro && <p className="mt-2 text-[15px] text-ink-2">{intro}</p>}
          </div>
          {actions}
        </section>
        {children}
      </main>
    </div>
  );
}

export function useCollectionsList() {
  const collections = useStudio((s) => s.collections);
  return useMemo(() => Object.values(collections).sort((a, b) => b.updatedAt - a.updatedAt), [collections]);
}

/** The collection library actions apply to, remembered as the last one opened. */
export function useTargetCollection(): [Collection | undefined, (id: string) => void, Collection[]] {
  const list = useCollectionsList();
  const lastId = useStudio((s) => s.prefs.lastCollectionId);
  const [id, setId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!id || !list.some((c) => c.id === id)) setId(list.find((c) => c.id === lastId)?.id ?? list[0]?.id);
  }, [id, list, lastId]);
  return [list.find((c) => c.id === id), setId, list];
}

export function TargetSelect({ value, onChange, list, label = "Saving to" }: { value?: Collection; onChange: (id: string) => void; list: Collection[]; label?: string }) {
  if (!list.length) return <p className="text-[13px] text-ink-3">Create a collection to save items to it.</p>;
  return (
    <label className="flex items-center gap-2 text-[13px] text-ink-2">
      <span className="shrink-0">{label}</span>
      <select className="field h-9 min-w-48 py-0 text-[13px]" value={value?.id ?? ""} onChange={(e) => onChange(e.target.value)}>
        {list.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name || "Untitled collection"}
          </option>
        ))}
      </select>
    </label>
  );
}
