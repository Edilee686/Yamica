"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Palette } from "@/lib/model/types";
import { CATEGORY_LABELS, TEMPLATES } from "@/lib/garments/templates";
import { newDesign } from "@/lib/model/factory";
import { GarmentSVG } from "./GarmentSVG";
import { Dialog } from "@/components/ui/Dialog";
import { Chip } from "@/components/ui/controls";
import { copy } from "@/lib/i18n/en";

export function TemplateGrid({ palette, onPick, compact }: { palette?: Palette; onPick: (templateId: string) => void; compact?: boolean }) {
  const [cat, setCat] = useState("all");
  const list = TEMPLATES.filter((t) => cat === "all" || t.category === cat);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Garment category">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
          <Chip key={id} active={cat === id} onClick={() => setCat(id)}>{label}</Chip>
        ))}
      </div>
      <div className={compact ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6"}>
        {list.map((t) => {
          const preview = newDesign(t.id, t.name, palette);
          return (
            <button key={t.id} onClick={() => onPick(t.id)} className="group rounded-xl border border-line bg-surface p-3 text-start transition-shadow hover:shadow-lift focus-visible:shadow-lift">
              <div className="rounded-lg bg-paper p-2">
                <GarmentSVG design={preview} tight className="mx-auto aspect-[360/470] h-auto w-full transition-transform duration-300 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-3 text-[15px] font-semibold">{t.name}</p>
              <p className="text-[12px] text-ink-3">{CATEGORY_LABELS[t.category]}</p>
              {!compact && <p className="mt-1 text-[12px] leading-snug text-ink-3">{t.description}</p>}
              <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-3">
                {t.views.includes("back") ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                {t.views.includes("back") ? "Front & back views" : "Front view only"}
                <span className="ms-auto">{t.options.length} options</span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TemplatePicker({ open, onClose, palette, onPick }: { open: boolean; onClose: () => void; palette?: Palette; onPick: (templateId: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Choose a garment template" description={copy.flatsDisclaimer} size="xl">
      <div className="pb-2">
        <TemplateGrid palette={palette} onPick={(id) => (onPick(id), onClose())} compact={false} />
      </div>
    </Dialog>
  );
}
