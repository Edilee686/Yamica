"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Magnet, Maximize, Minus, Monitor, Plus, SlidersHorizontal } from "lucide-react";
import type { Draft } from "immer";
import type { Collection, ImageRef, MoodItem, Moodboard } from "@/lib/model/types";
import { useWorkspace } from "@/components/workspace/context";
import { StageIntro } from "@/components/workspace/StageIntro";
import { MoodboardEditor } from "@/components/moodboard/MoodboardEditor";
import { MoodboardSVG } from "@/components/moodboard/MoodboardSVG";
import { AssetPanel, type AddAction } from "@/components/moodboard/AssetPanel";
import { Inspector, type LayerOp } from "@/components/moodboard/Inspector";
import { useImageResolver } from "@/components/common/resolvers";
import { Button, IconButton } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { activeMoodboard, activePalette, swatchLookup } from "@/lib/model/factory";
import { applyLayout, BOARD_H, BOARD_W, getLayout } from "@/lib/moodboard/layouts";
import { duplicateItem, imageItem, shapeItem, swatchItem, textItem } from "@/lib/moodboard/ops";
import { useStudio } from "@/lib/store/studio";
import { exportElement } from "@/lib/export/raster";
import { downloadBlob, safeFileName } from "@/lib/export/download";
import { copy } from "@/lib/i18n/en";

function board(d: Draft<Collection>): Draft<Moodboard> {
  return d.moodboards.find((m) => m.id === d.activeMoodboardId) ?? d.moodboards[0];
}

