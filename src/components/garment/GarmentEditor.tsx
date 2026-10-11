"use client";
import { useEffect, useState } from "react";
import type { Draft } from "immer";
import { ArrowLeft, Check, Columns2, Copy, Download, FileImage, FileCode2, Layers, LayoutGrid, Palette as PaletteIcon, Plus, SlidersHorizontal, Sparkles, StickyNote, Trash2 } from "lucide-react";
import type { DesignStatus, GarmentDesign, PanelConfig, Swatch } from "@/lib/model/types";
import { useWorkspace } from "@/components/workspace/context";
import { GarmentSVG } from "./GarmentSVG";
import { PanelInspector } from "./PanelInspector";
import { useImagePrintLookup } from "@/components/common/resolvers";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog, Dialog, Sheet } from "@/components/ui/Dialog";
import { Segmented } from "@/components/ui/controls";
import { toast } from "@/components/ui/Toast";
import { cx } from "@/components/ui/cx";
import { getTemplate } from "@/lib/garments/templates";
import { buildGarment, changeOption, isAllowed, normaliseOptions, resolvePanelConfig } from "@/lib/garments/resolve";
import { allPanels, editPanel } from "@/lib/garments/edit";
import { swatchLookup } from "@/lib/model/factory";
import { syncSwatch } from "@/lib/model/usage";
import { uid } from "@/lib/model/ids";
import { exportElement, exportSvgFile } from "@/lib/export/raster";
import { downloadBlob, safeFileName } from "@/lib/export/download";
import { useStudio } from "@/lib/store/studio";
import { copy } from "@/lib/i18n/en";

export const STATUS_LABELS: Record<DesignStatus, string> = { draft: "Draft", exploring: "Exploring", selected: "Selected", final: "Final" };

export function rootOf(designs: GarmentDesign[], d: GarmentDesign) {
  return d.variationOf && designs.some((x) => x.id === d.variationOf) ? d.variationOf : d.id;
}

