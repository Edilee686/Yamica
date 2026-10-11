"use client";
import { Dna } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "./context";
import { activePalette } from "@/lib/model/factory";
import { cx } from "@/components/ui/cx";

export function DNACard({ compact }: { compact?: boolean }) {
  const { c, goto } = useWorkspace();
  const pal = activePalette(c);
  const k = c.concept;
  return (
    <div className={cx("rounded-lg border border-line bg-surface", compact ? "p-4" : "p-5")}>
      <div className="flex items-center justify-between">
        <p className="eyebrow flex items-center gap-1.5"><Dna className="size-3.5" /> Collection DNA</p>
        <button onClick={() => goto("concept")} className="text-[12px] font-medium text-lilac-strong hover:underline">Edit</button>
      </div>
      <p className="display mt-2 text-[26px]">{c.name}</p>
      {k.statement ? <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{k.statement}</p> : <p className="mt-1 text-[13px] italic text-ink-3">No concept statement yet.</p>}
      {k.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {k.keywords.map((w) => (
            <span key={w} className="rounded-full bg-lilac-soft px-2 py-0.5 text-[12px] text-lilac-deep">{w}</span>
          ))}
        </div>
      )}
      {pal?.swatches.length > 0 && (
        <div className="mt-3 flex h-5 overflow-hidden rounded-sm ring-1 ring-black/5">
          {pal.swatches.map((s) => (
            <span key={s.id} title={s.name} className="flex-1" style={{ background: s.hex }} />
          ))}
        </div>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
        {k.season && (<><dt className="text-ink-3">Season</dt><dd className="text-ink-2">{k.season}</dd></>)}
        <dt className="text-ink-3">Garments</dt>
        <dd className="text-ink-2">{c.designs.length} of {k.garmentTarget} planned</dd>
        {k.materials.length > 0 && (<><dt className="text-ink-3">Materials</dt><dd className="text-ink-2">{k.materials.join(", ")}</dd></>)}
        {k.silhouettes.length > 0 && (<><dt className="text-ink-3">Silhouettes</dt><dd className="text-ink-2">{k.silhouettes.join(", ")}</dd></>)}
        {k.audience && (<><dt className="text-ink-3">For</dt><dd className="text-ink-2">{k.audience}</dd></>)}
      </dl>
    </div>
  );
}

export function DNAButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={cx("tip relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors", open ? "border-lilac-strong bg-lilac-wash text-lilac-deep" : "border-line-strong text-ink-2 hover:border-ink-3")} data-tip="Your collection's direction">
        <Dna className="size-4" /> <span className="hidden xl:inline">DNA</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-11 z-50 w-[320px] animate-pop shadow-pop">
            <DNACard compact />
          </div>
        </>
      )}
    </div>
  );
}
