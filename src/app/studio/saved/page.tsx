"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, HardDrive, Heart, Trash2 } from "lucide-react";
import { LibraryShell, useCollectionsList } from "@/components/library/shared";
import { FabricSwatch, PrintSwatch, RefImage } from "@/components/common/visuals";
import { BackupDialog } from "@/components/common/BackupMenu";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { useStudio } from "@/lib/store/studio";
import { getInspiration } from "@/lib/inspiration/library";
import { getFabric } from "@/lib/fabrics/fabrics";
import { getVectorPrint } from "@/lib/prints/prints";
import { copy } from "@/lib/i18n/en";
import type { Collection, UploadMeta } from "@/lib/model/types";

function uploadUsage(list: Collection[], id: string) {
  return list.filter(
    (c) =>
      c.saved.uploads.includes(id) ||
      c.imagePrints.some((p) => p.uploadId === id) ||
      c.moodboards.some((m) => m.items.some((it) => it.type === "image" && it.image.kind === "upload" && it.image.id === id)),
  );
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

export default function SavedPage() {
  const list = useCollectionsList();
  const favs = useStudio((s) => s.prefs.favorites);
  const toggleFav = useStudio((s) => s.toggleFavorite);
  const uploads = useStudio((s) => s.uploads);
  const [estimate, setEstimate] = useState<{ usage?: number; quota?: number } | null>(null);
  const [backup, setBackup] = useState(false);
  const [deleting, setDeleting] = useState<UploadMeta | null>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then(setEstimate).catch(() => setEstimate(null));
  }, [uploads, list]);

  const myUploads = Object.values(uploads).sort((a, b) => b.createdAt - a.createdAt);
  const inspo = favs.inspiration.map(getInspiration).filter((x): x is NonNullable<typeof x> => !!x);
  const fabrics = favs.fabrics.map(getFabric).filter((x): x is NonNullable<typeof x> => !!x);
  const prints = favs.prints.map(getVectorPrint).filter((x): x is NonNullable<typeof x> => !!x);
  const usedBy = deleting ? uploadUsage(list, deleting.id) : [];

  return (
    <LibraryShell
      eyebrow="Library"
      title="Saved"
      intro="Your favourites and uploads across every collection."
      actions={
        <Button onClick={() => setBackup(true)}>
          <Archive className="size-4" /> Backup & restore
        </Button>
      }
    >
      <section className="mb-10 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4">
        <HardDrive className="size-5 text-lilac-strong" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">{copy.storageNote}</p>
          <p className="text-[13px] text-ink-3">{copy.storageNoteLong}</p>
        </div>
        <p className="text-[13px] text-ink-2">
          {estimate?.usage != null ? `${fmtBytes(estimate.usage)} used${estimate.quota ? ` of about ${fmtBytes(estimate.quota)} available` : ""}` : "Storage size unavailable"}
          {" · "}
          {list.length} collection{list.length === 1 ? "" : "s"} · {myUploads.length} upload{myUploads.length === 1 ? "" : "s"}
        </p>
      </section>

      <Section title="Favourite inspiration" count={inspo.length} empty={<>Tap the heart on any image in <Link className="underline" href="/studio/inspiration">Inspiration</Link>.</>}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {inspo.map((a) => (
            <li key={a.id} className="relative">
              <Link href={`/studio/inspiration?asset=${a.id}`} className="block">
                <RefImage image={{ kind: "library", id: a.id }} className="aspect-[4/5] w-full rounded-lg" />
                <p className="mt-1 truncate text-[12px]">{a.title}</p>
              </Link>
              <UnFav label={a.title} onClick={() => toggleFav("inspiration", a.id)} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Favourite fabrics" count={fabrics.length} empty={<>Heart a fabric in <Link className="underline" href="/studio/materials">Fabrics & prints</Link>.</>}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {fabrics.map((f) => (
            <li key={f.id} className="relative">
              <FabricSwatch fabricId={f.id} className="aspect-square w-full rounded-lg" zoom={3} />
              <p className="mt-1 truncate text-[12px]">{f.name}</p>
              <UnFav label={f.name} onClick={() => toggleFav("fabrics", f.id)} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Favourite prints" count={prints.length} empty={<>Heart a print in <Link className="underline" href="/studio/materials?tab=prints">Fabrics & prints</Link>.</>}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {prints.map((p) => (
            <li key={p.id} className="relative">
              <PrintSwatch printId={p.id} className="aspect-square w-full rounded-lg" size={200} />
              <p className="mt-1 truncate text-[12px]">{p.name}</p>
              <UnFav label={p.name} onClick={() => toggleFav("prints", p.id)} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Uploads" count={myUploads.length} empty={<>Upload images in <Link className="underline" href="/studio/inspiration">Inspiration</Link> or on a moodboard.</>}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {myUploads.map((u) => {
            const used = uploadUsage(list, u.id);
            return (
              <li key={u.id}>
                <RefImage image={{ kind: "upload", id: u.id }} className="aspect-square w-full rounded-lg" />
                <p className="mt-1 truncate text-[12px] font-medium">{u.name}</p>
                <p className="text-[11px] text-ink-3">
                  {u.width}×{u.height} · {fmtBytes(u.size)} · {used.length ? `in ${used.length} collection${used.length === 1 ? "" : "s"}` : "not used"}
                </p>
                <Button size="sm" variant="ghost" className="-ms-2 mt-0.5 text-danger" onClick={() => setDeleting(u)}>
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </li>
            );
          })}
        </ul>
      </Section>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={
          usedBy.length
            ? `It's used in ${usedBy.map((c) => c.name).join(", ")}. Boards will show a grey placeholder where it was, and image prints made from it stop showing. This can't be undone.`
            : "It isn't used in any collection. This can't be undone."
        }
        onConfirm={async () => {
          const u = deleting!;
          setDeleting(null);
          await useStudio.getState().removeUpload(u.id);
          toast(`Deleted ${u.name}`);
        }}
      />
      <BackupDialog open={backup} onClose={() => setBackup(false)} />
    </LibraryShell>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="display mb-4 text-[28px]">
        {title} <span className="text-[18px] text-ink-3">{count}</span>
      </h2>
      {count ? children : <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-[14px] text-ink-3">{empty}</p>}
    </section>
  );
}

function UnFav({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={`Remove ${label} from favourites`} className="absolute end-2 top-2 rounded-full bg-surface/90 p-1.5 shadow-sm">
      <Heart className="size-4 fill-lilac-strong text-lilac-strong" />
    </button>
  );
}