export function MoodboardStage() {
  const { c, update, goto } = useWorkspace();
  const mb = activeMoodboard(c);
  const pal = activePalette(c);
  const resolve = useImageResolver();
  const lookup = swatchLookup(c);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [guides, setGuides] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [sheet, setSheet] = useState<"add" | "edit" | null>(null);
  const [exporting, setExporting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const addUpload = useStudio((s) => s.addUpload);
  const uploads = useStudio((s) => s.uploads);

  const selected = mb.items.find((i) => i.id === selectedId) ?? null;
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  const patchItem = useCallback(
    (id: string, patch: Partial<MoodItem>, coalesce?: string) =>
      update(
        (d) => {
          const it = board(d).items.find((i) => i.id === id);
          if (it) Object.assign(it, patch);
        },
        { coalesce: coalesce ? `${id}:${coalesce}` : undefined },
      ),
    [update],
  );

  const addItem = useCallback(
    (it: MoodItem, save?: { kind: "inspiration" | "uploads"; id: string }) => {
      update((d) => {
        board(d).items.push(it);
        if (save && !d.saved[save.kind].includes(save.id)) d.saved[save.kind].push(save.id);
      });
      setSelectedId(it.id);
      setCropMode(false);
    },
    [update],
  );

  const addImage = useCallback(
    (ref: ImageRef, at?: { x: number; y: number }) => {
      const r = resolve(ref);
      addItem(imageItem(ref, r.width / r.height, at), { kind: ref.kind === "library" ? "inspiration" : "uploads", id: ref.id });
      if (ref.kind === "library") useStudio.getState().noteRecent("inspiration", ref.id);
    },
    [resolve, addItem],
  );

  function onAdd(a: AddAction) {
    if (a.kind === "image") addImage(a.ref);
    else if (a.kind === "text") addItem(textItem(a.style));
    else if (a.kind === "swatch") addItem(swatchItem(a.hex, a.label, a.swatchId));
    else addItem(shapeItem(a.shape));
    setSheet(null);
  }

  async function onUpload(files: File[], at?: { x: number; y: number }) {
    for (const [i, f] of files.entries()) {
      try {
        const meta = await addUpload(f);
        const ref: ImageRef = { kind: "upload", id: meta.id };
        addItem(imageItem(ref, meta.width / meta.height, at ? { x: at.x + i * 30, y: at.y + i * 30 } : undefined), { kind: "uploads", id: meta.id });
        toast(`Added ${meta.name}`, { tone: "success" });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Couldn't add that file.", { tone: "error" });
      }
    }
  }

  const layer = useCallback(
    (op: LayerOp) => {
      if (!selectedId) return;
      update((d) => {
        const items = board(d).items;
        const i = items.findIndex((x) => x.id === selectedId);
        if (i < 0) return;
        const [it] = items.splice(i, 1);
        const to = op === "front" ? items.length : op === "back" ? 0 : op === "forward" ? Math.min(items.length, i + 1) : Math.max(0, i - 1);
        items.splice(to, 0, it);
      });
    },
    [selectedId, update],
  );

  const duplicate = useCallback(() => {
    if (!selected) return;
    const copyIt = duplicateItem(selected);
    update((d) => {
      const items = board(d).items;
      const i = items.findIndex((x) => x.id === selected.id);
      items.splice(i + 1, 0, copyIt);
    });
    setSelectedId(copyIt.id);
  }, [selected, update]);

  const remove = useCallback(() => {
    if (!selected) return;
    update((d) => {
      const b = board(d);
      b.items = b.items.filter((x) => x.id !== selected.id);
    });
    setSelectedId(null);
    toast("Removed from the board", { action: { label: copy.undo, run: () => useStudio.getState().undo(c.id) } });
  }, [selected, update, c.id]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      if (!selected) return;
      const step = e.shiftKey ? 10 : 1;
      const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (mv[e.key]) {
        e.preventDefault();
        if (cropMode && selected.type === "image") {
          const [dx, dy] = mv[e.key];
          patchItem(selected.id, { crop: { ...selected.crop, fx: Math.max(-1, Math.min(1, selected.crop.fx + dx * 0.02)), fy: Math.max(-1, Math.min(1, selected.crop.fy + dy * 0.02)) } } as Partial<MoodItem>, "crop");
        } else patchItem(selected.id, { x: selected.x + mv[e.key][0], y: selected.y + mv[e.key][1] }, "nudge");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "]") layer(e.shiftKey ? "front" : "forward");
      else if (e.key === "[") layer(e.shiftKey ? "back" : "backward");
      else if (e.key === "Escape") (setCropMode(false), setSelectedId(null));
      else if (e.key === "Enter" && selected.type === "image") setCropMode(!cropMode);
      else if (e.key === "Enter" && selected.type === "text") textRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, cropMode, patchItem, remove, duplicate, layer]);

  function onLayout(id: Moodboard["layout"]) {
    const r = applyLayout(id, mb.items);
    update((d) => {
      const b = board(d);
      b.layout = id;
      b.items = r.items;
      if (!mb.items.length || b.background === getLayout(mb.layout).background) b.background = getLayout(id).background;
      if (!mb.items.length) {
        b.items.push({ ...textItem("heading"), text: c.name });
        b.items = applyLayout(id, b.items as MoodItem[]).items;
      }
    });
    toast(`${getLayout(id).name} applied${r.overflow ? ` · ${r.overflow} item${r.overflow === 1 ? "" : "s"} placed along the bottom` : ""}`, { action: { label: copy.undo, run: () => useStudio.getState().undo(c.id) } });
  }

  async function exportPng() {
    setExporting(true);
    try {
      const blob = await exportElement(<MoodboardSVG board={mb} items={mb.items} resolve={resolve} swatchHex={lookup} uid="ex" />, BOARD_W * 2, BOARD_H * 2, "image/png");
      downloadBlob(blob, `${safeFileName(c.name)}-moodboard.png`);
      toast("Moodboard PNG downloaded", { tone: "success" });
    } catch {
      toast("The export didn't work. Try again.", { tone: "error" });
    } finally {
      setExporting(false);
    }
  }

  const inspector = (
    <Inspector
      ref={textRef}
      board={mb}
      item={selected}
      swatches={pal.swatches}
      cropMode={cropMode}
      setCropMode={setCropMode}
      guides={guides}
      setGuides={setGuides}
      onPatch={(patch, co) => selected && patchItem(selected.id, patch, co)}
      onLayer={layer}
      onDuplicate={duplicate}
      onDelete={remove}
      onBackground={(hex) => update((d) => void (board(d).background = hex), { coalesce: "bg" })}
      onLayout={onLayout}
      onExtract={() => selected && goto("colors", { from: selected.id })}
    />
  );
  const assets = <AssetPanel onAdd={onAdd} savedInspiration={c.saved.inspiration} savedUploads={[...new Set([...c.saved.uploads, ...Object.keys(uploads)])]} swatches={pal.swatches} onUpload={(f) => onUpload(f)} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StageIntro
        stage="moodboard"
        compact
        actions={
          <Button size="sm" icon={<Download className="size-4" />} loading={exporting} onClick={exportPng} disabled={!mb.items.length}>
            Export PNG
          </Button>
        }
      />
      <div className="flex h-[max(520px,calc(100dvh-180px))] flex-none border-t border-line">
        <aside className="hidden w-[272px] shrink-0 overflow-hidden border-e border-line bg-surface lg:block" aria-label="Add to moodboard">{assets}</aside>
        <section className="flex min-w-0 flex-1 flex-col" aria-label="Moodboard canvas">
          <div className="flex items-center gap-1 border-b border-line bg-surface px-2 py-1.5">
            <IconButton size="sm" label="Zoom out" onClick={() => setZoom(Math.max(0.5, zoom / 1.2))}><Minus className="size-4" /></IconButton>
            <button onClick={() => setZoom(1)} className="tip relative w-14 rounded px-1 py-1 text-center font-mono text-[12px] text-ink-2 hover:bg-surface-2" data-tip="Fit to screen">{Math.round(zoom * 100)}%</button>
            <IconButton size="sm" label="Zoom in" onClick={() => setZoom(Math.min(3, zoom * 1.2))}><Plus className="size-4" /></IconButton>
            <IconButton size="sm" label="Fit to screen" onClick={() => setZoom(1)}><Maximize className="size-4" /></IconButton>
            <span className="mx-1 h-5 w-px bg-line" />
            <IconButton size="sm" label={guides ? "Alignment guides on" : "Alignment guides off"} active={guides} onClick={() => setGuides(!guides)}><Magnet className="size-4" /></IconButton>
            <span className="ms-2 hidden truncate text-[12px] text-ink-3 sm:inline">{mb.items.length} items · {getLayout(mb.layout).name}</span>
            <div className="ms-auto flex gap-1 lg:hidden">
              <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => setSheet("add")}>Add</Button>
              <Button size="sm" icon={<SlidersHorizontal className="size-4" />} onClick={() => setSheet("edit")}>{selected ? "Edit" : "Board"}</Button>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-butter-soft px-3 py-1.5 text-[12px] text-ink-2 md:hidden">
            <Monitor className="size-3.5 shrink-0" /> {copy.mobileCanvas}
          </div>
          {mb.items.length === 0 && (
            <div className="pointer-events-none relative z-10 mx-auto -mb-24 mt-10 max-w-sm rounded-lg bg-surface/95 p-5 text-center shadow-lift">
              <p className="display text-2xl">Collect what moves you.</p>
              <p className="mt-1 text-[13px] text-ink-3">Click or drag images from the library, upload your own, or choose a starting layout on the right.</p>
            </div>
          )}
          <MoodboardEditor
            board={mb}
            resolve={resolve}
            swatchHex={lookup}
            selectedId={selectedId}
            onSelect={setSelectedId}
            cropMode={cropMode}
            setCropMode={setCropMode}
            guides={guides}
            zoom={zoom}
            setZoom={setZoom}
            onCommit={(id, patch) => patchItem(id, patch)}
            onDropRef={(ref, at) => addImage(ref, at)}
            onDropFiles={(files, at) => onUpload(files, at)}
            onEditText={() => setTimeout(() => textRef.current?.focus(), 30)}
          />
        </section>
        <aside className="scroll-thin hidden w-[268px] shrink-0 overflow-y-auto border-s border-line bg-surface lg:block" aria-label="Item settings">{inspector}</aside>
      </div>
      <Sheet open={sheet === "add"} onClose={() => setSheet(null)} title="Add to moodboard">
        <div className="h-[60dvh]">{assets}</div>
      </Sheet>
      <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title={selected ? "Edit item" : "Board settings"}>
        {inspector}
      </Sheet>
    </div>
  );
}
