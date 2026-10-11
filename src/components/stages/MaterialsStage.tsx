"use client";
import { X } from "lucide-react";
import { useWorkspace } from "@/components/workspace/context";
import { StageIntro } from "@/components/workspace/StageIntro";
import { MaterialsBrowser } from "@/components/materials/MaterialsBrowser";
import { FabricSwatch, PrintSwatch } from "@/components/common/visuals";
import { toast } from "@/components/ui/Toast";
import { activePalette } from "@/lib/model/factory";
import { getFabric } from "@/lib/fabrics/fabrics";
import { getVectorPrint } from "@/lib/prints/prints";
import { useStudio } from "@/lib/store/studio";
import { uid } from "@/lib/model/ids";

export function MaterialsStage() {
  const { c, update, param, setParam } = useWorkspace();
  const addUpload = useStudio((s) => s.addUpload);
  const urls = useStudio((s) => s.uploadUrls);
  const tab = (param("tab") === "prints" ? "prints" : "fabrics") as "fabrics" | "prints";

  const toggle = (kind: "fabrics" | "prints", id: string) => {
    const on = c.saved[kind].includes(id);
    update((d) => {
      const list = d.saved[kind];
      if (on) list.splice(list.indexOf(id), 1);
      else list.push(id);
    });
    if (!on) useStudio.getState().noteRecent(kind === "fabrics" ? "fabric" : "print", id);
  };

  async function uploadPrint(file: File) {
    try {
      const meta = await addUpload(file);
      const ratio = meta.width / meta.height;
      update((d) => {
        d.imagePrints.push({
          id: uid("ip"),
          kind: "image",
          name: meta.name,
          category: "abstract",
          uploadId: meta.id,
          tile: { w: 120, h: Math.round(120 / ratio) },
          license: { creator: "You", license: "Your upload", usage: "Uploaded by you. Make sure you have the right to use it.", source: file.name },
        });
        if (!d.saved.uploads.includes(meta.id)) d.saved.uploads.push(meta.id);
      });
      toast(`${meta.name} added as an image print`, { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add that print.", { tone: "error" });
    }
  }

  const fabrics = c.saved.fabrics.map(getFabric).filter(Boolean);
  const prints = c.saved.prints.map(getVectorPrint).filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <StageIntro stage="materials" />
      <div className="px-4 pb-20 md:px-6">
        <section aria-labelledby="saved-mats" className="mb-8 rounded-xl border border-line bg-surface p-4 md:p-5">
          <h2 id="saved-mats" className="text-[15px] font-semibold">Saved to {c.name || "this collection"}</h2>
          <p className="text-[13px] text-ink-3">These appear first in the garment editor. A fabric sets the surface texture; a print or colour goes on top.</p>
          {fabrics.length + prints.length + c.imagePrints.length === 0 ? (
            <p className="mt-3 text-[13px] text-ink-3">Nothing saved yet. Use “Save to collection” on any fabric or print below.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {fabrics.map((f) => (
                <SavedChip key={f!.id} label={f!.name} onRemove={() => toggle("fabrics", f!.id)} visual={<FabricSwatch fabricId={f!.id} className="size-8 rounded" zoom={2} />} />
              ))}
              {prints.map((p) => (
                <SavedChip key={p!.id} label={p!.name} onRemove={() => toggle("prints", p!.id)} visual={<PrintSwatch printId={p!.id} className="size-8 rounded" size={60} />} />
              ))}
              {c.imagePrints.map((p) => (
                <SavedChip key={p.id} label={`${p.name} (image)`} onRemove={() => update((d) => void (d.imagePrints = d.imagePrints.filter((x) => x.id !== p.id)))} visual={<PrintSwatch printId={p.id} imageUrl={urls[p.uploadId]} className="size-8 rounded" scale={0.3} />} />
              ))}
            </div>
          )}
        </section>
        <MaterialsBrowser
          tab={tab}
          onTab={(t) => setParam("tab", t)}
          savedFabrics={c.saved.fabrics}
          savedPrints={c.saved.prints}
          onToggleFabric={(id) => toggle("fabrics", id)}
          onTogglePrint={(id) => toggle("prints", id)}
          palette={activePalette(c).swatches}
          imagePrints={c.imagePrints}
          onUploadPrint={uploadPrint}
        />
      </div>
    </div>
  );
}

function SavedChip({ label, visual, onRemove }: { label: string; visual: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 ps-1 pe-1.5 text-[13px]">
      <span className="overflow-hidden rounded-full">{visual}</span>
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} from collection`} className="rounded-full p-1 text-ink-3 hover:bg-surface-2 hover:text-ink">
        <X className="size-3.5" />
      </button>
    </span>
  );
}
