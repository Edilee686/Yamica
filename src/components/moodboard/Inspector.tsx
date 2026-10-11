"use client";
import { forwardRef } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Copy, Crop, Italic, Pipette, Trash2 } from "lucide-react";
import type { MoodItem, Moodboard, Swatch } from "@/lib/model/types";
import { LAYOUTS } from "@/lib/moodboard/layouts";
import { textHeight } from "@/lib/moodboard/ops";
import { IconButton } from "@/components/ui/Button";
import { Segmented, Slider, Toggle } from "@/components/ui/controls";
import { cx } from "@/components/ui/cx";
import { getInspiration } from "@/lib/inspiration/library";
import { useStudio } from "@/lib/store/studio";

export type LayerOp = "forward" | "backward" | "front" | "back";

export interface InspectorProps {
  board: Moodboard;
  item: MoodItem | null;
  swatches: Swatch[];
  cropMode: boolean;
  setCropMode: (v: boolean) => void;
  guides: boolean;
  setGuides: (v: boolean) => void;
  onPatch: (patch: Partial<MoodItem>, coalesce?: string) => void;
  onLayer: (op: LayerOp) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBackground: (hex: string) => void;
  onLayout: (id: Moodboard["layout"]) => void;
  onExtract: () => void;
}

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink-3 focus-within:border-lilac-strong">
      <span className="w-3">{label}</span>
      <input type="number" step={step} value={Math.round(value)} onChange={(e) => e.target.value !== "" && onChange(parseFloat(e.target.value))} className="w-full min-w-0 bg-transparent font-mono text-ink tabular-nums outline-none" />
    </label>
  );
}

function ColorRow({ value, swatches, onPick, label }: { value: string; swatches: Swatch[]; onPick: (hex: string, swatchId?: string) => void; label: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-ink-2">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((s) => (
          <button key={s.id} title={s.name} aria-label={`${label}: ${s.name}`} onClick={() => onPick(s.hex, s.id)} className={cx("size-7 rounded-full ring-1 ring-black/10 ring-inset", value.toUpperCase() === s.hex.toUpperCase() && "outline-2 outline-offset-2 outline-lilac-strong")} style={{ background: s.hex }} />
        ))}
        <input type="color" aria-label={`${label}: custom`} value={value.length === 7 ? value : "#000000"} onChange={(e) => onPick(e.target.value.toUpperCase())} className="h-7 w-8 cursor-pointer rounded border border-line-strong bg-surface" />
      </div>
    </div>
  );
}

