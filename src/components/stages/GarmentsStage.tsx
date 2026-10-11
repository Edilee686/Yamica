"use client";
import { useState } from "react";
import { Copy, Layers, Plus, Shirt } from "lucide-react";
import { useWorkspace } from "@/components/workspace/context";
import { StageIntro } from "@/components/workspace/StageIntro";
import { GarmentEditor, STATUS_LABELS, rootOf } from "@/components/garment/GarmentEditor";
import { GarmentSVG } from "@/components/garment/GarmentSVG";
import { TemplatePicker } from "@/components/garment/TemplatePicker";
import { useImagePrintLookup } from "@/components/common/resolvers";
import { Button } from "@/components/ui/Button";
import { Chip, EmptyState } from "@/components/ui/controls";
import { cx } from "@/components/ui/cx";
import { activePalette, newDesign, swatchLookup } from "@/lib/model/factory";
import { CATEGORY_LABELS, getTemplate } from "@/lib/garments/templates";
import { uid } from "@/lib/model/ids";
import { toast } from "@/components/ui/Toast";
import type { DesignStatus, GarmentDesign } from "@/lib/model/types";

const STATUS_TONE: Record<DesignStatus, string> = {
  draft: "bg-surface-2 text-ink-2",
  exploring: "bg-butter-soft text-ink",
  selected: "bg-sage-soft text-sage-deep",
  final: "bg-lilac-soft text-lilac-deep",
};

export function GarmentsStage() {
  const { c, update, param, setParam } = useWorkspace();
  const [picker, setPicker] = useState(false);
  const [filter, setFilter] = useState<"all" | DesignStatus>("all");
  const lookup = swatchLookup(c);
  const imagePrint = useImagePrintLookup(c);
  const designId = param("design");
  const open = designId ? c.designs.find((d) => d.id === designId) : undefined;

  if (open) {
    return (
      <div className="flex h-[max(560px,calc(100dvh-132px))] flex-none flex-col">
        <GarmentEditor key={open.id} designId={open.id} onClose={() => setParam("design", null)} />
      </div>
    );
  }

  function create(templateId: string) {
    const d = newDesign(templateId, undefined, activePalette(c));
    update((draft) => {
      draft.designs.push(d);
      draft.boardOrder.push(d.id);
    });
    setParam("design", d.id);
  }

  function duplicate(d: GarmentDesign) {
    const copyD: GarmentDesign = { ...structuredClone(d), id: uid("gd"), name: `${d.name} copy`, variationOf: undefined, variationKind: undefined, status: "draft", createdAt: Date.now(), updatedAt: Date.now() };
    update((draft) => {
      const i = draft.designs.findIndex((x) => x.id === d.id);
      draft.designs.splice(i + 1, 0, copyD);
      if (copyD.onBoard) {
        const bi = draft.boardOrder.indexOf(d.id);
        draft.boardOrder.splice(bi < 0 ? draft.boardOrder.length : bi + 1, 0, copyD.id);
      }
    });
    toast(`Duplicated as “${copyD.name}”`, { tone: "success" });
  }

  // group designs by their root so variations sit together
  const groups = new Map<string, GarmentDesign[]>();
  for (const d of c.designs) {
    if (filter !== "all" && d.status !== filter) continue;
    const r = rootOf(c.designs, d);
    groups.set(r, [...(groups.get(r) ?? []), d]);
  }
  const target = c.concept.garmentTarget;

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <StageIntro
        stage="garments"
        actions={
          <Button variant="primary" onClick={() => setPicker(true)}>
            <Plus className="size-4" /> New design
          </Button>
        }
      />
      <div className="px-4 pb-20 md:px-6">
        {c.designs.length === 0 ? (
          <EmptyState
            icon={<Shirt className="size-8" />}
            title="No garments yet"
            body="Pick a template to start. Each panel can take a palette colour, a fabric and a print."
            action={<Button variant="primary" onClick={() => setPicker(true)}><Plus className="size-4" /> Choose a template</Button>}
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
                <Chip active={filter === "all"} onClick={() => setFilter("all")}>All · {c.designs.length}</Chip>
                {(Object.keys(STATUS_LABELS) as DesignStatus[]).map((s) => {
                  const n = c.designs.filter((d) => d.status === s).length;
                  return n ? <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_LABELS[s]} · {n}</Chip> : null;
                })}
              </div>
              {target ? (
                <p className="ms-auto text-[13px] text-ink-3">
                  {c.designs.filter((d) => !d.variationOf).length} of {target} planned pieces
                </p>
              ) : null}
            </div>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {[...groups.values()].flat().map((d) => (
                <li key={d.id} className="group relative rounded-xl border border-line bg-surface transition-shadow hover:shadow-lift">
                  <button onClick={() => setParam("design", d.id)} className="block w-full rounded-xl p-3 text-start" aria-label={`Open ${d.name}`}>
                    <div className="rounded-lg bg-paper p-2">
                      <GarmentSVG design={d} swatch={lookup} imagePrint={imagePrint} tight title={d.name} className="mx-auto aspect-[360/470] h-auto w-full" />
                    </div>
                    <p className="mt-3 truncate text-[15px] font-semibold">{d.name}</p>
                    <p className="truncate text-[12px] text-ink-3">
                      {d.variationOf && c.designs.some((x) => x.id === d.variationOf) ? (
                        <span className="inline-flex items-center gap-1"><Layers className="size-3" /> {d.variationKind === "colorway" ? "Colourway" : "Variation"} of {c.designs.find((x) => x.id === d.variationOf)!.name}</span>
                      ) : (
                        <>{CATEGORY_LABELS[getTemplate(d.templateId).category]} · {getTemplate(d.templateId).name}</>
                      )}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5">
                      <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[d.status])}>{STATUS_LABELS[d.status]}</span>
                      {!d.onBoard && <span className="text-[11px] text-ink-3">Not in collection</span>}
                    </p>
                  </button>
                  <button
                    onClick={() => duplicate(d)}
                    aria-label={`Duplicate ${d.name}`}
                    className="tip absolute end-4 top-4 rounded-full border border-line bg-surface p-1.5 text-ink-2 opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                    data-tip="Duplicate"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div>
              {groups.size === 0 && <p className="text-[14px] text-ink-3">No designs with that status.</p>}
            </div>
          </>
        )}
      </div>
      <TemplatePicker open={picker} onClose={() => setPicker(false)} palette={activePalette(c)} onPick={create} />
    </div>
  );
}
