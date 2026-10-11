"use client";
import { useEffect, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Copy, GripVertical, Info, Loader2, Pipette, Plus, Star, Trash2 } from "lucide-react";
import type { ImageRef, Palette, Swatch, SwatchRole } from "@/lib/model/types";
import { useWorkspace } from "@/components/workspace/context";
import { StageIntro } from "@/components/workspace/StageIntro";
import { useImageResolver } from "@/components/common/resolvers";
import { FabricSwatch, RefImage } from "@/components/common/visuals";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { cx } from "@/components/ui/cx";
import { activeMoodboard, activePalette, newPalette, swatch as mkSwatch } from "@/lib/model/factory";
import { extractPalette, ExtractionError, type ExtractedColor } from "@/lib/color/extract";
import { hexToRgb, inkOn, nameColor, normaliseHex, rgbToHex } from "@/lib/color/color";
import { freezeSwatch, swatchUsage, syncSwatch } from "@/lib/model/usage";
import { uid } from "@/lib/model/ids";
import { getFabric } from "@/lib/fabrics/fabrics";
import { copy } from "@/lib/i18n/en";
import { useStudio } from "@/lib/store/studio";

const ROLES: { id: SwatchRole; label: string }[] = [
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "accent", label: "Accent" },
  { id: "neutral", label: "Neutral" },
  { id: "none", label: "No role" },
];

