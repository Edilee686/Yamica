"use client";
import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Heart, ImagePlus, LayoutPanelTop, Search, Upload } from "lucide-react";
import { LibraryShell, TargetSelect, useTargetCollection } from "@/components/library/shared";
import { RefImage, SafeImage } from "@/components/common/visuals";
import { Button } from "@/components/ui/Button";
import { Chip, EmptyState } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { cx } from "@/components/ui/cx";
import { COLOR_FAMILY_LABELS, INSPIRATION, INSPIRATION_CATEGORIES, getInspiration } from "@/lib/inspiration/library";
import { useStudio } from "@/lib/store/studio";
import { ACCEPT_ATTR } from "@/lib/store/uploads";
import { activeMoodboard } from "@/lib/model/factory";
import { imageItem } from "@/lib/moodboard/ops";
import { collectionHref } from "@/lib/routes";
import { copy } from "@/lib/i18n/en";
import type { ColorFamily, ImageRef, InspirationAsset } from "@/lib/model/types";

export default function InspirationPage() {
  return (
    <Suspense>
      <Inspiration />
    </Suspense>
  );
}

const MOODS = [...new Set(INSPIRATION.flatMap((a) => a.moods))].sort();
const STYLES = [...new Set(INSPIRATION.flatMap((a) => a.styles))].sort();