export const Inspector = forwardRef<HTMLTextAreaElement, InspectorProps>(function Inspector(p, textRef) {
  const it = p.item;
  const uploads = useStudio((s) => s.uploads);
  if (!it) {
    return (
      <div className="space-y-5 p-4">
        <div>
          <p className="eyebrow mb-2">Board</p>
          <ColorRow label="Background" value={p.board.background} swatches={[{ id: "a", hex: "#FBF8F2", name: "Paper", role: "none" }, { id: "b", hex: "#FFFFFF", name: "White", role: "none" }, { id: "c", hex: "#EFE9DE", name: "Linen", role: "none" }, { id: "d", hex: "#2B2826", name: "Ink", role: "none" }, ...p.swatches]} onPick={(h) => p.onBackground(h)} />
        </div>
        <div>
          <p className="eyebrow mb-2">Starting layout</p>
          <div className="grid gap-1.5">
            {LAYOUTS.map((l) => (
              <button key={l.id} onClick={() => p.onLayout(l.id)} className={cx("rounded-md border px-3 py-2 text-start transition-colors", p.board.layout === l.id ? "border-lilac-strong bg-lilac-wash" : "border-line hover:border-line-strong")}>
                <span className="block text-[13px] font-medium">{l.name}</span>
                <span className="block text-[12px] leading-snug text-ink-3">{l.description}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-3">Layouts rearrange what's on the board. Nothing is deleted, and you can undo.</p>
        </div>
        <Toggle label="Alignment guides" checked={p.guides} onChange={p.setGuides} />
        <div className="rounded-md bg-surface-2 p-3 text-[12px] leading-relaxed text-ink-3">
          <p className="font-medium text-ink-2">Shortcuts</p>
          Arrows move · Shift+arrows move further · ⌫ delete · ⌘/Ctrl+D duplicate · [ ] layer order · double-click an image to reposition it · hold Alt while dragging to skip guides
        </div>
      </div>
    );
  }
  const name =
    it.type === "image" ? (it.image.kind === "library" ? getInspiration(it.image.id)?.title : uploads[it.image.id]?.name) ?? "Image" : it.type === "text" ? "Text" : it.type === "swatch" ? "Colour swatch" : it.shape === "line" ? "Line" : it.shape === "ellipse" ? "Circle" : "Block";
  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="eyebrow">Selected</p>
        <p className="mt-0.5 truncate text-[15px] font-semibold">{name}</p>
        <div className="mt-2 flex items-center gap-0.5">
          <IconButton size="sm" label="Bring forward" shortcut="]" onClick={() => p.onLayer("forward")}><ArrowUp className="size-4" /></IconButton>
          <IconButton size="sm" label="Send backward" shortcut="[" onClick={() => p.onLayer("backward")}><ArrowDown className="size-4" /></IconButton>
          <IconButton size="sm" label="Bring to front" onClick={() => p.onLayer("front")}><ArrowUpToLine className="size-4" /></IconButton>
          <IconButton size="sm" label="Send to back" onClick={() => p.onLayer("back")}><ArrowDownToLine className="size-4" /></IconButton>
          <span className="mx-1 h-5 w-px bg-line" />
          <IconButton size="sm" label="Duplicate" shortcut="⌘D" onClick={p.onDuplicate}><Copy className="size-4" /></IconButton>
          <IconButton size="sm" label="Delete" shortcut="⌫" onClick={p.onDelete} className="hover:text-danger"><Trash2 className="size-4" /></IconButton>
        </div>
      </div>

      {it.type === "text" && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Text</span>
            <textarea ref={textRef} rows={3} className="field resize-y text-[14px]" value={it.text} onChange={(e) => p.onPatch({ text: e.target.value, h: textHeight({ ...it, text: e.target.value }) }, "text")} />
          </label>
          <div className="flex items-center gap-2">
            <Segmented label="Typeface" size="sm" value={it.font} onChange={(font) => p.onPatch({ font, h: textHeight({ ...it, font }) })} options={[{ value: "serif", label: <span className="font-serif text-[14px]">Serif</span> }, { value: "sans", label: "Sans" }]} />
            <IconButton size="sm" label="Italic" active={!!it.italic} onClick={() => p.onPatch({ italic: !it.italic, h: textHeight({ ...it, italic: !it.italic }) })}><Italic className="size-4" /></IconButton>
          </div>
          <Slider label="Size" value={it.size} min={10} max={180} onChange={(size) => p.onPatch({ size, h: textHeight({ ...it, size }) }, "size")} format={(v) => `${v}`} />
          {it.font === "sans" && <Segmented label="Weight" size="sm" value={String(it.weight ?? 400)} onChange={(w) => p.onPatch({ weight: +w, h: textHeight({ ...it, weight: +w }) })} options={[{ value: "400", label: "Regular" }, { value: "600", label: "Bold" }]} />}
          <div className="flex gap-0.5">
            {(["start", "middle", "end"] as const).map((a) => {
              const I = a === "start" ? AlignLeft : a === "middle" ? AlignCenter : AlignRight;
              return <IconButton key={a} size="sm" label={`Align ${a === "start" ? "left" : a === "middle" ? "centre" : "right"}`} active={it.align === a} onClick={() => p.onPatch({ align: a })}><I className="size-4" /></IconButton>;
            })}
          </div>
          <ColorRow label="Colour" value={it.color} swatches={[{ id: "ink", hex: "#2B2826", name: "Ink", role: "none" }, ...p.swatches]} onPick={(color) => p.onPatch({ color })} />
        </div>
      )}

      {it.type === "image" && (
        <div className="space-y-3">
          <button onClick={() => p.setCropMode(!p.cropMode)} aria-pressed={p.cropMode} className={cx("flex w-full items-center justify-center gap-2 rounded-full border py-2 text-[13px] font-medium transition-colors", p.cropMode ? "border-lilac-strong bg-lilac-soft text-lilac-deep" : "border-line-strong hover:border-ink-3")}>
            <Crop className="size-4" /> {p.cropMode ? "Done repositioning" : "Reposition image"}
          </button>
          {p.cropMode && <p className="text-[12px] text-ink-3">Drag inside the frame to move the image. Zoom in to crop tighter.</p>}
          <Slider label="Image zoom" value={it.crop.zoom} min={1} max={4} step={0.05} onChange={(zoom) => p.onPatch({ crop: { ...it.crop, zoom } } as Partial<MoodItem>, "zoom")} format={(v) => `${v.toFixed(2)}×`} resetTo={1} />
          <button onClick={p.onExtract} className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-2 py-2 text-[13px] font-medium hover:bg-surface-3">
            <Pipette className="size-4" /> Pull colours from this image
          </button>
        </div>
      )}

      {it.type === "swatch" && (
        <div className="space-y-3">
          <ColorRow label="Colour" value={it.hex} swatches={p.swatches} onPick={(hex, swatchId) => p.onPatch({ hex, swatchId, label: swatchId ? p.swatches.find((s) => s.id === swatchId)?.name : it.label })} />
          {it.swatchId && <p className="text-[12px] text-ink-3">Linked to your palette, so it updates when the palette colour changes.</p>}
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Label</span>
            <input className="field h-9 py-1 text-[13px]" value={it.label ?? ""} onChange={(e) => p.onPatch({ label: e.target.value }, "label")} placeholder="Optional" />
          </label>
        </div>
      )}

      {it.type === "shape" && (
        <div className="space-y-3">
          {it.shape !== "line" && <ColorRow label="Fill" value={it.fill} swatches={p.swatches} onPick={(fill) => p.onPatch({ fill })} />}
          <ColorRow label="Outline" value={it.stroke} swatches={[{ id: "ink", hex: "#2B2826", name: "Ink", role: "none" }, ...p.swatches]} onPick={(stroke) => p.onPatch({ stroke, strokeWidth: it.strokeWidth || 2 })} />
          <Slider label="Outline width" value={it.strokeWidth} min={0} max={16} onChange={(strokeWidth) => p.onPatch({ strokeWidth }, "sw")} />
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-2">Position & size</p>
        <div className="grid grid-cols-2 gap-1.5">
          <Num label="X" value={it.x} onChange={(x) => p.onPatch({ x }, "x")} />
          <Num label="Y" value={it.y} onChange={(y) => p.onPatch({ y }, "y")} />
          <Num label="W" value={it.w} onChange={(w) => p.onPatch(it.type === "text" ? { w: Math.max(24, w), h: textHeight({ ...it, w: Math.max(24, w) }) } : { w: Math.max(12, w) }, "w")} />
          <Num label="H" value={it.h} onChange={(h) => it.type !== "text" && p.onPatch({ h: Math.max(12, h) }, "h")} />
        </div>
        <div className="mt-2">
          <Slider label="Rotation" value={it.rotation} min={-180} max={180} onChange={(rotation) => p.onPatch({ rotation }, "rot")} format={(v) => `${Math.round(v)}°`} resetTo={0} />
        </div>
      </div>
    </div>
  );
});
