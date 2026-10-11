"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Copy, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { StudioHeader } from "@/components/common/StudioHeader";
import { CollectionPreview } from "@/components/common/CollectionPreview";
import { FabricSwatch, PrintSwatch, RefImage } from "@/components/common/visuals";
import { Onboarding } from "@/components/dashboard/Onboarding";
import { CreateCollectionDialog } from "@/components/dashboard/CreateCollectionDialog";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/controls";
import { toast } from "@/components/ui/Toast";
import { cx } from "@/components/ui/cx";
import { useStudio } from "@/lib/store/studio";
import { STARTERS } from "@/lib/model/factory";
import { nextStage, progress } from "@/lib/model/progress";
import { collectionHref } from "@/lib/routes";
import { copy } from "@/lib/i18n/en";
import { getInspiration } from "@/lib/inspiration/library";
import { getFabric } from "@/lib/fabrics/fabrics";
import { getVectorPrint } from "@/lib/prints/prints";
import { SAMPLE_ID } from "@/lib/model/sample";
import type { Collection } from "@/lib/model/types";
import { ProgressBar, relTime } from "@/components/common/misc";

export default function Dashboard() {
  const collections = useStudio((s) => s.collections);
  const prefs = useStudio((s) => s.prefs);
  const [creating, setCreating] = useState<string | null>(null);
  const [onboard, setOnboard] = useState(!prefs.onboarded);
  const list = useMemo(() => Object.values(collections).sort((a, b) => b.updatedAt - a.updatedAt), [collections]);
  const last = (prefs.lastCollectionId && collections[prefs.lastCollectionId]) || list[0];

  const favInspo = [...new Set([...prefs.favorites.inspiration, ...prefs.recentInspiration])].map(getInspiration).filter(Boolean).slice(0, 8);
  const recentMats = prefs.recentMaterials.slice(0, 8);

  return (
    <div className="min-h-dvh">
      <StudioHeader />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 md:px-8">
        <section className="flex flex-col gap-6 pt-10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">My Studio</p>
            <h1 className="display mt-2 text-[44px] md:text-[60px]">{list.length ? "Welcome back to the atelier." : "Start with a feeling."}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="brand" size="lg" icon={<Plus className="size-4" />} onClick={() => setCreating("scratch")}>
              Create a collection
            </Button>
          </div>
        </section>

        {last && <ContinueCard c={last} />}

        <section className="mt-14" aria-labelledby="mine">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="mine" className="display text-[32px]">My collections</h2>
            <span className="text-[13px] text-ink-3">{list.length} in this browser</span>
          </div>
          {list.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <CollectionCard key={c.id} c={c} />
              ))}
              <button onClick={() => setCreating("scratch")} className="group flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-ink-3 transition-colors hover:border-lilac-strong hover:bg-lilac-wash hover:text-lilac-deep">
                <Plus className="size-6" />
                <span className="font-medium">New collection</span>
              </button>
            </div>
          ) : (
            <EmptyState title="No collections yet" body="Create one from scratch or begin with a starter below." action={<Button variant="brand" onClick={() => setCreating("scratch")}>Create a collection</Button>} />
          )}
          {!collections[SAMPLE_ID] && (
            <button className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink" onClick={() => (useStudio.getState().resetSample(), toast("Soft City sample restored", { tone: "success" }))}>
              <RotateCcw className="size-3.5" /> Bring back the Soft City sample
            </button>
          )}
        </section>

        <section className="mt-14" aria-labelledby="starters">
          <h2 id="starters" className="display mb-1 text-[32px]">Starter templates</h2>
          <p className="mb-4 text-sm text-ink-3">A suggested palette and keywords to get going. Change anything.</p>
          <div className="scroll-thin -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:px-0">
            {STARTERS.map((s) => (
              <button key={s.id} onClick={() => setCreating(s.id)} className="group w-48 shrink-0 snap-start rounded-lg border border-line bg-surface p-3 text-start transition-shadow hover:shadow-lift md:w-auto">
                <div className="flex h-16 overflow-hidden rounded-md">
                  {s.palette.length ? s.palette.map(([hex]) => <div key={hex} className="flex-1" style={{ background: hex }} />) : <div className="flex flex-1 items-center justify-center border border-dashed border-line-strong text-ink-4"><Plus className="size-5" /></div>}
                </div>
                <p className="mt-3 text-[14px] font-medium">{s.name}</p>
                <p className="text-[12px] leading-snug text-ink-3">{s.blurb}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="inspo">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="inspo" className="display text-[28px]">Recently saved inspiration</h2>
              <Link className="text-[13px] font-medium text-lilac-strong hover:underline" href="/studio/inspiration">Browse library</Link>
            </div>
            {favInspo.length ? (
              <div className="grid grid-cols-4 gap-2">
                {favInspo.map((a) => (
                  <Link key={a!.id} href={`/studio/inspiration?asset=${a!.id}`} className="group overflow-hidden rounded-md">
                    <RefImage image={{ kind: "library", id: a!.id }} className="aspect-square transition-transform duration-500 group-hover:scale-[1.03]" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing saved yet" body="Heart images in the inspiration library and they'll appear here." action={<ButtonLink href="/studio/inspiration" size="sm">Explore inspiration</ButtonLink>} />
            )}
          </section>
          <section aria-labelledby="mats">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="mats" className="display text-[28px]">Recently used fabrics & prints</h2>
              <Link className="text-[13px] font-medium text-lilac-strong hover:underline" href="/studio/materials">Open library</Link>
            </div>
            {recentMats.length ? (
              <div className="grid grid-cols-4 gap-2">
                {recentMats.map((m) => (
                  <Link key={`${m.kind}-${m.id}`} href={`/studio/materials?tab=${m.kind === "fabric" ? "fabrics" : "prints"}`} className="group">
                    {m.kind === "fabric" ? <FabricSwatch fabricId={m.id} className="aspect-square w-full rounded-md" /> : <PrintSwatch printId={m.id} className="aspect-square rounded-md" />}
                    <p className="mt-1 truncate text-[12px] text-ink-3">{m.kind === "fabric" ? getFabric(m.id)?.name : getVectorPrint(m.id)?.name}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No materials used yet" body="Fabrics and prints you apply to garments show up here." action={<ButtonLink href="/studio/materials" size="sm">Explore materials</ButtonLink>} />
            )}
          </section>
        </div>

        <p className="mt-16 max-w-xl text-[13px] text-ink-3">{copy.storageNoteLong}</p>
      </main>

      <CreateCollectionDialog open={!!creating} starter={creating ?? "scratch"} onClose={() => setCreating(null)} />
      <Onboarding
        open={onboard}
        onDone={(starter) => {
          setOnboard(false);
          if (starter) setCreating(starter);
        }}
      />
    </div>
  );
}

function ContinueCard({ c }: { c: Collection }) {
  const p = progress(c);
  const next = nextStage(c);
  return (
    <section aria-label="Continue designing" className="grid overflow-hidden rounded-xl border border-line bg-surface shadow-soft md:grid-cols-[1.4fr_1fr]">
      <Link href={collectionHref(c.id)} className="block">
        <CollectionPreview c={c} className="h-full min-h-[240px]" />
      </Link>
      <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
        <div>
          <p className="eyebrow">Continue designing</p>
          <h2 className="display mt-2 text-[40px]">{c.name}</h2>
          {c.concept.statement && <p className="mt-2 line-clamp-3 text-[15px] text-ink-2">{c.concept.statement}</p>}
        </div>
        <div>
          <ProgressBar pct={p.pct} label={`${p.done} of ${p.total} stages`} />
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={collectionHref(c.id, next)} variant="primary" icon={<ArrowRight className="size-4" />}>
              {p.done === p.total ? "Open collection" : `Continue: ${copy.stages[next].label}`}
            </ButtonLink>
            <ButtonLink href={collectionHref(c.id, "presentation")} variant="ghost">View presentation</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function CollectionCard({ c }: { c: Collection }) {
  const [menu, setMenu] = useState(false);
  const [rename, setRename] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(c.name);
  const p = progress(c);
  const s = useStudio.getState();
  return (
    <article className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-lift">
      <Link href={collectionHref(c.id)} className="block" aria-label={`Open ${c.name}`}>
        <CollectionPreview c={c} />
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-semibold">
              <Link href={collectionHref(c.id)} className="hover:underline">{c.name}</Link>
            </h3>
            <p className="text-[13px] text-ink-3">
              {c.designs.length} garment{c.designs.length === 1 ? "" : "s"} · edited {relTime(c.updatedAt)}
              {c.isSample && <span className="ms-2 rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-medium text-sage-deep">Sample</span>}
            </p>
          </div>
          <div className="relative">
            <button aria-label={`More actions for ${c.name}`} aria-expanded={menu} onClick={() => setMenu(!menu)} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
              <MoreHorizontal className="size-5" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div role="menu" className="absolute end-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lift animate-pop">
                  <MenuItem icon={<Pencil className="size-4" />} onClick={() => (setMenu(false), setName(c.name), setRename(true))}>Rename</MenuItem>
                  <MenuItem
                    icon={<Copy className="size-4" />}
                    onClick={() => {
                      setMenu(false);
                      s.duplicate(c.id);
                      toast(`Duplicated ${c.name}`, { tone: "success" });
                    }}
                  >
                    Duplicate
                  </MenuItem>
                  <MenuItem icon={<Trash2 className="size-4" />} danger onClick={() => (setMenu(false), setConfirm(true))}>Delete</MenuItem>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar pct={p.pct} label={`${p.done}/${p.total} stages`} />
        </div>
      </div>
      <Dialog
        open={rename}
        onClose={() => setRename(false)}
        title="Rename collection"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRename(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => (s.rename(c.id, name), setRename(false))}>Save</Button>
          </>
        }
      >
        <form onSubmit={(e) => (e.preventDefault(), s.rename(c.id, name), setRename(false))}>
          <input data-autofocus aria-label="Collection name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={copy.confirmDelete}
        description={`“${c.name}” and its moodboard, palette and designs will be removed from this browser. Uploaded images stay in Saved assets.`}
        onConfirm={() => {
          const removed = s.remove(c.id);
          if (removed) toast(`Deleted ${removed.name}`, { action: { label: copy.undo, run: () => useStudio.getState().restore(removed) } });
        }}
      />
    </article>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={cx("flex w-full items-center gap-2.5 px-3 py-2 text-start text-[14px] hover:bg-surface-2", danger && "text-danger")}>
      {icon}
      {children}
    </button>
  );
}
