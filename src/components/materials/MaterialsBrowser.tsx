"use client";
import { useMemo, useRef, useState } from "react";
import { BookmarkCheck, BookmarkPlus, Heart, ImageIcon, Info, Search, Sparkles, Upload } from "lucide-react";
import type { FabricReference, ImagePrint, Swatch, VectorPrint } from "@/lib/model/types";
import { FABRICS, TEXTURES, WEIGHT_LABELS } from "@/lib/fabrics/fabrics";
import { PRINTS, PRINT_CATEGORY_LABELS, resolvePrintColors } from "@/lib/prints/prints";
import { familyOf } from "@/lib/color/color";
import { COLOR_FAMILY_LABELS } from "@/lib/inspiration/library";
import { useStudio } from "@/lib/store/studio";
import { ACCEPT_ATTR } from "@/lib/store/uploads";
import { FabricSwatch, PrintSwatch } from "@/components/common/visuals";
import { Chip, Segmented, Slider } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { copy } from "@/lib/i18n/en";
import type { ColorFamily } from "@/lib/model/types";

export interface MaterialsBrowserProps {
  tab?: "fabrics" | "prints";
  onTab?: (t: "fabrics" | "prints") => void;
  savedFabrics?: string[];
  savedPrints?: string[];
  onToggleFabric?: (id: string) => void;
  onTogglePrint?: (id: string) => void;
  palette?: Swatch[];
  imagePrints?: ImagePrint[];
  onUploadPrint?: (file: File) => void;
}

const FAMILIES: ColorFamily[] = ["neutral", "dark", "pink", "purple", "green", "yellow", "blue", "warm"];

function printFamilies(p: VectorPrint) {
  return new Set(p.slots.map((s) => familyOf(s.default)));
}

export function MaterialsBrowser(props: MaterialsBrowserProps) {
  const [tabState, setTabState] = useState<"fabrics" | "prints">(props.tab ?? "fabrics");
  const tab = props.tab ?? tabState;
  const setTab = (t: "fabrics" | "prints") => (props.onTab ? props.onTab(t) : setTabState(t));
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented label="Material type" value={tab} onChange={setTab} options={[{ value: "fabrics", label: `Fabrics · ${FABRICS.length}` }, { value: "prints", label: `Prints · ${PRINTS.length + (props.imagePrints?.length ?? 0)}` }]} />
      </div>
      {tab === "fabrics" ? <Fabrics {...props} /> : <Prints {...props} />}
    </div>
  );
}

