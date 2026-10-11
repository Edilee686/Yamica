"use client";
import { useEffect, useState } from "react";
import type { Draft } from "immer";
import { Check, ImageIcon, Link2, Link2Off, PaintBucket, Pencil, Shirt } from "lucide-react";
import type { Collection, GarmentDesign, PanelConfig, PrintFill, Swatch } from "@/lib/model/types";
import { FABRICS, TEXTURES, getFabric } from "@/lib/fabrics/fabrics";
import { PRINTS, getVectorPrint } from "@/lib/prints/prints";
import { activePalette, swatchLookup } from "@/lib/model/factory";
import { panelInfo } from "@/lib/garments/edit";
import { resolveColor, resolvePanelConfig } from "@/lib/garments/resolve";
import { swatchUsage } from "@/lib/model/usage";
import { inkOn, normaliseHex } from "@/lib/color/color";
import { FabricSwatch, PrintSwatch } from "@/components/common/visuals";
import { Segmented, Slider, Toggle } from "@/components/ui/controls";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useStudio } from "@/lib/store/studio";

export interface PanelInspectorProps {
  c: Collection;
  design: GarmentDesign;
  panelId: string;
  onEdit: (fn: (cfg: Draft<PanelConfig>) => void, coalesce?: string) => void;
  onLink: (group: string, linked: boolean) => void;
  onApplyToAll: () => void;
  onEditSwatch: (swatch: Swatch, hex: string, scope: "all" | "panel") => void;
}

