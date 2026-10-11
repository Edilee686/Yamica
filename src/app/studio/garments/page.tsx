"use client";
import { useRouter } from "next/navigation";
import { LibraryShell, TargetSelect, useTargetCollection } from "@/components/library/shared";
import { TemplateGrid } from "@/components/garment/TemplatePicker";
import { toast } from "@/components/ui/Toast";
import { useStudio } from "@/lib/store/studio";
import { activePalette, newDesign } from "@/lib/model/factory";
import { getTemplate } from "@/lib/garments/templates";
import { collectionHref } from "@/lib/routes";
import { copy } from "@/lib/i18n/en";

export default function GarmentLibrary() {
  const router = useRouter();
  const [target, setTarget, list] = useTargetCollection();

  function use(templateId: string) {
    let id = target?.id;
    if (!id) id = useStudio.getState().create("scratch");
    const c = useStudio.getState().collections[id];
    const d = newDesign(templateId, undefined, activePalette(c));
    useStudio.getState().update(id, (draft) => {
      draft.designs.push(d);
      draft.boardOrder.push(d.id);
    });
    toast(`${getTemplate(templateId).name} added to ${c.name}`, { tone: "success" });
    router.push(collectionHref(id, "garments", { design: d.id }));
  }

  return (
    <LibraryShell
      eyebrow="Library"
      title="Garment templates"
      intro="Each template is a fashion flat with parts you can swap. Pick one to start a design in a collection."
      actions={<TargetSelect value={target} onChange={setTarget} list={list} label="Add to" />}
    >
      <TemplateGrid palette={target ? activePalette(target) : undefined} onPick={use} />
      <p className="mt-10 max-w-3xl text-[12px] text-ink-3">{copy.flatsDisclaimer}</p>
    </LibraryShell>
  );
}
