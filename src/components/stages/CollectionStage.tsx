"use client";
import { useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, Check, Columns2, Copy, Eye, GripVertical, Lightbulb, MinusCircle, PenLine, Plus, PlusCircle, Shirt, StickyNote, Trash2, X } from "lucide-react";
import type { DesignStatus, GarmentDesign, Look } from "@/lib/model/types";
import { useWorkspace } from "@/components/workspace/context";
import { StageIntro } from "@/components/workspace/StageIntro";
import { GarmentSVG } from "@/components/garment/GarmentSVG";
import { STATUS_LABELS } from "@/components/garment/GarmentEditor";
import { useImagePrintLookup } from "@/components/common/resolvers";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/controls";
import { toast } from "@/components/ui/Toast";
import { cx } from "@/components/ui/cx";
import { swatchLookup } from "@/lib/model/factory";
import { uid } from "@/lib/model/ids";
import { cohesionNotes, designMaterials, lineup, summarise } from "@/lib/collection/summary";
import { CATEGORY_LABELS, getTemplate } from "@/lib/garments/templates";
import { getFabric } from "@/lib/fabrics/fabrics";
import { getVectorPrint } from "@/lib/prints/prints";
import { nameColor } from "@/lib/color/color";
import { useStudio } from "@/lib/store/studio";
import { copy } from "@/lib/i18n/en";

const STATUSES = Object.keys(STATUS_LABELS) as DesignStatus[];

