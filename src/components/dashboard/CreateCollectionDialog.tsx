"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { STARTERS } from "@/lib/model/factory";
import { useStudio } from "@/lib/store/studio";
import { collectionHref } from "@/lib/routes";

export function CreateCollectionDialog({ open, onClose, starter: initial = "scratch" }: { open: boolean; onClose: () => void; starter?: string }) {
  const [name, setName] = useState("");
  const [starter, setStarter] = useState(initial);
  const create = useStudio((s) => s.create);
  const router = useRouter();
  useEffect(() => {
    if (open) (setStarter(initial), setName(""));
  }, [open, initial]);
  function go() {
    const id = create(starter, name);
    onClose();
    router.push(collectionHref(id, "concept"));
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create a collection"
      description="Give it a working name. You can change everything later."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={go}>Create collection</Button>
        </>
      }
    >
      <form onSubmit={(e) => (e.preventDefault(), go())} className="space-y-5 py-2">
        <div>
          <label htmlFor="new-name" className="mb-1.5 block text-[13px] font-medium text-ink-2">Collection name</label>
          <input id="new-name" data-autofocus className="field text-lg" placeholder="e.g. Soft City, Night Garden…" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink-2">Starting point</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {STARTERS.map((s) => (
              <button
                type="button"
                key={s.id}
                aria-pressed={starter === s.id}
                onClick={() => setStarter(s.id)}
                className={cx("rounded-lg border p-3 text-start transition-colors", starter === s.id ? "border-lilac-strong bg-lilac-wash" : "border-line hover:border-line-strong")}
              >
                <span className="flex h-3 overflow-hidden rounded-sm">
                  {s.palette.length ? s.palette.map(([hex]) => <span key={hex} className="flex-1" style={{ background: hex }} />) : <span className="flex-1 border border-dashed border-line-strong" />}
                </span>
                <span className="mt-2 block text-[14px] font-medium">{s.name}</span>
                <span className="block text-[12px] leading-snug text-ink-3">{s.blurb}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Starters add suggested keywords and a palette. They never limit what you can design.</p>
        </fieldset>
      </form>
    </Dialog>
  );
}
