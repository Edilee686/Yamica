"use client";
import { useState } from "react";
import { Minus, Plus, Sparkles, X } from "lucide-react";
import { useWorkspace } from "@/components/workspace/context";
import { StageIntro } from "@/components/workspace/StageIntro";
import { DNACard } from "@/components/workspace/CollectionDNA";
import { Chip, Field } from "@/components/ui/controls";
import { useStudio } from "@/lib/store/studio";

const KEYWORDS = ["minimal", "romantic", "urban", "sculptural", "playful", "relaxed", "tailored", "vintage-inspired", "experimental", "botanical", "graphic", "soft", "bold", "utilitarian"];
const SEASONS = ["Spring / Summer", "Autumn / Winter", "Resort", "All year", "Celebrations", "Festival"];
const SILHOUETTES = ["Relaxed", "Oversized", "Fitted", "Tailored", "Boxy", "A-line", "Wide-leg", "Cropped", "Flowing", "Structured"];
const MATERIALS = ["Cotton", "Linen", "Lightweight denim", "Jersey", "Satin", "Wool", "Corduroy", "Crepe", "Mesh", "Recycled fibres"];
const PROMPTS = ["This collection feels like…", "It's for someone who…", "I keep coming back to…"];

export function ConceptStage() {
  const { c, update, mode } = useWorkspace();
  const rename = useStudio((s) => s.rename);
  const k = c.concept;
  const [custom, setCustom] = useState("");

  const toggle = (field: "keywords" | "silhouettes" | "materials", v: string) =>
    update((d) => {
      const list = d.concept[field];
      const i = list.indexOf(v);
      if (i >= 0) list.splice(i, 1);
      else list.push(v);
    });

  const addKeyword = () => {
    const v = custom.trim().toLowerCase();
    if (v && !k.keywords.includes(v)) update((d) => void d.concept.keywords.push(v));
    setCustom("");
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <StageIntro stage="concept" />
      <div className="grid gap-8 px-4 pb-20 md:px-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-7">
          <Field label="Collection name" htmlFor="c-name">
            <input id="c-name" className="field display text-[28px]" value={c.name} onChange={(e) => rename(c.id, e.target.value)} onBlur={(e) => !e.target.value.trim() && rename(c.id, "Untitled collection")} maxLength={80} />
          </Field>

          <Field label="Concept statement" htmlFor="c-statement" hint={`${k.statement.length}/280 · A sentence or two is plenty.`}>
            <textarea
              id="c-statement"
              rows={3}
              maxLength={280}
              className="field resize-none text-[16px] leading-relaxed"
              placeholder="A relaxed capsule inspired by…"
              value={k.statement}
              onChange={(e) => update((d) => void (d.concept.statement = e.target.value), { coalesce: "statement" })}
            />
            {mode === "guided" && !k.statement && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
                <Sparkles className="size-3.5 text-lilac-strong" /> Not sure where to begin? Try:
                {PROMPTS.map((p) => (
                  <button key={p} onClick={() => update((d) => void (d.concept.statement = p + " "))} className="rounded-full border border-line px-2 py-0.5 hover:border-lilac-strong hover:text-lilac-deep">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-2">Style keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...KEYWORDS, ...k.keywords])].map((w) => (
                <Chip key={w} active={k.keywords.includes(w)} onClick={() => toggle("keywords", w)}>
                  {w}
                  {k.keywords.includes(w) && !KEYWORDS.includes(w) && <X className="size-3" aria-label="remove" />}
                </Chip>
              ))}
            </div>
            <form onSubmit={(e) => (e.preventDefault(), addKeyword())} className="mt-2 flex max-w-sm gap-2">
              <input aria-label="Add your own keyword" className="field h-9 py-1" placeholder="Add your own…" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={30} />
              <button className="h-9 shrink-0 rounded-full bg-surface-2 px-4 text-[13px] font-medium hover:bg-surface-3" disabled={!custom.trim()}>Add</button>
            </form>
            {mode === "guided" && <p className="mt-2 text-[12px] text-ink-3">Two to four keywords keep a collection focused. These are suggestions, so add words that are truly yours.</p>}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Season or occasion" htmlFor="c-season">
              <input id="c-season" className="field" list="season-list" value={k.season} onChange={(e) => update((d) => void (d.concept.season = e.target.value), { coalesce: "season" })} placeholder="e.g. Spring / Summer" />
              <datalist id="season-list">{SEASONS.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Desired number of garments" hint={`You have ${c.designs.length} so far.`}>
              <div className="flex h-[42px] w-fit items-center rounded-sm border border-line-strong bg-surface">
                <button aria-label="Fewer garments" className="h-full px-3 text-ink-2 hover:bg-surface-2 disabled:opacity-30" disabled={k.garmentTarget <= 1} onClick={() => update((d) => void (d.concept.garmentTarget = Math.max(1, d.concept.garmentTarget - 1)))}>
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center tabular-nums" aria-live="polite">{k.garmentTarget}</span>
                <button aria-label="More garments" className="h-full px-3 text-ink-2 hover:bg-surface-2 disabled:opacity-30" disabled={k.garmentTarget >= 40} onClick={() => update((d) => void (d.concept.garmentTarget = Math.min(40, d.concept.garmentTarget + 1)))}>
                  <Plus className="size-4" />
                </button>
              </div>
            </Field>
          </div>

          <Field label="Intended audience" htmlFor="c-aud" hint="Describe the wearer by how they live, not by age or gender.">
            <textarea id="c-aud" rows={2} className="field resize-none" placeholder="People who…" value={k.audience} onChange={(e) => update((d) => void (d.concept.audience = e.target.value), { coalesce: "audience" })} maxLength={200} />
          </Field>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-2">Silhouette preferences <span className="font-normal text-ink-3">· optional</span></p>
            <div className="flex flex-wrap gap-1.5">
              {SILHOUETTES.map((w) => (
                <Chip key={w} active={k.silhouettes.includes(w)} onClick={() => toggle("silhouettes", w)}>{w}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-2">Material priorities <span className="font-normal text-ink-3">· optional</span></p>
            <div className="flex flex-wrap gap-1.5">
              {MATERIALS.map((w) => (
                <Chip key={w} active={k.materials.includes(w)} onClick={() => toggle("materials", w)}>{w}</Chip>
              ))}
            </div>
          </div>
        </div>
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <DNACard />
          <p className="mt-3 text-[12px] text-ink-3">Your Collection DNA stays one click away in every stage. Use it to check new ideas against your direction.</p>
        </aside>
      </div>
    </div>
  );
}
