"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LibraryShell, TargetSelect, useTargetCollection } from "@/components/library/shared";
import { MaterialsBrowser } from "@/components/materials/MaterialsBrowser";
import { toast } from "@/components/ui/Toast";
import { useStudio } from "@/lib/store/studio";
import { activePalette } from "@/lib/model/factory";
import { uid } from "@/lib/model/ids";
import { copy } from "@/lib/i18n/en";

export default function MaterialsPage() {
  return (
    <Suspense>
      <Materials />
    </Suspense>
  );
}

function Materials() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") === "prints" ? "prints" : "fabrics";
  const [target, setTarget, list] = useTargetCollection();

  const toggle = (kind: "fabrics" | "prints", id: string) => {
    if (!target) return toast("Create a collection first.", { tone: "error" });
    const on = target.saved[kind].includes(id);
    useStudio.getState().update(target.id, (d) => {
      const l = d.saved[kind];
      if (on) l.splice(l.indexOf(id), 1);
      else l.push(id);
    });
    if (!on) useStudio.getState().noteRecent(kind === "fabrics" ? "fabric" : "print", id);
  };

  async function uploadPrint(file: File) {
    if (!target) return toast("Create a collection first.", { tone: "error" });
    try {
      const meta = await useStudio.getState().addUpload(file);
      useStudio.getState().update(target.id, (d) => {
        d.imagePrints.push({
          id: uid("ip"),
          kind: "image",
          name: meta.name,
          category: "abstract",
          uploadId: meta.id,
          tile: { w: 120, h: Math.round(120 / (meta.width / meta.height)) },
          license: { creator: "You", license: "Your upload", usage: "Uploaded by you. Make sure you have the right to use it.", source: file.name },
        });
        if (!d.saved.uploads.includes(meta.id)) d.saved.uploads.push(meta.id);
      });
      toast(`${meta.name} added to ${target.name} as an image print`, { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add that print.", { tone: "error" });
    }
  }

  return (
    <LibraryShell
      eyebrow="Library"
      title="Fabrics & prints"
      intro="Fabric sets how a surface looks and behaves; a print is the pattern on top. Save either to a collection to use it in the garment editor."
      actions={<TargetSelect value={target} onChange={setTarget} list={list} />}
    >
      <MaterialsBrowser
        tab={tab}
        onTab={(t) => router.replace(`/studio/materials?tab=${t}`, { scroll: false })}
        savedFabrics={target?.saved.fabrics}
        savedPrints={target?.saved.prints}
        onToggleFabric={(id) => toggle("fabrics", id)}
        onTogglePrint={(id) => toggle("prints", id)}
        palette={target ? activePalette(target).swatches : undefined}
        imagePrints={target?.imagePrints}
        onUploadPrint={uploadPrint}
      />
      <p className="mt-10 text-[12px] text-ink-3">{copy.materialsDisclaimer}</p>
    </LibraryShell>
  );
}