function Fabrics({ savedFabrics, onToggleFabric }: MaterialsBrowserProps) {
  const favs = useStudio((s) => s.prefs.favorites.fabrics);
  const toggleFav = useStudio((s) => s.toggleFavorite);
  const [q, setQ] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [detail, setDetail] = useState<FabricReference | null>(null);
  const list = FABRICS.filter((f) => (!onlyFav || favs.includes(f.id)) && (!q || [f.name, f.summary, ...f.uses].join(" ").toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search linen, jackets, fluid…" />
        <Chip active={onlyFav} onClick={() => setOnlyFav(!onlyFav)}><Heart className="size-3.5" /> Favourites</Chip>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((f) => {
          const saved = savedFabrics?.includes(f.id);
          return (
            <article key={f.id} className="group overflow-hidden rounded-xl border border-line bg-surface">
              <button className="relative block w-full" onClick={() => setDetail(f)} aria-label={`View ${f.name} details`}>
                <FabricSwatch fabricId={f.id} className="aspect-[4/3] w-full" zoom={4} />
                <span className="absolute start-2 bottom-2 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-ink-2">{TEXTURES.find((t) => t.id === f.textureId)?.name}</span>
              </button>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[16px] font-semibold">{f.name}</h3>
                  <FavButton on={favs.includes(f.id)} label={f.name} onClick={() => toggleFav("fabrics", f.id)} />
                </div>
                <p className="mt-0.5 text-[13px] text-ink-3">{f.summary}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                  <dt className="text-ink-3">Weight</dt><dd>{WEIGHT_LABELS[f.weight]}</dd>
                  <dt className="text-ink-3">Drape</dt><dd className="capitalize">{f.drape}</dd>
                  <dt className="text-ink-3">Stretch</dt><dd className="capitalize">{f.stretch}</dd>
                  <dt className="text-ink-3">Opacity</dt><dd className="capitalize">{f.opacity}</dd>
                </dl>
                <p className="mt-2 text-[12px] text-ink-3">Often used for {f.uses.join(", ").toLowerCase()}</p>
                {onToggleFabric && <SaveButton saved={!!saved} onClick={() => onToggleFabric(f.id)} />}
              </div>
            </article>
          );
        })}
      </div>
      {!list.length && <p className="py-10 text-center text-ink-3">No fabrics match your search.</p>}
      <p className="mt-6 flex items-start gap-2 text-[12px] text-ink-3"><Info className="mt-0.5 size-3.5 shrink-0" /> {copy.materialsDisclaimer}</p>
      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ""} description={detail?.summary} size="lg">
        {detail && (
          <div className="grid gap-5 pb-2 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-1.5">Close-up texture</p>
              <FabricSwatch fabricId={detail.id} className="aspect-square w-full rounded-lg" zoom={9} />
            </div>
            <div className="space-y-3 text-[14px]">
              <dl className="grid grid-cols-[110px_1fr] gap-y-2">
                <dt className="text-ink-3">Weight</dt><dd>{WEIGHT_LABELS[detail.weight]}</dd>
                <dt className="text-ink-3">Typical drape</dt><dd className="capitalize">{detail.drape}</dd>
                <dt className="text-ink-3">Stretch</dt><dd className="capitalize">{detail.stretch}</dd>
                <dt className="text-ink-3">Opacity</dt><dd className="capitalize">{detail.opacity}</dd>
                <dt className="text-ink-3">Texture</dt><dd>{TEXTURES.find((t) => t.id === detail.textureId)?.description}</dd>
                <dt className="text-ink-3">Typical uses</dt><dd>{detail.uses.join(", ")}</dd>
              </dl>
              <p className="rounded-md bg-surface-2 p-3 text-[12px] text-ink-3">{copy.materialsDisclaimer} Combine it with any colour or print in the garment editor.</p>
              {onToggleFabric && <SaveButton saved={!!savedFabrics?.includes(detail.id)} onClick={() => onToggleFabric(detail.id)} />}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

function Prints({ savedPrints, onTogglePrint, palette, imagePrints, onUploadPrint }: MaterialsBrowserProps) {
  const favs = useStudio((s) => s.prefs.favorites.prints);
  const toggleFav = useStudio((s) => s.toggleFavorite);
  const urls = useStudio((s) => s.uploadUrls);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [fam, setFam] = useState<ColorFamily | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [detail, setDetail] = useState<VectorPrint | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const list = useMemo(
    () =>
      PRINTS.filter(
        (p) =>
          (cat === "all" || p.category === cat) &&
          (!onlyFav || favs.includes(p.id)) &&
          (!fam || printFamilies(p).has(fam)) &&
          (!q || [p.name, p.description, ...p.tags, p.category].join(" ").toLowerCase().includes(q.toLowerCase())),
      ),
    [cat, onlyFav, favs, fam, q],
  );
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search florals, stripes, retro…" />
        <Chip active={onlyFav} onClick={() => setOnlyFav(!onlyFav)}><Heart className="size-3.5" /> Favourites</Chip>
        {onUploadPrint && (
          <>
            <Button size="sm" icon={<Upload className="size-4" />} onClick={() => file.current?.click()}>Upload a print</Button>
            <input ref={file} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => (e.target.files?.[0] && onUploadPrint(e.target.files[0]), (e.target.value = ""))} />
          </>
        )}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Print category">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
        {Object.entries(PRINT_CATEGORY_LABELS).map(([id, label]) => (
          <Chip key={id} active={cat === id} onClick={() => setCat(id)}>{label}</Chip>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Colour family">
        <span className="me-1 text-[12px] text-ink-3">Colour</span>
        {FAMILIES.map((f) => (
          <button key={f} onClick={() => setFam(fam === f ? null : f)} aria-pressed={fam === f} className={cx("rounded-full border px-2.5 py-1 text-[12px]", fam === f ? "border-ink bg-ink text-surface" : "border-line text-ink-3 hover:text-ink")}>
            {COLOR_FAMILY_LABELS[f]}
          </button>
        ))}
      </div>
      {imagePrints && imagePrints.length > 0 && (
        <div className="mb-6">
          <p className="eyebrow mb-2">Your image prints</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {imagePrints.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                <PrintSwatch printId={p.id} imageUrl={urls[p.uploadId]} className="aspect-square" />
                <div className="p-3">
                  <p className="truncate text-[14px] font-medium">{p.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-ink-3"><ImageIcon className="size-3" /> Image print · colours fixed</p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Uploaded prints are photos or raster images. You can scale, rotate and move them, but their colours can't be changed independently.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((p) => {
          const saved = savedPrints?.includes(p.id);
          return (
            <article key={p.id} className="group overflow-hidden rounded-xl border border-line bg-surface">
              <button className="block w-full" onClick={() => setDetail(p)} aria-label={`Preview ${p.name}`}>
                <PrintSwatch printId={p.id} className="aspect-square transition-transform duration-500 group-hover:scale-[1.02]" size={140} />
              </button>
              <div className="p-3">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-semibold">{p.name}</h3>
                    <p className="text-[11px] text-ink-3">{PRINT_CATEGORY_LABELS[p.category]} · <span className="text-sage-deep">Recolourable vector</span></p>
                  </div>
                  <FavButton on={favs.includes(p.id)} label={p.name} onClick={() => toggleFav("prints", p.id)} />
                </div>
                {onTogglePrint && <SaveButton saved={!!saved} onClick={() => onTogglePrint(p.id)} small />}
              </div>
            </article>
          );
        })}
      </div>
      {!list.length && <p className="py-10 text-center text-ink-3">No prints match these filters.</p>}
      <PrintDetail print={detail} onClose={() => setDetail(null)} palette={palette} saved={!!detail && !!savedPrints?.includes(detail.id)} onToggle={onTogglePrint} />
    </>
  );
}

function PrintDetail({ print, onClose, palette, saved, onToggle }: { print: VectorPrint | null; onClose: () => void; palette?: Swatch[]; saved: boolean; onToggle?: (id: string) => void }) {
  const [scale, setScale] = useState(1);
  const [colors, setColors] = useState<Record<string, string>>({});
  const p = print;
  const base = p ? resolvePrintColors(p) : {};
  const merged = { ...base, ...colors };
  return (
    <Dialog open={!!p} onClose={() => (onClose(), setColors({}), setScale(1))} title={p?.name ?? ""} description={p?.description} size="lg">
      {p && (
        <div className="grid gap-6 pb-2 md:grid-cols-[1.3fr_1fr]">
          <div>
            <PrintSwatch printId={p.id} colors={merged} scale={scale} size={360} className="aspect-square w-full rounded-lg ring-1 ring-black/5" />
            <p className="mt-2 text-[12px] text-ink-3">Repeat preview. Scale is relative to the garment canvas, not a physical measurement.</p>
          </div>
          <div className="space-y-4">
            <Slider label="Repeat scale" value={scale} min={0.4} max={3} step={0.05} onChange={setScale} format={(v) => `${v.toFixed(2)}×`} resetTo={1} />
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-2"><Sparkles className="size-3.5 text-lilac-strong" /> Try recolouring</p>
              <div className="space-y-2">
                {p.slots.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-24 text-[12px] text-ink-3">{s.label}</span>
                    <div className="flex flex-wrap gap-1">
                      <button title="Original" aria-label={`${s.label}: original`} onClick={() => setColors(({ [s.key]: _x, ...r }) => r)} className={cx("size-6 rounded-full ring-1 ring-black/10", !colors[s.key] && "outline-2 outline-offset-1 outline-lilac-strong")} style={{ background: s.default }} />
                      {(palette ?? []).map((sw) => (
                        <button key={sw.id} title={sw.name} aria-label={`${s.label}: ${sw.name}`} onClick={() => setColors((c) => ({ ...c, [s.key]: sw.hex }))} className={cx("size-6 rounded-full ring-1 ring-black/10", colors[s.key] === sw.hex && "outline-2 outline-offset-1 outline-lilac-strong")} style={{ background: sw.hex }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {!palette?.length && <p className="text-[12px] text-ink-3">Open a collection to recolour with your palette.</p>}
            </div>
            <div className="rounded-md bg-surface-2 p-3 text-[12px] text-ink-3">
              <p className="font-medium text-ink-2">{p.license.license}</p>
              {p.license.usage}
            </div>
            {onToggle && <SaveButton saved={saved} onClick={() => onToggle(p.id)} />}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-4" />
      <input aria-label="Search" className="field h-9 rounded-full ps-9 text-[14px]" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FavButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} aria-label={on ? `Remove ${label} from favourites` : `Add ${label} to favourites`} className="rounded-full p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
      <Heart className={cx("size-4", on && "fill-lilac-strong text-lilac-strong")} />
    </button>
  );
}

function SaveButton({ saved, onClick, small }: { saved: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button onClick={onClick} aria-pressed={saved} className={cx("mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border font-medium transition-colors", small ? "py-1.5 text-[12px]" : "py-2 text-[13px]", saved ? "border-sage-deep/30 bg-sage-soft text-sage-deep" : "border-line-strong text-ink-2 hover:border-ink-3")}>
      {saved ? <BookmarkCheck className="size-4" /> : <BookmarkPlus className="size-4" />}
      {saved ? "Saved to collection" : "Save to collection"}
    </button>
  );
}