export function PanelInspector({ c, design, panelId, onEdit, onLink, onApplyToAll, onEditSwatch }: PanelInspectorProps) {
  const info = panelInfo(design, panelId);
  const cfg = resolvePanelConfig(design, panelId);
  const pal = activePalette(c);
  const lookup = swatchLookup(c);
  const urls = useStudio((s) => s.uploadUrls);
  const [section, setSection] = useState<"solid" | "print">(cfg.fill.type);
  useEffect(() => setSection(cfg.fill.type), [panelId, cfg.fill.type]);
  if (!info) return null;
  const linked = info.mirrorGroup ? design.mirrorLinks[info.mirrorGroup] !== false : false;

  const fabric = getFabric(cfg.fabricId);
  const savedFabrics = c.saved.fabrics;
  const fabricList = [...FABRICS].sort((a, b) => Number(savedFabrics.includes(b.id)) - Number(savedFabrics.includes(a.id)));
  const printList = [...PRINTS].sort((a, b) => Number(c.saved.prints.includes(b.id)) - Number(c.saved.prints.includes(a.id)));

  function setSolid(hex: string, swatchId?: string) {
    onEdit((p) => {
      p.fill = { type: "solid", color: swatchId ? { hex, swatchId } : { hex } };
    });
  }

  function setPrint(printId: string) {
    useStudio.getState().noteRecent("print", printId);
    onEdit((p) => {
      const prev = p.fill.type === "print" ? p.fill : null;
      const v = getVectorPrint(printId);
      p.fill = {
        type: "print",
        printId,
        scale: prev?.scale ?? 1,
        rotation: prev?.rotation ?? 0,
        offsetX: prev?.offsetX ?? 0,
        offsetY: prev?.offsetY ?? 0,
        colors: v && prev && getVectorPrint(prev.printId) === v ? prev.colors : {},
      } as PrintFill;
    });
  }

  const printFill = cfg.fill.type === "print" ? cfg.fill : null;
  const vector = printFill ? getVectorPrint(printFill.printId) : undefined;

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="eyebrow">Selected panel</p>
        <p className="mt-0.5 text-[18px] font-semibold">{info.label}</p>
        {info.mirrorGroup && (
          <button onClick={() => onLink(info.mirrorGroup!, !linked)} aria-pressed={linked} className={cx("mt-2 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium", linked ? "border-lilac-strong/40 bg-lilac-wash text-lilac-deep" : "border-line text-ink-3")}>
            {linked ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}
            {linked ? "Left & right linked" : "Editing this side only"}
          </button>
        )}
      </div>

      <Segmented
        label="Fill"
        value={section}
        onChange={(v) => {
          setSection(v);
          if (v === "print" && cfg.fill.type !== "print") setPrint(c.saved.prints[0] ?? "fine-stripe");
          if (v === "solid" && cfg.fill.type !== "solid") setSolid(pal.swatches[0]?.hex ?? "#F3EEE3", pal.swatches[0]?.id);
        }}
        className="w-full [&>button]:flex-1"
        options={[
          { value: "solid", label: <span className="flex items-center justify-center gap-1.5"><PaintBucket className="size-3.5" /> Solid colour</span> },
          { value: "print", label: <span className="flex items-center justify-center gap-1.5"><Shirt className="size-3.5" /> Print</span> },
        ]}
      />

      {section === "solid" && cfg.fill.type === "solid" && <SolidPicker c={c} value={cfg.fill.color} onPick={setSolid} onEditSwatch={onEditSwatch} />}

      {section === "print" && (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-2">Print</p>
            <div className="scroll-thin grid max-h-[220px] grid-cols-4 gap-1.5 overflow-y-auto pe-1">
              {c.imagePrints.map((p) => (
                <button key={p.id} onClick={() => setPrint(p.id)} title={`${p.name} · image print`} aria-label={`Use ${p.name}`} aria-pressed={printFill?.printId === p.id} className={cx("relative overflow-hidden rounded-md ring-offset-1", printFill?.printId === p.id ? "ring-2 ring-lilac-strong" : "hover:ring-2 hover:ring-line-strong")}>
                  <PrintSwatch printId={p.id} imageUrl={urls[p.uploadId]} className="aspect-square" scale={0.4} />
                  <ImageIcon className="absolute end-0.5 bottom-0.5 size-3 rounded-sm bg-surface/90 p-px" />
                </button>
              ))}
              {printList.map((p) => (
                <button key={p.id} onClick={() => setPrint(p.id)} title={`${p.name}${c.saved.prints.includes(p.id) ? " · saved to collection" : ""}`} aria-label={`Use ${p.name}`} aria-pressed={printFill?.printId === p.id} className={cx("relative overflow-hidden rounded-md ring-offset-1", printFill?.printId === p.id ? "ring-2 ring-lilac-strong" : "hover:ring-2 hover:ring-line-strong")}>
                  <PrintSwatch printId={p.id} className="aspect-square" size={56} />
                  {c.saved.prints.includes(p.id) && <span className="absolute start-0.5 top-0.5 size-2 rounded-full bg-lilac-strong ring-2 ring-white" aria-hidden />}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-3">Dots mark prints saved to this collection.</p>
          </div>
          {printFill && (
            <>
              <p className="text-[13px] font-medium">{vector?.name ?? c.imagePrints.find((x) => x.id === printFill.printId)?.name}</p>
              <Slider label="Scale" value={printFill.scale} min={0.25} max={4} step={0.05} onChange={(v) => onEdit((p) => void ((p.fill as PrintFill).scale = v), "scale")} format={(v) => `${v.toFixed(2)}×`} resetTo={1} hint="Relative repeat size, not a physical measurement." />
              <Slider label="Rotation" value={printFill.rotation} min={-180} max={180} onChange={(v) => onEdit((p) => void ((p.fill as PrintFill).rotation = v), "rot")} format={(v) => `${Math.round(v)}°`} resetTo={0} />
              <Slider label="Horizontal offset" value={printFill.offsetX} min={-100} max={100} onChange={(v) => onEdit((p) => void ((p.fill as PrintFill).offsetX = v), "ox")} resetTo={0} />
              <Slider label="Vertical offset" value={printFill.offsetY} min={-100} max={100} onChange={(v) => onEdit((p) => void ((p.fill as PrintFill).offsetY = v), "oy")} resetTo={0} />
              {vector ? (
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-ink-2">Recolour <span className="font-normal text-sage-deep">· vector print</span></p>
                  <div className="space-y-2">
                    {vector.slots.map((s) => {
                      const cur = printFill.colors?.[s.key];
                      const hex = cur ? resolveColor(cur, lookup) : s.default;
                      return (
                        <div key={s.key} className="flex items-center gap-2">
                          <span className="w-20 shrink-0 truncate text-[12px] text-ink-3" title={s.label}>{s.label}</span>
                          <div className="flex flex-wrap gap-1">
                            <SwatchDot hex={s.default} title="Original" on={!cur} onClick={() => onEdit((p) => void delete (p.fill as PrintFill).colors[s.key])} />
                            {pal.swatches.map((sw) => (
                              <SwatchDot key={sw.id} hex={sw.hex} title={sw.name} on={cur?.swatchId === sw.id} onClick={() => onEdit((p) => void ((p.fill as PrintFill).colors[s.key] = { hex: sw.hex, swatchId: sw.id }))} />
                            ))}
                            <input type="color" aria-label={`${s.label}: custom colour`} value={hex} onChange={(e) => onEdit((p) => void ((p.fill as PrintFill).colors[s.key] = { hex: e.target.value.toUpperCase() }), `slot-${s.key}`)} className="h-6 w-7 cursor-pointer rounded border border-line-strong bg-surface" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="rounded-md bg-surface-2 p-3 text-[12px] text-ink-3">This is an uploaded image print. You can scale, rotate and move it, but its colours can't be changed independently.</p>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-2">Fabric</p>
        <select aria-label="Fabric" className="field h-10 py-1 text-[14px]" value={cfg.fabricId ?? ""} onChange={(e) => (onEdit((p) => void (p.fabricId = e.target.value || undefined)), e.target.value && useStudio.getState().noteRecent("fabric", e.target.value))}>
          {savedFabrics.length > 0 && (
            <optgroup label="Saved to collection">
              {fabricList.filter((f) => savedFabrics.includes(f.id)).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </optgroup>
          )}
          <optgroup label={savedFabrics.length ? "All fabrics" : "Fabrics"}>
            {fabricList.filter((f) => !savedFabrics.includes(f.id)).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </optgroup>
        </select>
        {fabric && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-3">
            <FabricSwatch fabricId={fabric.id} color={cfg.fill.type === "solid" ? resolveColor(cfg.fill.color, lookup) : undefined} className="size-8 rounded" zoom={2} />
            {fabric.summary}
          </div>
        )}
        <label className="mt-3 block">
          <span className="mb-1 block text-[12px] text-ink-3">Surface texture</span>
          <select aria-label="Surface texture" className="field h-9 py-1 text-[13px]" value={cfg.textureId ?? ""} onChange={(e) => onEdit((p) => void (p.textureId = (e.target.value || undefined) as PanelConfig["textureId"]))}>
            <option value="">From fabric ({TEXTURES.find((t) => t.id === fabric?.textureId)?.name ?? "none"})</option>
            <option value="none">No texture</option>
            {TEXTURES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>

      <Toggle label="Show outline" checked={cfg.outline !== false} onChange={(v) => onEdit((p) => void (p.outline = v))} />

      <Button size="sm" variant="ghost" className="w-full" onClick={onApplyToAll}>Apply this panel's look to the whole garment</Button>
    </div>
  );
}

function SwatchDot({ hex, title, on, onClick }: { hex: string; title: string; on: boolean; onClick: () => void }) {
  return (
    <button title={title} aria-label={title} aria-pressed={on} onClick={onClick} className={cx("flex size-6 items-center justify-center rounded-full ring-1 ring-black/10 ring-inset", on && "outline-2 outline-offset-1 outline-lilac-strong")} style={{ background: hex }}>
      {on && <Check className="size-3" style={{ color: inkOn(hex) }} />}
    </button>
  );
}

function SolidPicker({ c, value, onPick, onEditSwatch }: { c: Collection; value: { hex: string; swatchId?: string }; onPick: (hex: string, swatchId?: string) => void; onEditSwatch: (s: Swatch, hex: string, scope: "all" | "panel") => void }) {
  const pal = activePalette(c);
  const lookup = swatchLookup(c);
  const hex = resolveColor(value, lookup);
  const linkedSwatch = value.swatchId ? c.palettes.flatMap((p) => p.swatches).find((s) => s.id === value.swatchId) : undefined;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(hex);
  useEffect(() => (setDraft(hex), setEditing(false)), [hex, value.swatchId]);
  const usage = linkedSwatch ? swatchUsage(c, linkedSwatch.id) : null;
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-2">Palette · {pal.name}</p>
        {pal.swatches.length ? (
          <div className="flex flex-wrap gap-1.5">
            {pal.swatches.map((s) => (
              <button key={s.id} onClick={() => onPick(s.hex, s.id)} aria-pressed={value.swatchId === s.id} title={s.name} aria-label={`Apply ${s.name}`} className={cx("flex size-9 items-center justify-center rounded-full ring-1 ring-black/10 ring-inset transition-transform hover:scale-105", value.swatchId === s.id && "outline-2 outline-offset-2 outline-lilac-strong")} style={{ background: s.hex }}>
                {value.swatchId === s.id && <Check className="size-4" style={{ color: inkOn(s.hex) }} />}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink-3">Your palette is empty. Add colours in the Colours stage.</p>
        )}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-line p-2">
        <span className="size-8 shrink-0 rounded ring-1 ring-black/10" style={{ background: hex }} />
        <div className="min-w-0 flex-1 text-[12px]">
          <p className="truncate font-medium">{linkedSwatch ? linkedSwatch.name : "Custom colour"}</p>
          <p className="font-mono text-ink-3">{hex}{linkedSwatch ? " · linked to palette" : " · not linked"}</p>
        </div>
        {linkedSwatch ? (
          <button onClick={() => setEditing(!editing)} className="tip relative rounded p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink" data-tip="Edit colour" aria-label="Edit colour"><Pencil className="size-4" /></button>
        ) : (
          <input type="color" aria-label="Custom colour" value={hex} onChange={(e) => onPick(e.target.value.toUpperCase())} className="h-8 w-9 cursor-pointer rounded border border-line-strong bg-surface" />
        )}
      </div>
      {editing && linkedSwatch && (
        <div className="space-y-2 rounded-md bg-surface-2 p-3">
          <div className="flex items-center gap-2">
            <input type="color" aria-label="New colour" value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer rounded border border-line-strong bg-surface" />
            <input aria-label="New colour HEX" value={draft} onChange={(e) => setDraft(e.target.value)} className="w-24 rounded border border-line bg-surface px-2 py-1 font-mono text-[12px]" />
          </div>
          <p className="text-[12px] text-ink-3">{linkedSwatch.name} is used in {usage?.panels} panel{usage?.panels === 1 ? "" : "s"} across {usage?.designs} design{usage?.designs === 1 ? "" : "s"}.</p>
          <div className="grid gap-1.5">
            <Button size="sm" variant="primary" disabled={!normaliseHex(draft)} onClick={() => onEditSwatch(linkedSwatch, normaliseHex(draft)!, "all")}>Update all {usage?.panels} linked panels</Button>
            <Button size="sm" disabled={!normaliseHex(draft)} onClick={() => onEditSwatch(linkedSwatch, normaliseHex(draft)!, "panel")}>Change only this panel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
