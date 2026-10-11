"use client";
import { useMemo, useRef, useState } from "react";
import { Check, Download, FileDown, FileText, Loader2 } from "lucide-react";
import type { PresentationSection, PresentationSettings, PresentationStyle } from "@/lib/model/types";
import { useWorkspace } from "@/components/workspace/context";
import { StageIntro } from "@/components/workspace/StageIntro";
import { buildPages, PAGE_H, PAGE_W, STYLE_INFO, THEMES, type PageCtx } from "@/components/presentation/Pages";
import { useImagePrintLookup, useImageResolver } from "@/components/common/resolvers";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, Segmented, Toggle } from "@/components/ui/controls";
import { toast } from "@/components/ui/Toast";
import { cx } from "@/components/ui/cx";
import { swatchLookup } from "@/lib/model/factory";
import { exportElement } from "@/lib/export/raster";
import { downloadBlob, safeFileName } from "@/lib/export/download";
import { relTime } from "@/components/common/misc";

const SECTION_LABELS: Record<PresentationSection, string> = {
  cover: "Cover",
  concept: "Concept",
  moodboard: "Moodboard",
  palette: "Colour palette",
  materials: "Fabrics & prints",
  lineup: "Line-up & looks",
  garments: "Garment pages",
  notes: "Notes & credits",
};