function Inspiration() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [fam, setFam] = useState<ColorFamily | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const favs = useStudio((s) => s.prefs.favorites.inspiration);
  const toggleFav = useStudio((s) => s.toggleFavorite);
  const uploads = useStudio((s) => s.uploads);
  const [target, setTarget, list] = useTargetCollection();
  const fileRef = useRef<HTMLInputElement>(null);
  const assetId = params.get("asset");
  const asset = assetId ? getInspiration(assetId) : undefined;

  const setAsset = (id: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (id) sp.set("asset", id);
    else sp.delete("asset");
    router.replace(`/studio/inspiration${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return INSPIRATION.filter(
      (a) =>
        (cat === "all" || a.category === cat) &&
        (!fam || a.colorFamilies.includes(fam)) &&
        (!mood || a.moods.includes(mood)) &&
        (!style || a.styles.includes(style)) &&
        (!onlyFav || favs.includes(a.id)) &&
        (!needle || [a.title, a.category, ...a.tags, ...a.moods, ...a.styles].join(" ").toLowerCase().includes(needle)),
    );
  }, [q, cat, fam, mood, style, onlyFav, favs]);

  function saveTo(ref: ImageRef, title: string) {
    if (!target) return toast("Create a collection first.", { tone: "error" });
    const key = ref.kind === "library" ? "inspiration" : "uploads";
    if (target.saved[key].includes(ref.id)) return toast(`Already saved to ${target.name}`);
    useStudio.getState().update(target.id, (d) => void d.saved[key].push(ref.id));
    if (ref.kind === "library") useStudio.getState().noteRecent("inspiration", ref.id);
    toast(`${title} saved to ${target.name}`, { tone: "success", action: { label: "Open", run: () => router.push(collectionHref(target.id, "moodboard")) } });
  }

  function addToBoard(ref: ImageRef, aspect: number, title: string) {
    if (!target) return toast("Create a collection first.", { tone: "error" });
    const mb = activeMoodboard(target);
    useStudio.getState().update(target.id, (d) => {
      const m = d.moodboards.find((x) => x.id === mb.id);
      m?.items.push(imageItem(ref, aspect));
      const key = ref.kind === "library" ? "inspiration" : "uploads";
      if (!d.saved[key].includes(ref.id)) d.saved[key].push(ref.id);
    });
    toast(`${title} added to the ${target.name} moodboard`, { tone: "success", action: { label: "Open board", run: () => router.push(collectionHref(target.id, "moodboard")) } });
  }

  async function onFiles(files: FileList | null) {
    for (const f of Array.from(files ?? [])) {
      try {
        const meta = await useStudio.getState().addUpload(f);
        toast(`${meta.name} uploaded`, { tone: "success" });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Couldn't upload that file.", { tone: "error" });
      }
    }
  }

  const myUploads = Object.values(uploads).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <LibraryShell
      eyebrow="Library"
      title="Inspiration"
      intro={`${INSPIRATION.length} original reference images to build moodboards from, plus anything you upload.`}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <TargetSelect value={target} onChange={setTarget} list={list} />
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Upload images
          </Button>
          <input ref={fileRef} type="file" accept={ACCEPT_ATTR} multiple hidden onChange={(e) => (onFiles(e.target.files), (e.target.value = ""))} />
        </div>
      }
    >
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-60 flex-1 md:max-w-sm">
            <span className="sr-only">Search inspiration</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input className="field ps-9" placeholder="Search: arches, linen, morning light…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Chip active={onlyFav} onClick={() => setOnlyFav(!onlyFav)}>
            <Heart className={cx("size-3.5", onlyFav && "fill-current")} /> Favourites
          </Chip>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
          {INSPIRATION_CATEGORIES.map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <FilterSelect label="Colour" value={fam} onChange={(v) => setFam(v as ColorFamily | null)} options={Object.entries(COLOR_FAMILY_LABELS).map(([v, l]) => [v, l])} />
          <FilterSelect label="Mood" value={mood} onChange={setMood} options={MOODS.map((m) => [m, m])} />
          <FilterSelect label="Style" value={style} onChange={setStyle} options={STYLES.map((m) => [m, m])} />
          <span className="text-[13px] text-ink-3" aria-live="polite">{results.length} image{results.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState title="Nothing matches" body="Try fewer filters or a different word." action={<Button onClick={() => (setQ(""), setCat("all"), setFam(null), setMood(null), setStyle(null), setOnlyFav(false))}>Clear filters</Button>} />
      ) : (
        <ul className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {results.map((a) => (
            <li key={a.id} className="group relative mb-4 break-inside-avoid">
              <button onClick={() => setAsset(a.id)} className="block w-full overflow-hidden rounded-lg text-start" aria-label={`Preview ${a.title}`}>
                <span className="block w-full" style={{ aspectRatio: `${a.width} / ${a.height}` }}>
                  <RefImage image={{ kind: "library", id: a.id }} className="size-full transition-transform duration-500 group-hover:scale-[1.02]" />
                </span>
              </button>
              <button
                onClick={() => toggleFav("inspiration", a.id)}
                aria-pressed={favs.includes(a.id)}
                aria-label={favs.includes(a.id) ? `Remove ${a.title} from favourites` : `Add ${a.title} to favourites`}
                className="absolute end-2 top-2 rounded-full bg-surface/90 p-1.5 text-ink-2 shadow-sm hover:text-ink"
              >
                <Heart className={cx("size-4", favs.includes(a.id) && "fill-lilac-strong text-lilac-strong")} />
              </button>
              <p className="mt-1.5 text-[13px] font-medium">{a.title}</p>
              <p className="text-[12px] text-ink-3">{INSPIRATION_CATEGORIES.find((c) => c.id === a.category)?.label}</p>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-14" aria-labelledby="my-uploads">
        <h2 id="my-uploads" className="display text-[30px]">Your uploads</h2>
        <p className="mb-4 text-[13px] text-ink-3">Stored in this browser only. Manage or delete them in Saved.</p>
        {myUploads.length === 0 ? (
          <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong py-10 text-ink-3 hover:border-lilac-strong hover:text-lilac-deep">
            <ImagePlus className="size-6" /> Upload JPG, PNG, WebP or SVG (up to 12 MB)
          </button>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {myUploads.map((u) => (
              <li key={u.id}>
                <RefImage image={{ kind: "upload", id: u.id }} className="aspect-square w-full rounded-lg" />
                <p className="mt-1 truncate text-[12px]">{u.name}</p>
                <div className="mt-1 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => addToBoard({ kind: "upload", id: u.id }, u.width / u.height, u.name)}>Add to board</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AssetDialog asset={asset} onClose={() => setAsset(null)} fav={!!asset && favs.includes(asset.id)} onFav={() => asset && toggleFav("inspiration", asset.id)} target={target?.name} onSave={() => asset && saveTo({ kind: "library", id: asset.id }, asset.title)} onBoard={() => asset && (addToBoard({ kind: "library", id: asset.id }, asset.width / asset.height, asset.title), setAsset(null))} />
    </LibraryShell>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string | null; onChange: (v: string | null) => void; options: string[][] }) {
  return (
    <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
      {label}
      <select className="field h-8 w-auto py-0 text-[13px] capitalize" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Any</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function AssetDialog({ asset, onClose, fav, onFav, target, onSave, onBoard }: { asset?: InspirationAsset; onClose: () => void; fav: boolean; onFav: () => void; target?: string; onSave: () => void; onBoard: () => void }) {
  return (
    <Dialog open={!!asset} onClose={onClose} title={asset?.title ?? ""} size="xl">
      {asset && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <SafeImage src={asset.src} placeholder={asset.dominant} alt={asset.title} fit="contain" className="max-h-[62dvh] w-full rounded-lg bg-paper" />
          <div className="space-y-4 text-[14px]">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={onBoard} disabled={!target}>
                <LayoutPanelTop className="size-4" /> Add to moodboard
              </Button>
              <Button onClick={onSave} disabled={!target}>
                <Bookmark className="size-4" /> Save to collection
              </Button>
              <Button variant="ghost" onClick={onFav} aria-pressed={fav}>
                <Heart className={cx("size-4", fav && "fill-lilac-strong text-lilac-strong")} /> {fav ? "Favourited" : "Favourite"}
              </Button>
            </div>
            {target && <p className="text-[12px] text-ink-3">Adds to “{target}”. Change the collection at the top of the page.</p>}
            <dl className="space-y-2">
              <Meta k="Category" v={INSPIRATION_CATEGORIES.find((c) => c.id === asset.category)?.label ?? ""} />
              <Meta k="Colours" v={asset.colorFamilies.map((f) => COLOR_FAMILY_LABELS[f]).join(", ")} />
              <Meta k="Mood" v={asset.moods.join(", ")} />
              <Meta k="Style" v={asset.styles.join(", ")} />
              <Meta k="Tags" v={asset.tags.join(", ")} />
            </dl>
            <div className="rounded-lg bg-surface-2 p-3 text-[13px]">
              <p className="font-medium">Source & usage</p>
              <p className="mt-1 text-ink-2">{asset.license.creator} · {asset.license.license}</p>
              <p className="mt-1 text-ink-3">{asset.license.usage}</p>
              <p className="mt-2 text-ink-3">{copy.inspirationUsage}</p>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-ink-3">{k}</dt>
      <dd className="capitalize">{v}</dd>
    </div>
  );
}
