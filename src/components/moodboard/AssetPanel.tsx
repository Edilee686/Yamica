"use client";
import { useMemo, useRef, useState } from "react";
import { Circle, Heading, Heart, ImagePlus, Minus, Search, Square, StickyNote, Tag, Upload } from "lucide-react";
import type { ImageRef, Swatch } from "@/lib/model/types";
import { INSPIRATION, INSPIRATION_CATEGORIES } from "@/lib/inspiration/library";
import { useStudio } from "@/lib/store/studio";
import { ACCEPT_ATTR } from "@/lib/store/uploads";
import { RefImage } from "@/components/common/visuals";
import { Segmented } from "@/components/ui/controls";
import { cx } from "@/components/ui/cx";

export type AddAction =
  | { kind: "image"; ref: ImageRef }
  | { kind: "text"; style: "heading" | "note" | "label" }
  | { kind: "swatch"; hex: string; label?: string; swatchId?: string }
  | { kind: "shape"; shape: "rect" | "ellipse" | "line" };

function Thumb({ image, label, onAdd, fav, onFav }: { image: ImageRef; label: string; onAdd: () => void; fav?: boolean; onFav?: () => void }) {
  return (
    <div className="group relative">
      <button
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-yamica-image", JSON.stringify(image));
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={onAdd}
        className="block w-full overflow-hidden rounded-md ring-lilac-strong transition-shadow hover:ring-2 focus-visible:ring-2"
        aria-label={`Add ${label} to the moodboard`}
        title={`${label} · click or drag onto the board`}
      >
        <RefImage image={image} className="aspect-square" />
      </button>
      {onFav && (
        <button onClick={onFav} aria-label={fav ? `Remove ${label} from favourites` : `Save ${label} to favourites`} aria-pressed={fav} className={cx("absolute end-1 top-1 rounded-full bg-surface/90 p-1 shadow-soft transition-opacity", fav ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100")}>
          <Heart className={cx("size-3.5", fav ? "fill-lilac-strong text-lilac-strong" : "text-ink-2")} />
        </button>
      )}
    </div>
  );
}

export function AssetPanel({ onAdd, savedInspiration, savedUploads, swatches, onUpload }: { onAdd: (a: AddAction) => void; savedInspiration: string[]; savedUploads: string[]; swatches: Swatch[]; onUpload: (files: File[]) => void }) {
  const [tab, setTab] = useState<"library" | "collection" | "elements">("library");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const favs = useStudio((s) => s.prefs.favorites.inspiration);
  const toggleFav = useStudio((s) => s.toggleFavorite);
  const uploads = useStudio((s) => s.uploads);
  const [hex, setHex] = useState("#B9A9C9");
  const file = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return INSPIRATION.filter((a) => (cat === "all" || a.category === cat) && (!t || [a.title, ...a.tags, ...a.moods, ...a.styles, a.category].join(" ").toLowerCase().includes(t)));
  }, [q, cat]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-3 pb-2">
        <Segmented
          label="Asset source"
          size="sm"
          value={tab}
          onChange={setTab}
          className="w-full [&>button]:flex-1"
          options={[
            { value: "library", label: "Library" },
            { value: "collection", label: "Saved" },
            { value: "elements", label: "Elements" },
          ]}
        />
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {tab === "library" && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-4" />
              <input aria-label="Search inspiration" className="field h-9 ps-8 text-[13px]" placeholder="Search arches, linen, dawn…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select aria-label="Category" className="field mt-2 h-9 py-1 text-[13px]" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="all">All categories</option>
              {INSPIRATION_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {results.map((a) => (
                <Thumb key={a.id} image={{ kind: "library", id: a.id }} label={a.title} onAdd={() => onAdd({ kind: "image", ref: { kind: "library", id: a.id } })} fav={favs.includes(a.id)} onFav={() => toggleFav("inspiration", a.id)} />
              ))}
            </div>
            {!results.length && <p className="py-6 text-center text-[13px] text-ink-3">No images match. Try another word.</p>}
            <p className="mt-3 text-[11px] leading-snug text-ink-3">Original Yamica Studio artwork. Tip: drag images straight onto the board.</p>
          </>
        )}
        {tab === "collection" && (
          <>
            <button onClick={() => file.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong py-3 text-[13px] font-medium text-ink-2 hover:border-lilac-strong hover:text-lilac-deep">
              <Upload className="size-4" /> Upload your images
            </button>
            <input ref={file} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={(e) => (e.target.files && onUpload([...e.target.files]), (e.target.value = ""))} />
            <p className="mt-1.5 text-[11px] text-ink-3">PNG, JPG, WebP, GIF or SVG up to 12 MB. Images stay in this browser.</p>
            {savedUploads.length > 0 && <p className="eyebrow mt-4 mb-2">Your uploads</p>}
            <div className="grid grid-cols-2 gap-2">
              {savedUploads.filter((id) => uploads[id]).map((id) => (
                <Thumb key={id} image={{ kind: "upload", id }} label={uploads[id].name} onAdd={() => onAdd({ kind: "image", ref: { kind: "upload", id } })} />
              ))}
            </div>
            <p className="eyebrow mt-4 mb-2">Saved to this collection</p>
            {savedInspiration.length ? (
              <div className="grid grid-cols-2 gap-2">
                {savedInspiration.map((id) => {
                  const a = INSPIRATION.find((x) => x.id === id);
                  return a ? <Thumb key={id} image={{ kind: "library", id }} label={a.title} onAdd={() => onAdd({ kind: "image", ref: { kind: "library", id } })} /> : null;
                })}
              </div>
            ) : (
              <p className="text-[13px] text-ink-3">Nothing saved yet. Images you add to the board are saved here automatically.</p>
            )}
          </>
        )}
        {tab === "elements" && (
          <div className="space-y-5">
            <div>
              <p className="eyebrow mb-2">Text</p>
              <div className="grid gap-1.5">
                <ElementButton icon={<Heading className="size-4" />} label="Heading" onClick={() => onAdd({ kind: "text", style: "heading" })} />
                <ElementButton icon={<StickyNote className="size-4" />} label="Note" onClick={() => onAdd({ kind: "text", style: "note" })} />
                <ElementButton icon={<Tag className="size-4" />} label="Label" onClick={() => onAdd({ kind: "text", style: "label" })} />
              </div>
            </div>
            <div>
              <p className="eyebrow mb-2">Colour swatches</p>
              {swatches.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {swatches.map((s) => (
                    <button key={s.id} onClick={() => onAdd({ kind: "swatch", hex: s.hex, label: s.name, swatchId: s.id })} title={`Add ${s.name}`} aria-label={`Add swatch ${s.name}`} className="size-9 rounded-md ring-1 ring-black/10 ring-inset transition-transform hover:scale-105" style={{ background: s.hex }} />
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-ink-3">Your palette is empty. Add colours in the Colours stage.</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <input type="color" aria-label="Custom swatch colour" value={hex} onChange={(e) => setHex(e.target.value)} className="h-9 w-10 cursor-pointer rounded border border-line-strong bg-surface" />
                <button onClick={() => onAdd({ kind: "swatch", hex: hex.toUpperCase() })} className="h-9 rounded-full bg-surface-2 px-3 text-[13px] font-medium hover:bg-surface-3">Add custom swatch</button>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-2">Shapes</p>
              <div className="grid grid-cols-3 gap-1.5">
                <ElementButton icon={<Square className="size-4" />} label="Block" onClick={() => onAdd({ kind: "shape", shape: "rect" })} />
                <ElementButton icon={<Circle className="size-4" />} label="Circle" onClick={() => onAdd({ kind: "shape", shape: "ellipse" })} />
                <ElementButton icon={<Minus className="size-4" />} label="Line" onClick={() => onAdd({ kind: "shape", shape: "line" })} />
              </div>
            </div>
            <div className="rounded-md bg-surface-2 p-3 text-[12px] text-ink-3">
              <ImagePlus className="mb-1 size-4" />
              You can also drop image files from your computer onto the board.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ElementButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-2 hover:border-ink-4 hover:text-ink">
      {icon}
      {label}
    </button>
  );
}