export function ColorsStage() {
  const { c, update, param, setParam, mode } = useWorkspace();
  const pal = activePalette(c);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<{ swatch: Swatch; hex: string; usage: { panels: number; designs: number } } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const editPal = (fn: (p: Palette) => void, coalesce?: string) =>
    update((d) => {
      const p = d.palettes.find((x) => x.id === pal.id);
      if (p) fn(p as Palette);
    }, { coalesce });

  function addColor(hex: string, name?: string) {
    const n = normaliseHex(hex);
    if (!n) return;
    const s = mkSwatch(n, name ?? nameColor(n), pal.swatches.length === 0 ? "primary" : "none");
    editPal((p) => void p.swatches.push(s));
    setEditing(s.id);
  }

  function commitHex(s: Swatch, hex: string) {
    const n = normaliseHex(hex);
    if (!n || n === s.hex) return;
    const usage = swatchUsage(c, s.id);
    if (usage.panels > 0) setPending({ swatch: s, hex: n, usage });
    else
      update((d) => {
        const sw = d.palettes.flatMap((p) => p.swatches).find((x) => x.id === s.id);
        if (sw) sw.hex = n;
        syncSwatch(d, s.id, n);
      });
  }

  function resolvePending(all: boolean) {
    if (!pending) return;
    const { swatch: s, hex } = pending;
    update((d) => {
      if (!all) freezeSwatch(d, s.id, s.hex);
      const sw = d.palettes.flatMap((p) => p.swatches).find((x) => x.id === s.id);
      if (sw) sw.hex = hex;
      if (all) syncSwatch(d, s.id, hex);
    });
    toast(all ? `Updated ${pending.usage.panels} linked panel${pending.usage.panels === 1 ? "" : "s"}` : "Palette updated. Your designs keep their current colour.", { tone: "success" });
    setPending(null);
  }

  function removeSwatch(s: Swatch) {
    update((d) => {
      freezeSwatch(d, s.id, s.hex);
      const p = d.palettes.find((x) => x.id === pal.id)!;
      p.swatches = p.swatches.filter((x) => x.id !== s.id);
    });
    toast(`Removed ${s.name}. Designs using it keep the colour.`, { action: { label: copy.undo, run: () => useStudio.getState().undo(c.id) } });
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = pal.swatches.findIndex((s) => s.id === e.active.id);
    const to = pal.swatches.findIndex((s) => s.id === e.over!.id);
    editPal((p) => void (p.swatches = arrayMove(p.swatches, from, to)));
  }

  const count = pal.swatches.length;
  return (
    <div className="mx-auto w-full max-w-[1300px]">
      <StageIntro stage="colors" />
      <div className="grid gap-8 px-4 pb-20 md:px-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <PaletteTabs />
          <section aria-label="Palette colours">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pal.swatches.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {pal.swatches.map((s, i) => (
                    <SwatchCard
                      key={s.id}
                      s={s}
                      index={i}
                      total={count}
                      editing={editing === s.id}
                      onEdit={() => setEditing(editing === s.id ? null : s.id)}
                      onName={(name) => editPal((p) => void (p.swatches.find((x) => x.id === s.id)!.name = name), `name:${s.id}`)}
                      onRole={(role) => editPal((p) => void (p.swatches.find((x) => x.id === s.id)!.role = role))}
                      onHex={(hex) => commitHex(s, hex)}
                      onMove={(dir) => editPal((p) => void (p.swatches = arrayMove(p.swatches, i, i + dir)))}
                      onRemove={() => removeSwatch(s)}
                      usage={swatchUsage(c, s.id).panels}
                    />
                  ))}
                  <AddSwatch onAdd={addColor} />
                </div>
              </SortableContext>
            </DndContext>
            <p className={cx("mt-3 flex items-center gap-1.5 text-[13px]", count > 8 || (count > 0 && count < 4) ? "text-ink-2" : "text-ink-3")}>
              <Info className="size-4 shrink-0" />
              {count === 0 ? "Start with three or four colours. You can pull them from an image." : count < 4 ? `${count} colour${count === 1 ? "" : "s"} so far. Most collections feel complete with 4 to 8.` : count > 8 ? `${count} colours. That's a rich palette; consider saving some as an alternate so the collection stays focused.` : `${count} colours, a comfortable range for a collection.`}
            </p>
          </section>
          <FabricPreview />
          <p className="text-[12px] leading-relaxed text-ink-3">{copy.colorDisclaimer}</p>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-32 xl:self-start">
          <Extractor fromItem={param("from")} onConsumed={() => setParam("from", null)} onAdd={(cols) => cols.forEach((x) => addColor(x.hex, x.name))} guided={mode === "guided"} />
        </aside>
      </div>
      <Dialog
        open={!!pending}
        onClose={() => setPending(null)}
        title="Update linked garments?"
        size="sm"
        description={pending && `${pending.swatch.name} is used in ${pending.usage.panels} garment panel${pending.usage.panels === 1 ? "" : "s"} across ${pending.usage.designs} design${pending.usage.designs === 1 ? "" : "s"}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button onClick={() => resolvePending(false)}>Palette only</Button>
            <Button variant="primary" data-autofocus onClick={() => resolvePending(true)}>Update all linked</Button>
          </>
        }
      >
        {pending && (
          <div className="flex items-center gap-3 py-2">
            <div className="size-14 rounded-md ring-1 ring-black/10" style={{ background: pending.swatch.hex }} />
            <ArrowRight className="size-4 text-ink-3" />
            <div className="size-14 rounded-md ring-1 ring-black/10" style={{ background: pending.hex }} />
            <p className="ms-2 text-[13px] text-ink-3">“Palette only” keeps your designs exactly as they look now and unlinks them from this colour.</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function PaletteTabs() {
  const { c, update } = useWorkspace();
  const pal = activePalette(c);
  const [renaming, setRenaming] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Palettes" className="flex flex-wrap gap-1">
        {c.palettes.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === pal.id}
            onClick={() => update((d) => void (d.activePaletteId = p.id))}
            onDoubleClick={() => setRenaming(true)}
            className={cx("flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors", p.id === pal.id ? "border-ink bg-surface font-medium" : "border-line text-ink-3 hover:border-line-strong")}
          >
            <span className="flex h-3 w-8 overflow-hidden rounded-sm">{p.swatches.slice(0, 6).map((s) => <span key={s.id} className="flex-1" style={{ background: s.hex }} />)}</span>
            {p.name}
            {p.id === c.activePaletteId && c.palettes.length > 1 && <Star className="size-3 fill-current text-lilac-strong" aria-label="active" />}
          </button>
        ))}
      </div>
      <div className="ms-auto flex items-center gap-1">
        {renaming ? (
          <form onSubmit={(e) => (e.preventDefault(), setRenaming(false))}>
            <input autoFocus aria-label="Palette name" className="field h-8 w-44 py-1 text-[13px]" value={pal.name} onBlur={() => setRenaming(false)} onChange={(e) => update((d) => void (d.palettes.find((x) => x.id === pal.id)!.name = e.target.value), { coalesce: "palname" })} />
          </form>
        ) : (
          <button className="rounded-full px-2.5 py-1 text-[12px] text-ink-3 hover:bg-surface-2 hover:text-ink" onClick={() => setRenaming(true)}>Rename</button>
        )}
        <IconButton size="sm" label="Save a copy as an alternate palette" onClick={() => update((d) => {
          const copyP = { ...structuredClone(pal), id: uid("pal"), name: `${pal.name} alternate`, swatches: pal.swatches.map((s) => ({ ...s, id: uid("sw") })) };
          d.palettes.push(copyP);
          d.activePaletteId = copyP.id;
        })}>
          <Copy className="size-4" />
        </IconButton>
        <IconButton size="sm" label="New empty palette" onClick={() => update((d) => {
          const p = newPalette(`Palette ${d.palettes.length + 1}`);
          d.palettes.push(p);
          d.activePaletteId = p.id;
        })}>
          <Plus className="size-4" />
        </IconButton>
        {c.palettes.length > 1 && (
          <IconButton size="sm" label="Delete this palette" className="hover:text-danger" onClick={() => {
            update((d) => {
              for (const s of pal.swatches) freezeSwatch(d, s.id, s.hex);
              d.palettes = d.palettes.filter((p) => p.id !== pal.id);
              d.activePaletteId = d.palettes[0].id;
            });
            toast(`Deleted ${pal.name}`, { action: { label: copy.undo, run: () => useStudio.getState().undo(c.id) } });
          }}>
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function SwatchCard(p: {
  s: Swatch;
  index: number;
  total: number;
  editing: boolean;
  usage: number;
  onEdit: () => void;
  onName: (n: string) => void;
  onRole: (r: SwatchRole) => void;
  onHex: (h: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { s } = p;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const [hex, setHex] = useState(s.hex);
  const [live, setLive] = useState(s.hex);
  useEffect(() => (setHex(s.hex), setLive(s.hex)), [s.hex]);
  const rgb = hexToRgb(live);
  const ink = inkOn(live);
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx("overflow-hidden rounded-lg border border-line bg-surface", isDragging && "z-10 shadow-pop")}>
      <div className="relative h-28" style={{ background: live }}>
        <button {...attributes} {...listeners} aria-label={`Reorder ${s.name}. Use arrow keys after pressing space.`} className="absolute start-1.5 top-1.5 cursor-grab rounded p-1 opacity-70 hover:opacity-100" style={{ color: ink }}>
          <GripVertical className="size-4" />
        </button>
        {s.role !== "none" && <span className="absolute end-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: ink, background: ink === "#2B2826" ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.25)" }}>{s.role}</span>}
        <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center gap-1.5 px-3 py-2 text-[12px] font-medium" style={{ color: ink }}>
          <Pipette className="size-3.5" /> Change colour
          <input type="color" className="sr-only" value={live} onChange={(e) => setLive(e.target.value.toUpperCase())} onBlur={() => p.onHex(live)} />
        </label>
      </div>
      <div className="space-y-2 p-3">
        <input aria-label="Colour name" className="w-full rounded bg-transparent px-1 py-0.5 text-[15px] font-semibold hover:bg-surface-2 focus:bg-surface-2 focus:outline-none" value={s.name} onChange={(e) => p.onName(e.target.value)} />
        <div className="flex items-center gap-2">
          <input
            aria-label="HEX value"
            className="w-[84px] rounded border border-line px-1.5 py-0.5 font-mono text-[12px] uppercase focus:border-lilac-strong focus:outline-none"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            onBlur={() => (normaliseHex(hex) ? p.onHex(hex) : setHex(s.hex))}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          <span className="font-mono text-[11px] text-ink-3">RGB {rgb.join(" ")}</span>
        </div>
        {p.editing && (
          <div className="grid grid-cols-3 gap-1">
            {(["R", "G", "B"] as const).map((ch, i) => (
              <label key={ch} className="flex items-center gap-1 rounded border border-line px-1.5 text-[11px] text-ink-3">
                {ch}
                <input type="number" min={0} max={255} className="w-full bg-transparent py-0.5 font-mono text-ink outline-none" value={rgb[i]} onChange={(e) => {
                  const v = [...rgb] as [number, number, number];
                  v[i] = Math.max(0, Math.min(255, +e.target.value || 0));
                  setLive(rgbToHex(v));
                  setHex(rgbToHex(v));
                }} onBlur={() => p.onHex(live)} />
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1">
          <select aria-label="Role" className="h-7 flex-1 rounded border border-line bg-surface px-1 text-[12px] text-ink-2" value={s.role} onChange={(e) => p.onRole(e.target.value as SwatchRole)}>
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <IconButton size="sm" label="Move left" disabled={p.index === 0} onClick={() => p.onMove(-1)} className="size-7"><ArrowLeft className="size-3.5" /></IconButton>
          <IconButton size="sm" label="Move right" disabled={p.index === p.total - 1} onClick={() => p.onMove(1)} className="size-7"><ArrowRight className="size-3.5" /></IconButton>
          <IconButton size="sm" label={`Remove ${s.name}`} onClick={p.onRemove} className="size-7 hover:text-danger"><Trash2 className="size-3.5" /></IconButton>
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-3">
          <span>{p.usage ? `Used in ${p.usage} panel${p.usage === 1 ? "" : "s"}` : "Not used yet"}</span>
          <button onClick={p.onEdit} className="hover:text-ink">{p.editing ? "Hide RGB" : "Edit RGB"}</button>
        </div>
      </div>
    </div>
  );
}

function AddSwatch({ onAdd }: { onAdd: (hex: string) => void }) {
  const [hex, setHex] = useState("#C9BFE0");
  return (
    <div className="flex min-h-[220px] flex-col justify-between rounded-lg border border-dashed border-line-strong p-3">
      <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-md text-[13px] text-ink-3 hover:bg-surface-2">
        <span className="size-12 rounded-full ring-1 ring-black/10" style={{ background: hex }} />
        Pick a colour
        <input type="color" className="sr-only" value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} />
      </label>
      <div className="mt-2 flex gap-1">
        <input aria-label="New colour HEX" className="w-full rounded border border-line px-1.5 font-mono text-[12px] uppercase" value={hex} onChange={(e) => setHex(e.target.value)} />
        <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => onAdd(hex)} disabled={!normaliseHex(hex)}>Add</Button>
      </div>
    </div>
  );
}

function Extractor({ fromItem, onConsumed, onAdd, guided }: { fromItem: string | null; onConsumed: () => void; onAdd: (c: ExtractedColor[]) => void; guided: boolean }) {
  const { c } = useWorkspace();
  const resolve = useImageResolver();
  const mb = activeMoodboard(c);
  const sources = useMemo(() => {
    const refs: { key: string; ref: ImageRef }[] = [];
    const seen = new Set<string>();
    for (const it of mb.items) if (it.type === "image") {
      const k = `${it.image.kind}:${it.image.id}`;
      if (!seen.has(k)) (seen.add(k), refs.push({ key: it.id, ref: it.image }));
    }
    for (const id of c.saved.inspiration) if (!seen.has(`library:${id}`)) (seen.add(`library:${id}`), refs.push({ key: id, ref: { kind: "library", id } }));
    return refs;
  }, [mb.items, c.saved.inspiration]);
  const [sel, setSel] = useState<string | null>(null);
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; colors: ExtractedColor[]; error?: string; picked: Set<string> }>({ status: "idle", colors: [], picked: new Set() });

  async function run(key: string) {
    setSel(key);
    const src = sources.find((s) => s.key === key);
    if (!src) return;
    const url = resolve(src.ref).src;
    setState({ status: "loading", colors: [], picked: new Set() });
    try {
      if (!url) throw new ExtractionError("This image isn't available in this browser, so its colours can't be read. Add colours by hand instead.");
      const colors = await extractPalette(url, 6);
      setState({ status: "done", colors, picked: new Set(colors.slice(0, 5).map((x) => x.hex)) });
    } catch (e) {
      setState({ status: "error", colors: [], picked: new Set(), error: e instanceof Error ? e.message : "Couldn't read this image." });
    }
  }

  useEffect(() => {
    if (fromItem && sources.some((s) => s.key === fromItem)) {
      void run(fromItem);
      onConsumed();
    }
  }, [fromItem]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-labelledby="extract-h">
      <h2 id="extract-h" className="flex items-center gap-2 text-[15px] font-semibold"><Pipette className="size-4 text-lilac-strong" /> Pull colours from an image</h2>
      {guided && <p className="mt-1 text-[13px] text-ink-3">Choose a moodboard image. Yamica reads its actual pixels and suggests the main colours.</p>}
      {sources.length ? (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {sources.slice(0, 16).map((s) => (
            <button key={s.key} onClick={() => run(s.key)} aria-pressed={sel === s.key} aria-label="Use this image" className={cx("overflow-hidden rounded-md ring-offset-2 transition-shadow", sel === s.key ? "ring-2 ring-lilac-strong" : "hover:ring-2 hover:ring-line-strong")}>
              <RefImage image={s.ref} className="aspect-square" />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-surface-2 p-3 text-[13px] text-ink-3">Add images to your moodboard first, or pick colours by hand on the left.</p>
      )}
      {state.status === "loading" && <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-3"><Loader2 className="size-4 animate-spin" /> Reading colours…</p>}
      {state.status === "error" && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-soft p-3 text-[13px] text-danger"><AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}</p>
      )}
      {state.status === "done" && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] text-ink-3">Tap to choose which to add. Bars show how much of the image each colour covers.</p>
          <div className="grid gap-1.5">
            {state.colors.map((col) => {
              const on = state.picked.has(col.hex);
              return (
                <button
                  key={col.hex}
                  aria-pressed={on}
                  onClick={() => setState((s) => {
                    const picked = new Set(s.picked);
                    if (on) picked.delete(col.hex);
                    else picked.add(col.hex);
                    return { ...s, picked };
                  })}
                  className={cx("flex items-center gap-3 rounded-md border p-1.5 pe-3 text-start", on ? "border-lilac-strong bg-lilac-wash" : "border-line")}
                >
                  <span className="flex size-9 items-center justify-center rounded" style={{ background: col.hex, color: inkOn(col.hex) }}>{on && <Check className="size-4" />}</span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium">{col.name}</span>
                    <span className="font-mono text-[11px] text-ink-3">{col.hex}</span>
                  </span>
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3"><span className="block h-full bg-ink-3" style={{ width: `${Math.max(6, col.share * 100)}%` }} /></span>
                </button>
              );
            })}
          </div>
          <Button className="mt-3 w-full" variant="primary" disabled={!state.picked.size} onClick={() => (onAdd(state.colors.filter((x) => state.picked.has(x.hex))), toast(`Added ${state.picked.size} colour${state.picked.size === 1 ? "" : "s"} to your palette`, { tone: "success" }), setState({ status: "idle", colors: [], picked: new Set() }), setSel(null))}>
            Add {state.picked.size} to palette
          </Button>
        </div>
      )}
    </section>
  );
}

function FabricPreview() {
  const { c } = useWorkspace();
  const pal = activePalette(c);
  const fabrics = (c.saved.fabrics.length ? c.saved.fabrics : ["cotton-poplin", "linen", "denim-light", "satin"]).map(getFabric).filter(Boolean).slice(0, 5);
  if (!pal.swatches.length) return null;
  return (
    <section aria-labelledby="fab-prev">
      <h2 id="fab-prev" className="text-[15px] font-semibold">Palette on fabric</h2>
      <p className="mb-3 text-[13px] text-ink-3">{c.saved.fabrics.length ? "Your saved fabrics in each colour." : "Sample fabrics in each colour. Save fabrics in the next stage to see your own."}</p>
      <div className="scroll-thin overflow-x-auto">
        <table className="border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th />
              {pal.swatches.map((s) => (
                <th key={s.id} className="w-16 text-start text-[11px] font-medium text-ink-3"><span className="block truncate">{s.name}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fabrics.map((f) => (
              <tr key={f!.id}>
                <th scope="row" className="pe-2 text-start text-[12px] font-medium whitespace-nowrap text-ink-2">{f!.name}</th>
                {pal.swatches.map((s) => (
                  <td key={s.id}><FabricSwatch fabricId={f!.id} color={s.hex} className="size-16 rounded-md" zoom={2} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
