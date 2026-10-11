"use client";
import type { Collection } from "@/lib/model/types";
import { MoodboardSVG } from "@/components/moodboard/MoodboardSVG";
import { GarmentSVG } from "@/components/garment/GarmentSVG";
import { activeMoodboard, activePalette, swatchLookup } from "@/lib/model/factory";
import { useImagePrintLookup, useImageResolver } from "./resolvers";
import { cx } from "@/components/ui/cx";

export function CollectionPreview({ c, className, prefer = "moodboard" }: { c: Collection; className?: string; prefer?: "moodboard" | "garments" }) {
  const resolve = useImageResolver();
  const imagePrint = useImagePrintLookup(c);
  const mb = activeMoodboard(c);
  const pal = activePalette(c);
  const lookup = swatchLookup(c);
  const designs = c.boardOrder.map((id) => c.designs.find((d) => d.id === id)).filter(Boolean).slice(0, 4);
  const showBoard = mb.items.length > 0 && (prefer === "moodboard" || designs.length === 0);
  return (
    <div className={cx("relative aspect-[16/10] overflow-hidden bg-surface-2", className)}>
      {showBoard ? (
        <MoodboardSVG board={mb} items={mb.items} resolve={resolve} swatchHex={lookup} uid={`pv-${c.id}`} className="absolute inset-0 size-full" />
      ) : designs.length ? (
        <div className="absolute inset-0 flex items-end justify-center gap-1 bg-surface px-4 pt-3">
          {designs.map((d) => (
            <GarmentSVG key={d!.id} design={d!} swatch={lookup} imagePrint={imagePrint} tight className="h-[92%] w-auto" />
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex flex-1 items-center justify-center">
            <p className="display text-[26px] text-ink-3">A fresh start</p>
          </div>
          {pal.swatches.length > 0 && (
            <div className="flex h-6">
              {pal.swatches.map((s) => (
                <div key={s.id} className="flex-1" style={{ background: s.hex }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