export function CollectionStage() {
  const { c, update, goto } = useWorkspace();
  const lookup = swatchLookup(c);
  const imagePrint = useImagePrintLookup(c);
  const board = lineup(c);
  const offBoard = c.designs.filter((d) => !d.onBoard);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const summary = useMemo(() => summarise(c, lineup(c)), [c]);
  const notes = useMemo(() => cohesionNotes(c), [c]);

  const setOrder = (ids: string[]) =>
    update((d) => {
      const rest = d.boardOrder.filter((id) => !ids.includes(id));
      d.boardOrder = [...ids, ...rest];
    });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = board.map((d) => d.id);
    setOrder(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  }

  function move(id: string, dir: -1 | 1) {
    const ids = board.map((d) => d.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    setOrder(arrayMove(ids, i, j));
  }

  const editDesign = (id: string, fn: (d: GarmentDesign) => void) =>
    update((draft) => {
      const d = draft.designs.find((x) => x.id === id);
      if (d) (fn(d as GarmentDesign), (d.updatedAt = Date.now()));
    });

  function setOnBoard(id: string, on: boolean) {
    update((draft) => {
      const d = draft.designs.find((x) => x.id === id);
      if (!d) return;
      d.onBoard = on;
      if (on && !draft.boardOrder.includes(id)) draft.boardOrder.push(id);
      if (!on) for (const l of draft.looks) l.designIds = l.designIds.filter((x) => x !== id);
    });
    if (!on) setCompareIds((x) => x.filter((y) => y !== id));
  }

  function duplicate(d: GarmentDesign) {
    const copyD: GarmentDesign = { ...structuredClone(d), id: uid("gd"), name: `${d.name} copy`, variationOf: undefined, variationKind: undefined, status: "draft", createdAt: Date.now(), updatedAt: Date.now(), onBoard: true };
    update((draft) => {
      draft.designs.splice(draft.designs.findIndex((x) => x.id === d.id) + 1, 0, copyD);
      const bi = draft.boardOrder.indexOf(d.id);
      draft.boardOrder.splice(bi < 0 ? draft.boardOrder.length : bi + 1, 0, copyD.id);
    });
    toast(`Duplicated as “${copyD.name}”`, { tone: "success" });
  }

  const toggleCompare = (id: string) =>
    setCompareIds((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length >= 4 ? (toast("Compare up to four pieces at a time."), x) : [...x, id]));

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <StageIntro stage="collection" />
      <div className="grid gap-8 px-4 pb-24 md:px-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          {/* ---------------------------------------------------------- line-up */}
          <section aria-labelledby="lineup-h">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <div>
                <h2 id="lineup-h" className="display text-3xl">Line-up</h2>
                <p className="text-[13px] text-ink-3">Drag to reorder, or focus a handle and use the arrow keys. The order here is the order in your presentation.</p>
              </div>
              <div className="ms-auto flex items-center gap-2">
                {compareIds.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setCompareIds([])}>
                    Clear
                  </Button>
                )}
                <Button size="sm" variant={compareIds.length >= 2 ? "primary" : "secondary"} disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>
                  <Columns2 className="size-4" /> Compare{compareIds.length ? ` ${compareIds.length}` : ""}
                </Button>
              </div>
            </div>
            {board.length === 0 ? (
              <EmptyState
                icon={<Shirt className="size-8" />}
                title="Nothing in the line-up"
                body={c.designs.length ? "Add designs from the tray below." : "Design a garment first, then it appears here."}
                action={!c.designs.length && <Button variant="primary" onClick={() => goto("garments")}>Go to garments</Button>}
              />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={board.map((d) => d.id)} strategy={rectSortingStrategy}>
                  <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                    {board.map((d, i) => (
                      <LineupCard
                        key={d.id}
                        d={d}
                        index={i}
                        total={board.length}
                        lookup={lookup}
                        imagePrint={imagePrint}
                        comparing={compareIds.includes(d.id)}
                        onCompare={() => toggleCompare(d.id)}
                        onMove={(dir) => move(d.id, dir)}
                        onStatus={(s) => editDesign(d.id, (x) => void (x.status = s))}
                        onOpen={() => goto("garments", { design: d.id })}
                        onDuplicate={() => duplicate(d)}
                        onRemove={() => setOnBoard(d.id, false)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
            {offBoard.length > 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-line-strong p-4">
                <p className="mb-3 text-[13px] font-medium text-ink-2">Not in the line-up · {offBoard.length}</p>
                <ul className="flex flex-wrap gap-3">
                  {offBoard.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1.5 ps-1.5 pe-2">
                      <GarmentSVG design={d} swatch={lookup} imagePrint={imagePrint} tight className="h-12 w-10" />
                      <span className="max-w-40 truncate text-[13px]">{d.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => setOnBoard(d.id, true)}>
                        <PlusCircle className="size-4" /> Add
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <Looks board={board} lookup={lookup} imagePrint={imagePrint} />
        </div>

        {/* ---------------------------------------------------------- aside */}
        <aside className="space-y-6" aria-label="Collection summary">
          <section className="rounded-xl border border-line bg-surface p-4">
            <h2 className="text-[15px] font-semibold">At a glance</h2>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Pieces" value={summary.count} />
              <Stat label="Looks" value={c.looks.length} />
              <Stat label="Final" value={summary.statuses.final} />
            </dl>
            <h3 className="mt-4 text-[12px] font-medium uppercase tracking-wide text-ink-3">Categories</h3>
            <ul className="mt-2 space-y-1.5">
              {summary.categories.map((cat) => (
                <li key={cat.id} className="flex items-center gap-2 text-[13px]">
                  <span className="w-28 truncate">{cat.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-lilac" style={{ width: `${(cat.count / Math.max(1, summary.count)) * 100}%` }} />
                  </span>
                  <span className="w-5 text-end tabular-nums text-ink-3">{cat.count}</span>
                </li>
              ))}
              {!summary.categories.length && <li className="text-[13px] text-ink-3">No pieces yet.</li>}
            </ul>
            <h3 className="mt-4 text-[12px] font-medium uppercase tracking-wide text-ink-3">Most used colours</h3>
            {summary.colors.length > 0 && (
              <div className="mt-2 flex h-6 overflow-hidden rounded-md border border-line" aria-hidden>
                {summary.colors.slice(0, 8).map((x) => (
                  <span key={x.hex} style={{ background: x.hex, width: `${x.share * 100}%` }} />
                ))}
              </div>
            )}
            <ul className="mt-2 space-y-1">
              {summary.colors.slice(0, 6).map((x) => (
                <li key={x.hex} className="flex items-center gap-2 text-[13px]">
                  <span className="size-3.5 rounded-full border border-black/10" style={{ background: x.hex }} />
                  <span className="truncate">{x.name}</span>
                  {!x.inPalette && <span className="rounded-full bg-surface-2 px-1.5 text-[10px] text-ink-3">off palette</span>}
                  <span className="ms-auto tabular-nums text-ink-3">{Math.round(x.share * 100)}%</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 text-[12px] font-medium uppercase tracking-wide text-ink-3">Fabrics</h3>
            <p className="mt-1 text-[13px] text-ink-2">{summary.fabrics.length ? summary.fabrics.map((f) => `${f.name} ×${f.count}`).join(" · ") : "None chosen yet"}</p>
            <h3 className="mt-3 text-[12px] font-medium uppercase tracking-wide text-ink-3">Prints</h3>
            <p className="mt-1 text-[13px] text-ink-2">{summary.prints.length ? summary.prints.map((f) => `${f.name} ×${f.count}`).join(" · ") : "No prints"}</p>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4" aria-labelledby="cohesion-h">
            <h2 id="cohesion-h" className="flex items-center gap-1.5 text-[15px] font-semibold">
              <Lightbulb className="size-4 text-lilac-strong" /> Observations
            </h2>
            <p className="text-[12px] text-ink-3">Simple checks on colour, print and category balance. They&apos;re prompts to look again, not rules.</p>
            <ul className="mt-3 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className={cx("rounded-lg px-3 py-2 text-[13px] leading-snug", n.tone === "nudge" ? "bg-butter-soft" : "bg-surface-2")}>
                  {n.text}
                  {n.designIds && n.designIds.length <= 3 && (
                    <span className="mt-1 flex flex-wrap gap-x-3">
                      {n.designIds.map((id) => (
                        <button key={id} className="text-[12px] font-medium text-lilac-strong hover:underline" onClick={() => goto("garments", { design: id })}>
                          Open {c.designs.find((d) => d.id === id)?.name}
                        </button>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4">
            <label htmlFor="col-notes" className="flex items-center gap-1.5 text-[15px] font-semibold">
              <StickyNote className="size-4" /> Collection notes
            </label>
            <textarea
              id="col-notes"
              rows={6}
              className="field mt-2 resize-y text-[13px]"
              placeholder="Story, styling ideas, what's still missing…"
              value={c.notes}
              onChange={(e) => update((d) => void (d.notes = e.target.value), { coalesce: "col-notes" })}
            />
            <p className="mt-1 text-[12px] text-ink-3">Notes appear on the last page of your presentation.</p>
          </section>
        </aside>
      </div>

      <CompareDialog open={compareOpen} onClose={() => setCompareOpen(false)} ids={compareIds} lookup={lookup} imagePrint={imagePrint} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-paper py-2">
      <dd className="display text-3xl leading-none">{value}</dd>
      <dt className="mt-1 text-[11px] text-ink-3">{label}</dt>
    </div>
  );
}

type Lookup = ReturnType<typeof swatchLookup>;
type IPLookup = ReturnType<typeof useImagePrintLookup>;

function LineupCard(p: {
  d: GarmentDesign;
  index: number;
  total: number;
  lookup: Lookup;
  imagePrint: IPLookup;
  comparing: boolean;
  onCompare: () => void;
  onMove: (dir: -1 | 1) => void;
  onStatus: (s: DesignStatus) => void;
  onOpen: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { d } = p;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: d.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx("relative rounded-xl border bg-surface p-2.5", p.comparing ? "border-lilac-strong ring-2 ring-lilac-soft" : "border-line", isDragging && "z-10 shadow-pop")}
    >
      <div className="flex items-center gap-1">
        <button {...attributes} {...listeners} aria-label={`Reorder ${d.name}, position ${p.index + 1} of ${p.total}. Press space, then arrow keys.`} className="cursor-grab rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
        <span className="text-[12px] tabular-nums text-ink-3">{String(p.index + 1).padStart(2, "0")}</span>
        <label className="ms-auto flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-[12px] text-ink-2 hover:bg-surface-2">
          <input type="checkbox" checked={p.comparing} onChange={p.onCompare} className="accent-[var(--color-lilac-strong)]" />
          Compare
        </label>
      </div>
      <button onClick={p.onOpen} className="mt-1 block w-full rounded-lg bg-paper p-2" aria-label={`Open ${d.name} in the garment editor`}>
        <GarmentSVG design={d} swatch={p.lookup} imagePrint={p.imagePrint} tight title={d.name} className="mx-auto aspect-[360/470] h-auto w-full" />
      </button>
      <p className="mt-2 truncate text-[14px] font-semibold">{d.name}</p>
      <p className="truncate text-[12px] text-ink-3">{CATEGORY_LABELS[getTemplate(d.templateId).category]}</p>
      <div className="mt-2 flex items-center gap-1">
        <select aria-label={`Status of ${d.name}`} value={d.status} onChange={(e) => p.onStatus(e.target.value as DesignStatus)} className="field h-8 min-w-0 flex-1 py-0 text-[12px]">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <IconButton size="sm" label="Move earlier" tipSide="top" disabled={p.index === 0} onClick={() => p.onMove(-1)}>
          <ArrowLeft className="size-3.5 rtl:-scale-x-100" />
        </IconButton>
        <IconButton size="sm" label="Move later" tipSide="top" disabled={p.index === p.total - 1} onClick={() => p.onMove(1)}>
          <ArrowRight className="size-3.5 rtl:-scale-x-100" />
        </IconButton>
      </div>
      <div className="mt-1 flex items-center gap-0.5 border-t border-line pt-1">
        <IconButton size="sm" label="Edit" tipSide="top" onClick={p.onOpen}><PenLine className="size-3.5" /></IconButton>
        <IconButton size="sm" label="Duplicate" tipSide="top" onClick={p.onDuplicate}><Copy className="size-3.5" /></IconButton>
        <IconButton size="sm" label="Remove from line-up" tipSide="top" className="ms-auto" onClick={p.onRemove}><MinusCircle className="size-3.5" /></IconButton>
      </div>
    </li>
  );
}

/* --------------------------------------------------------------- looks */

function Looks({ board, lookup, imagePrint }: { board: GarmentDesign[]; lookup: Lookup; imagePrint: IPLookup }) {
  const { c, update } = useWorkspace();
  const [picking, setPicking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Look | null>(null);

  const editLook = (id: string, fn: (l: Look) => void, coalesce?: string) =>
    update((d) => {
      const l = d.looks.find((x) => x.id === id);
      if (l) fn(l as Look);
    }, { coalesce: coalesce ? `look:${id}:${coalesce}` : undefined });

  function addLook() {
    const l: Look = { id: uid("lk"), name: `Look ${c.looks.length + 1}`, description: "", designIds: [] };
    update((d) => void d.looks.push(l));
    setPicking(l.id);
  }

  function duplicateLook(l: Look) {
    const n: Look = { ...structuredClone(l), id: uid("lk"), name: `${l.name} copy` };
    update((d) => void d.looks.splice(d.looks.findIndex((x) => x.id === l.id) + 1, 0, n));
  }

  const byId = new Map(c.designs.map((d) => [d.id, d]));
  const pickingLook = c.looks.find((l) => l.id === picking);

  return (
    <section aria-labelledby="looks-h">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <h2 id="looks-h" className="display text-3xl">Looks</h2>
          <p className="text-[13px] text-ink-3">Group pieces into outfits. A piece can appear in more than one look.</p>
        </div>
        <Button className="ms-auto" size="sm" onClick={addLook} disabled={!board.length}>
          <Plus className="size-4" /> New look
        </Button>
      </div>
      {c.looks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-[14px] text-ink-3">No looks yet. Create one to see pieces styled together.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {c.looks.map((l, i) => {
            const pieces = l.designIds.map((id) => byId.get(id)).filter((x): x is GarmentDesign => !!x);
            return (
              <li key={l.id} className="min-w-0 rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start gap-2">
                  <span className="display mt-0.5 text-2xl leading-none text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <input
                      aria-label="Look name"
                      className="w-full rounded bg-transparent text-[16px] font-semibold outline-none focus-visible:bg-paper"
                      value={l.name}
                      onChange={(e) => editLook(l.id, (x) => void (x.name = e.target.value.slice(0, 60)), "name")}
                      onBlur={(e) => !e.target.value.trim() && editLook(l.id, (x) => void (x.name = `Look ${i + 1}`))}
                    />
                    <textarea
                      aria-label="Look description"
                      rows={2}
                      className="mt-1 w-full resize-none rounded bg-transparent text-[13px] text-ink-2 outline-none placeholder:text-ink-4 focus-visible:bg-paper"
                      placeholder="How is it worn? Where?"
                      value={l.description}
                      onChange={(e) => editLook(l.id, (x) => void (x.description = e.target.value), "desc")}
                    />
                  </div>
                  <IconButton size="sm" label="Duplicate look" onClick={() => duplicateLook(l)}><Copy className="size-3.5" /></IconButton>
                  <IconButton size="sm" label="Delete look" onClick={() => setDeleting(l)}><Trash2 className="size-3.5" /></IconButton>
                </div>
                <div className="mt-3 flex min-h-40 items-end justify-center gap-1 rounded-lg bg-paper px-3 pt-4 pb-2">
                  {pieces.length === 0 ? (
                    <p className="self-center text-[13px] text-ink-3">No pieces yet</p>
                  ) : (
                    pieces.map((d) => (
                      <div key={d.id} className="group relative w-28 max-w-[30%]">
                        <GarmentSVG design={d} swatch={lookup} imagePrint={imagePrint} tight title={d.name} className="aspect-[360/470] h-auto w-full" />
                        <button
                          aria-label={`Remove ${d.name} from ${l.name}`}
                          onClick={() => editLook(l.id, (x) => void (x.designIds = x.designIds.filter((y) => y !== d.id)))}
                          className="absolute end-0 top-0 rounded-full border border-line bg-surface p-0.5 text-ink-3 opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{pieces.map((d) => d.name).join(" · ") || "Add pieces from your line-up"}</p>
                  <Button size="sm" variant="ghost" onClick={() => setPicking(l.id)}>
                    <PlusCircle className="size-4" /> Pieces
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!pickingLook} onClose={() => setPicking(null)} title={pickingLook ? `Pieces in ${pickingLook.name}` : "Pieces"} description="Tick the pieces worn together, in the order you'd style them." size="lg" footer={<Button variant="primary" onClick={() => setPicking(null)}>Done</Button>}>
        {pickingLook && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {board.map((d) => {
              const on = pickingLook.designIds.includes(d.id);
              return (
                <li key={d.id}>
                  <button
                    aria-pressed={on}
                    onClick={() => editLook(pickingLook.id, (x) => void (x.designIds = on ? x.designIds.filter((y) => y !== d.id) : [...x.designIds, d.id]))}
                    className={cx("relative block w-full rounded-lg border p-2 text-start", on ? "border-lilac-strong bg-lilac-wash" : "border-line bg-surface hover:bg-paper")}
                  >
                    {on && <Check className="absolute end-2 top-2 size-4 text-lilac-strong" />}
                    <GarmentSVG design={d} swatch={lookup} imagePrint={imagePrint} tight className="mx-auto aspect-[360/470] h-auto w-full" />
                    <span className="mt-1 block truncate text-[12px]">{d.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="The pieces stay in your collection; only the grouping is removed."
        onConfirm={() => {
          const l = deleting!;
          update((d) => void (d.looks = d.looks.filter((x) => x.id !== l.id)));
          setDeleting(null);
          toast(`Deleted ${l.name}`, { action: { label: copy.undo, run: () => useStudio.getState().undo(c.id) } });
        }}
      />
    </section>
  );
}

/* ------------------------------------------------------------- compare */

function CompareDialog({ open, onClose, ids, lookup, imagePrint }: { open: boolean; onClose: () => void; ids: string[]; lookup: Lookup; imagePrint: IPLookup }) {
  const { c } = useWorkspace();
  const designs = ids.map((id) => c.designs.find((d) => d.id === id)).filter((x): x is GarmentDesign => !!x);
  return (
    <Dialog open={open} onClose={onClose} title="Compare pieces" description="Side by side, with the materials each one uses." size="xl">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(2, designs.length)}, minmax(0,1fr))` }}>
        {designs.map((d) => {
          const m = designMaterials(c, d);
          const tot = [...m.colors.values()].reduce((a, b) => a + b, 0) || 1;
          const cols = [...m.colors].sort((a, b) => b[1] - a[1]).slice(0, 5);
          return (
            <div key={d.id} className="min-w-0">
              <div className="rounded-lg bg-paper p-3">
                <GarmentSVG design={d} swatch={lookup} imagePrint={imagePrint} tight className="mx-auto aspect-[360/470] h-auto max-h-[46dvh] w-full" />
              </div>
              <p className="mt-2 truncate font-semibold">{d.name}</p>
              <dl className="mt-1 space-y-1 text-[12px]">
                <Row k="Template" v={getTemplate(d.templateId).name} />
                <Row k="Status" v={STATUS_LABELS[d.status]} />
                <Row k="Fabrics" v={[...m.fabrics].map((f) => getFabric(f)?.name ?? f).join(", ") || "—"} />
                <Row k="Prints" v={[...m.prints].map((p) => getVectorPrint(p)?.name ?? c.imagePrints.find((x) => x.id === p)?.name ?? "Image").join(", ") || "None"} />
              </dl>
              <div className="mt-2 flex gap-1" aria-label="Main colours">
                {cols.map(([hex, w]) => (
                  <span key={hex} title={`${nameColor(hex)} · ${Math.round((w / tot) * 100)}%`} className="h-4 rounded-sm border border-black/10" style={{ background: hex, flex: w }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ink-3"><Eye className="size-3.5" /> Front views shown.</p>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-ink-3">{k}</dt>
      <dd className="min-w-0 text-ink-2">{v}</dd>
    </div>
  );
}