export function GarmentEditor({ designId, onClose }: { designId: string; onClose: () => void }) {
  const { c, update, setParam } = useWorkspace();
  const design = c.designs.find((d) => d.id === designId)!;
  const t = getTemplate(design.templateId);
  const lookup = swatchLookup(c);
  const imagePrint = useImagePrintLookup(c);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"components" | "layers">("components");
  const [sheet, setSheet] = useState<"components" | "panel" | null>(null);
  const [compare, setCompare] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const built = buildGarment(design.templateId, design.options, design.view);
  const options = normaliseOptions(t, design.options);

  useEffect(() => {
    if (selected && !built.panels.some((p) => p.id === selected && !p.configFrom)) setSelected(null);
  }, [built, selected]);

  const editDesign = (fn: (d: Draft<GarmentDesign>) => void, coalesce?: string) =>
    update(
      (draft) => {
        const d = draft.designs.find((x) => x.id === designId);
        if (d) (fn(d), (d.updatedAt = Date.now()));
      },
      { coalesce: coalesce ? `${designId}:${coalesce}` : undefined },
    );

  const editSelected = (fn: (cfg: Draft<PanelConfig>) => void, coalesce?: string) => selected && editDesign((d) => editPanel(d, selected, fn), coalesce ? `${selected}:${coalesce}` : undefined);

  function setOption(optionId: string, value: string) {
    const r = changeOption(t, design.options, optionId, value);
    editDesign((d) => {
      d.options = r.options;
      // make sure newly appearing panels get a sensible starting look
      for (const p of allPanels(d as GarmentDesign)) if (!d.panels[p.id]) d.panels[p.id] = structuredClone(resolvePanelConfig(d as GarmentDesign, p.kind === "cuff" ? "body" : p.id));
    });
    if (r.reset.length) toast(r.reset.map((x) => `${x.option} changed to ${x.to.toLowerCase()} to stay compatible`).join(". "));
  }

  function saveVariation(kind: "variation" | "colorway") {
    const root = rootOf(c.designs, design);
    const siblings = c.designs.filter((d) => rootOf(c.designs, d) === root).length;
    const copyD: GarmentDesign = { ...structuredClone(design), id: uid("gd"), variationOf: root, variationKind: kind, name: `${c.designs.find((d) => d.id === root)?.name ?? design.name} · ${kind === "colorway" ? "colourway" : "variation"} ${siblings + 1}`, status: "exploring", createdAt: Date.now(), updatedAt: Date.now(), onBoard: true };
    update((d) => {
      const i = d.designs.findIndex((x) => x.id === design.id);
      d.designs.splice(i + 1, 0, copyD);
      const bi = d.boardOrder.indexOf(design.id);
      d.boardOrder.splice(bi >= 0 ? bi + 1 : d.boardOrder.length, 0, copyD.id);
    });
    setParam("design", copyD.id);
    toast(kind === "colorway" ? "Colourway saved. Try another print." : "Variation saved. You're now editing the copy.", { tone: "success" });
  }

  function onEditSwatch(s: Swatch, hex: string, scope: "all" | "panel") {
    if (scope === "all") {
      update((d) => {
        const sw = d.palettes.flatMap((p) => p.swatches).find((x) => x.id === s.id);
        if (sw) sw.hex = hex;
        syncSwatch(d, s.id, hex);
      });
      toast(`${s.name} updated everywhere it's linked`, { tone: "success" });
    } else {
      editSelected((p) => void (p.fill = { type: "solid", color: { hex } }));
      toast("Changed this panel only. It's no longer linked to the palette.");
    }
  }

  async function doExport(kind: "png" | "svg") {
    const el = <GarmentSVG design={design} swatch={lookup} imagePrint={imagePrint} title={design.name} />;
    try {
      const blob = kind === "png" ? await exportElement(el, 1600, 2000, "image/png") : await exportSvgFile(el, 800, 1000);
      downloadBlob(blob, `${safeFileName(design.name)}.${kind}`);
      toast(`${kind.toUpperCase()} downloaded`, { tone: "success" });
    } catch {
      toast("The export didn't work. Try again.", { tone: "error" });
    }
    setExportOpen(false);
  }

  const root = rootOf(c.designs, design);
  const family = c.designs.filter((d) => rootOf(c.designs, d) === root);
  const selInfo = built.panels.find((p) => p.id === selected);
  const hasBack = t.views.includes("back");

  const componentsPanel = (
    <div className="space-y-5 p-4">
      <div>
        <p className="eyebrow">Template</p>
        <p className="mt-0.5 text-[15px] font-semibold">{t.name}</p>
        <p className="text-[12px] text-ink-3">{t.description}</p>
      </div>
      {t.options.map((o) => {
        const hiddenHere = o.views && !o.views.includes(design.view);
        return (
          <fieldset key={o.id} className={cx(hiddenHere && "opacity-60")}>
            <legend className="mb-1.5 text-[13px] font-medium text-ink-2">
              {o.label}
              {hiddenHere && <span className="ms-1 font-normal text-ink-3">· shows on the front</span>}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {o.values.map((v) => {
                const allowed = isAllowed(v.requires, options);
                const on = options[o.id] === v.id;
                return (
                  <button
                    key={v.id}
                    disabled={!allowed}
                    aria-pressed={on}
                    onClick={() => setOption(o.id, v.id)}
                    data-tip={!allowed ? v.requiresLabel : undefined}
                    data-tip-side="top"
                    className={cx("tip relative rounded-full border px-3 py-1.5 text-[13px] transition-colors", on ? "border-ink bg-ink text-surface" : allowed ? "border-line-strong bg-surface text-ink-2 hover:border-ink-3" : "cursor-not-allowed border-dashed border-line text-ink-4")}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
            {o.values.some((v) => !isAllowed(v.requires, options)) && <p className="mt-1 text-[11px] text-ink-3">{o.values.filter((v) => !isAllowed(v.requires, options)).map((v) => `${v.label}: ${v.requiresLabel?.toLowerCase()}`).join(" · ")}</p>}
          </fieldset>
        );
      })}
      {t.notes.length > 0 && (
        <div className="rounded-md bg-surface-2 p-3 text-[12px] leading-relaxed text-ink-3">
          <p className="mb-1 font-medium text-ink-2">How parts fit together</p>
          {t.notes.map((n) => <p key={n}>{n}</p>)}
        </div>
      )}
    </div>
  );

  const layersPanel = (
    <div className="p-2">
      <p className="px-2 pt-2 pb-1 text-[12px] text-ink-3">Every selectable panel on the {design.view} view. Use this list with the keyboard.</p>
      <ul className="space-y-0.5">
        {[...built.panels].reverse().filter((p) => !p.configFrom).map((p) => {
          const cfg = resolvePanelConfig(design, p.id);
          const hex = cfg.fill.type === "solid" ? (cfg.fill.color.swatchId && lookup(cfg.fill.color.swatchId)) || cfg.fill.color.hex : undefined;
          return (
            <li key={p.id}>
              <button
                onClick={() => (setSelected(p.id), setSheet(null))}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p.id)}
                onBlur={() => setHovered(null)}
                aria-pressed={selected === p.id}
                className={cx("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-start text-[13px]", selected === p.id ? "bg-lilac-soft font-medium text-lilac-deep" : "hover:bg-surface-2")}
              >
                <span className="size-5 shrink-0 overflow-hidden rounded ring-1 ring-black/10" style={{ background: hex ?? "repeating-linear-gradient(45deg,#ccc 0 3px,#eee 3px 6px)" }} />
                <span className="flex-1 truncate">{p.label}</span>
                <span className="text-[11px] text-ink-3">{cfg.fill.type === "print" ? "Print" : ""}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const panelPanel = selected ? (
    <PanelInspector
      c={c}
      design={design}
      panelId={selected}
      onEdit={editSelected}
      onLink={(g, linked) => editDesign((d) => void (d.mirrorLinks[g] = linked))}
      onApplyToAll={() => {
        const src = resolvePanelConfig(design, selected);
        editDesign((d) => {
          for (const p of allPanels(d as GarmentDesign)) if (p.kind !== "button") d.panels[p.id] = structuredClone(src);
        });
        toast("Applied to every panel except buttons");
      }}
      onEditSwatch={onEditSwatch}
    />
  ) : (
    <div className="space-y-5 p-4">
      <div className="rounded-lg border border-dashed border-line-strong p-5 text-center">
        <Sparkles className="mx-auto mb-2 size-5 text-lilac-strong" />
        <p className="display text-[22px]">Make it yours.</p>
        <p className="mt-1 text-[13px] text-ink-3">Click any part of the garment, such as a sleeve or the collar, to give it a colour, a print or a fabric.</p>
      </div>
      <DesignMeta design={design} onEdit={editDesign} />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 md:px-4">
        <IconButton label="All designs" onClick={onClose}><ArrowLeft className="size-4" /></IconButton>
        <input aria-label="Design name" value={design.name} onChange={(e) => editDesign((d) => void (d.name = e.target.value), "name")} className="min-w-0 max-w-[260px] flex-1 rounded-md bg-transparent px-2 py-1 text-[16px] font-semibold hover:bg-surface-2 focus:bg-surface-2 focus:outline-none" />
        <select aria-label="Design status" value={design.status} onChange={(e) => editDesign((d) => void (d.status = e.target.value as DesignStatus))} className="h-8 rounded-full border border-line bg-surface px-2 text-[12px] text-ink-2">
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="ms-auto flex flex-wrap items-center gap-1.5">
          <Segmented
            label="View"
            size="sm"
            value={design.view}
            onChange={(v) => editDesign((d) => void (d.view = v))}
            options={[
              { value: "front", label: "Front" },
              { value: "back", label: hasBack ? "Back" : "Back · not drawn", disabled: !hasBack, title: hasBack ? undefined : "This template has a front view only" },
            ]}
          />
          <Button size="sm" icon={<Copy className="size-4" />} onClick={() => saveVariation("variation")}>Save variation</Button>
          <Button size="sm" variant="ghost" icon={<PaletteIcon className="size-4" />} onClick={() => saveVariation("colorway")} className="hidden md:inline-flex">Colourway</Button>
          <IconButton label="Compare variations" onClick={() => setCompare(true)} disabled={family.length < 2}><Columns2 className="size-4" /></IconButton>
          <Button size="sm" variant={design.onBoard ? "soft" : "secondary"} icon={design.onBoard ? <Check className="size-4" /> : <Plus className="size-4" />} onClick={() => editDesign((d) => void (d.onBoard = !d.onBoard))} aria-pressed={design.onBoard} title="Show this design on the collection board">
            <span className="hidden sm:inline">{design.onBoard ? "In collection" : "Add to collection"}</span>
          </Button>
          <div className="relative">
            <Button size="sm" variant="primary" icon={<Download className="size-4" />} onClick={() => setExportOpen(!exportOpen)} aria-expanded={exportOpen}>Export</Button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setExportOpen(false)} />
                <div className="absolute end-0 top-10 z-30 w-56 rounded-lg border border-line bg-surface p-1 shadow-lift animate-pop" role="menu">
                  <button role="menuitem" onClick={() => doExport("png")} className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-start hover:bg-surface-2"><FileImage className="mt-0.5 size-4" /><span><span className="block text-[13px] font-medium">PNG image</span><span className="text-[11px] text-ink-3">1600 × 2000, transparent</span></span></button>
                  <button role="menuitem" onClick={() => doExport("svg")} className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-start hover:bg-surface-2"><FileCode2 className="mt-0.5 size-4" /><span><span className="block text-[13px] font-medium">SVG vector</span><span className="text-[11px] text-ink-3">Editable in vector apps</span></span></button>
                </div>
              </>
            )}
          </div>
          <IconButton label="Delete design" onClick={() => setConfirmDelete(true)} className="hover:text-danger"><Trash2 className="size-4" /></IconButton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[284px] shrink-0 flex-col border-e border-line bg-surface lg:flex" aria-label="Components and layers">
          <div className="p-3 pb-0">
            <Segmented label="Left panel" size="sm" value={leftTab} onChange={setLeftTab} className="w-full [&>button]:flex-1" options={[{ value: "components", label: <span className="flex items-center justify-center gap-1"><LayoutGrid className="size-3.5" /> Components</span> }, { value: "layers", label: <span className="flex items-center justify-center gap-1"><Layers className="size-3.5" /> Panels</span> }]} />
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{leftTab === "components" ? componentsPanel : layersPanel}</div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col" aria-label="Garment canvas">
          <div className="canvas-dots relative flex min-h-[420px] flex-1 items-center justify-center p-4 md:p-8" onClick={() => setSelected(null)}>
            <div className="relative h-full max-h-[calc(100dvh-260px)] min-h-[380px] w-full max-w-[560px]">
              <GarmentSVG design={design} swatch={lookup} imagePrint={imagePrint} selected={selected} hovered={hovered} onSelect={(id) => setSelected(id)} onHover={setHovered} className="absolute inset-0 size-full drop-shadow-[0_10px_24px_rgba(43,40,38,0.12)]" title={`${design.name}, ${design.view} view. Select a panel to edit it.`} />
            </div>
            <div className="pointer-events-none absolute start-4 top-4 flex flex-col gap-1.5">
              <span className="w-fit rounded-full bg-surface/95 px-3 py-1 text-[12px] font-medium shadow-soft">
                {selInfo ? <>Editing <span className="text-lilac-deep">{selInfo.label}</span></> : hovered ? built.panels.find((p) => p.id === hovered)?.label : "Select a panel"}
              </span>
              <span className="w-fit rounded-full bg-surface/80 px-2.5 py-0.5 text-[11px] text-ink-3">{design.view === "front" ? "Front view" : "Back view"}</span>
            </div>
            <p className="absolute inset-x-0 bottom-2 px-4 text-center text-[11px] text-ink-3">{copy.flatsDisclaimer}</p>
          </div>
          {family.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto border-t border-line bg-surface px-3 py-2" aria-label="Variations">
              <span className="me-1 shrink-0 text-[12px] font-medium text-ink-3">Variations</span>
              {family.map((d) => (
                <button key={d.id} onClick={() => setParam("design", d.id)} aria-current={d.id === design.id} title={d.name} className={cx("h-16 w-14 shrink-0 rounded-md border bg-paper p-0.5", d.id === design.id ? "border-lilac-strong ring-2 ring-lilac-soft" : "border-line hover:border-line-strong")}>
                  <GarmentSVG design={d} swatch={lookup} imagePrint={imagePrint} tight className="size-full" />
                </button>
              ))}
              <button onClick={() => setCompare(true)} className="ms-1 shrink-0 text-[12px] font-medium text-lilac-strong hover:underline">Compare</button>
            </div>
          )}
          <div className="flex gap-2 border-t border-line bg-surface p-2 lg:hidden">
            <Button size="sm" className="flex-1" icon={<SlidersHorizontal className="size-4" />} onClick={() => setSheet("components")}>Components</Button>
            <Button size="sm" variant={selected ? "brand" : "secondary"} className="flex-1" icon={<PaletteIcon className="size-4" />} onClick={() => setSheet("panel")}>{selInfo ? `Edit ${selInfo.label.toLowerCase()}` : "Panels"}</Button>
          </div>
        </section>

        <aside className="scroll-thin hidden w-[300px] shrink-0 overflow-y-auto border-s border-line bg-surface lg:block" aria-label="Panel settings">{panelPanel}</aside>
      </div>

      <Sheet open={sheet === "components"} onClose={() => setSheet(null)} title="Components">{componentsPanel}</Sheet>
      <Sheet open={sheet === "panel"} onClose={() => setSheet(null)} title={selInfo?.label ?? "Choose a panel"}>{selected ? panelPanel : layersPanel}</Sheet>

      <Dialog open={compare} onClose={() => setCompare(false)} title="Compare variations" description="Side by side, exactly as saved." size="xl">
        <div className="grid grid-cols-2 gap-4 pb-2 md:grid-cols-4">
          {family.map((d) => (
            <div key={d.id} className={cx("rounded-lg border p-3", d.id === design.id ? "border-lilac-strong" : "border-line")}>
              <GarmentSVG design={d} swatch={lookup} imagePrint={imagePrint} tight className="aspect-[360/470] w-full" />
              <p className="mt-2 truncate text-[13px] font-medium">{d.name}</p>
              <p className="text-[12px] text-ink-3">{STATUS_LABELS[d.status]}{d.variationKind === "colorway" ? " · colourway" : ""}</p>
              {d.id !== design.id && <Button size="sm" variant="ghost" className="mt-1 -ms-2" onClick={() => (setParam("design", d.id), setCompare(false))}>Open</Button>}
            </div>
          ))}
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this design?"
        description={`“${design.name}” will be removed from the collection and its looks.`}
        onConfirm={() => {
          update((d) => {
            d.designs = d.designs.filter((x) => x.id !== design.id);
            d.boardOrder = d.boardOrder.filter((x) => x !== design.id);
            for (const l of d.looks) l.designIds = l.designIds.filter((x) => x !== design.id);
          });
          onClose();
          toast(`Deleted ${design.name}`, { action: { label: copy.undo, run: () => useStudio.getState().undo(c.id) } });
        }}
      />
    </div>
  );
}

function DesignMeta({ design, onEdit }: { design: GarmentDesign; onEdit: (fn: (d: Draft<GarmentDesign>) => void, co?: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-2"><StickyNote className="size-3.5" /> Design notes</span>
      <textarea rows={5} className="field resize-y text-[13px]" placeholder="Fit ideas, details, what makes this piece special…" value={design.notes} onChange={(e) => onEdit((d) => void (d.notes = e.target.value), "notes")} />
    </label>
  );
}