export function PresentationStage() {
  const { c, update } = useWorkspace();
  const s = c.presentation;
  const resolve = useImageResolver();
  const imagePrint = useImagePrintLookup(c);
  const swatch = swatchLookup(c);
  const pages = useMemo(() => buildPages(c, s), [c, s]);
  const ctx: PageCtx = { c, s, theme: THEMES[s.style], resolve, swatch, imagePrint };
  const [busy, setBusy] = useState<string | null>(null);
  const pageRefs = useRef<(HTMLElement | null)[]>([]);

  const set = (fn: (p: PresentationSettings) => void, coalesce?: string) => update((d) => fn(d.presentation as PresentationSettings), { coalesce });

  async function exportPdf() {
    if (!pages.length) return;
    setBusy(`Preparing page 1 of ${pages.length}`);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "px", format: [PAGE_W, PAGE_H], hotfixes: ["px_scaling"], compress: true });
      doc.setProperties({ title: c.name, subject: c.concept.statement, author: s.designer || "", creator: "Yamica Studio" });
      for (let i = 0; i < pages.length; i++) {
        setBusy(`Rendering page ${i + 1} of ${pages.length}`);
        const blob = await exportElement(pages[i].render(ctx, i + 1, pages.length), PAGE_W * 1.5, PAGE_H * 1.5, "image/jpeg", THEMES[s.style].bg);
        const data = new Uint8Array(await blob.arrayBuffer());
        if (i > 0) doc.addPage([PAGE_W, PAGE_H], "landscape");
        doc.addImage(data, "JPEG", 0, 0, PAGE_W, PAGE_H, undefined, "FAST");
      }
      setBusy("Saving PDF");
      downloadBlob(doc.output("blob"), `${safeFileName(c.name)}-presentation.pdf`);
      set((p) => void (p.lastExportedAt = Date.now()));
      toast(`PDF downloaded · ${pages.length} pages`, { tone: "success" });
    } catch (e) {
      console.error(e);
      toast("The PDF couldn't be created. Try again, or export single pages as PNG.", { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function exportPage(i: number) {
    setBusy(`Rendering ${pages[i].label}`);
    try {
      const blob = await exportElement(pages[i].render(ctx, i + 1, pages.length), PAGE_W * 2, PAGE_H * 2, "image/png", THEMES[s.style].bg);
      downloadBlob(blob, `${safeFileName(c.name)}-${String(i + 1).padStart(2, "0")}-${safeFileName(pages[i].label)}.png`);
    } catch {
      toast("That page couldn't be exported.", { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <StageIntro stage="presentation" />
      <div className="grid gap-8 px-4 pb-24 md:px-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6 lg:sticky lg:top-[120px] lg:self-start" aria-label="Presentation settings">
          <section>
            <h2 className="mb-2 text-[15px] font-semibold">Style</h2>
            <div role="radiogroup" aria-label="Presentation style" className="grid gap-2">
              {(Object.keys(STYLE_INFO) as PresentationStyle[]).map((st) => {
                const th = THEMES[st];
                const on = s.style === st;
                return (
                  <button
                    key={st}
                    role="radio"
                    aria-checked={on}
                    onClick={() => set((p) => void (p.style = st))}
                    className={cx("flex items-center gap-3 rounded-lg border p-2.5 text-start transition-colors", on ? "border-lilac-strong bg-lilac-wash" : "border-line bg-surface hover:bg-paper")}
                  >
                    <span className="flex h-11 w-16 shrink-0 flex-col justify-end gap-1 rounded border border-black/10 p-1.5" style={{ background: th.bg }} aria-hidden>
                      <span className="block h-1.5 w-8 rounded-sm" style={{ background: th.ink }} />
                      <span className="block h-1 w-5 rounded-sm" style={{ background: th.accent }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">{STYLE_INFO[st].name}</span>
                      <span className="block text-[12px] leading-snug text-ink-3">{STYLE_INFO[st].blurb}</span>
                    </span>
                    {on && <Check className="size-4 shrink-0 text-lilac-strong" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2.5 rounded-xl border border-line bg-surface p-4">
            <h2 className="text-[15px] font-semibold">Sections</h2>
            {(Object.keys(SECTION_LABELS) as PresentationSection[]).map((k) => (
              <Toggle key={k} label={SECTION_LABELS[k]} checked={s.sections[k]} onChange={(v) => set((p) => void (p.sections[k] = v))} />
            ))}
            {s.sections.garments && (
              <div className="pt-1">
                <p className="mb-1.5 text-[12px] text-ink-3">Garment pages for</p>
                <Segmented
                  size="sm"
                  label="Garment pages for"
                  value={s.garmentPages}
                  onChange={(v) => set((p) => void (p.garmentPages = v))}
                  options={[
                    { value: "board", label: "Whole line-up" },
                    { value: "selected", label: "Selected & final" },
                  ]}
                />
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <Field label="Designer name" htmlFor="pr-designer">
              <input id="pr-designer" className="field" value={s.designer} maxLength={80} placeholder="Your name" onChange={(e) => set((p) => void (p.designer = e.target.value), "pr-designer")} />
            </Field>
            <Field label="Credits & thanks" htmlFor="pr-credits" hint="Shown on the notes page, above the automatic image credits.">
              <textarea id="pr-credits" rows={3} className="field resize-y text-[13px]" value={s.credits} placeholder="Photography, models, thanks…" onChange={(e) => set((p) => void (p.credits = e.target.value), "pr-credits")} />
            </Field>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4">
            <Button variant="primary" className="w-full" onClick={exportPdf} disabled={!!busy || !pages.length}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
              {busy ?? `Export PDF · ${pages.length} page${pages.length === 1 ? "" : "s"}`}
            </Button>
            <p className="mt-2 text-[12px] text-ink-3" aria-live="polite">
              {s.lastExportedAt ? `Last exported ${relTime(s.lastExportedAt)}.` : "A4 landscape. Built in your browser; nothing is uploaded."}
            </p>
          </section>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="display text-3xl">Preview</h2>
            <p className="text-[13px] text-ink-3">Exactly what goes into the PDF.</p>
          </div>
          {pages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-12 text-center text-ink-3">Turn on at least one section to build a presentation.</p>
          ) : (
            <>
              <nav aria-label="Pages" className="scroll-thin mb-4 flex gap-2 overflow-x-auto pb-2">
                {pages.map((p, i) => (
                  <button key={p.key} onClick={() => pageRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-2 hover:bg-paper">
                    {i + 1}. {p.label}
                  </button>
                ))}
              </nav>
              <ol className="space-y-6">
                {pages.map((p, i) => (
                  <li key={p.key} ref={(el) => void (pageRefs.current[i] = el)} className="scroll-mt-32">
                    <div className="mb-1.5 flex items-center gap-2 text-[13px] text-ink-3">
                      <FileText className="size-3.5" /> Page {i + 1} · {p.label}
                      <IconButton size="sm" label="Download this page as PNG" className="ms-auto" disabled={!!busy} onClick={() => exportPage(i)}>
                        <Download className="size-3.5" />
                      </IconButton>
                    </div>
                    <div className="overflow-hidden rounded-md border border-line shadow-lift [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">{p.render(ctx, i + 1, pages.length)}</div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
