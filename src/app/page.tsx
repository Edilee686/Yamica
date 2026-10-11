"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, HardDrive, Layers, Palette as PaletteIcon, Shirt, Sparkles } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { GarmentSVG } from "@/components/garment/GarmentSVG";
import { buildPages, STYLE_INFO, THEMES, type PageCtx } from "@/components/presentation/Pages";
import type { ImageResolver } from "@/components/moodboard/MoodboardSVG";
import { cx } from "@/components/ui/cx";
import { createSoftCity, SAMPLE_ID } from "@/lib/model/sample";
import { activePalette, swatchLookup } from "@/lib/model/factory";
import { getInspiration, INSPIRATION } from "@/lib/inspiration/library";
import { FABRICS } from "@/lib/fabrics/fabrics";
import { PRINTS, getVectorPrint } from "@/lib/prints/prints";
import { TEMPLATES } from "@/lib/garments/templates";
import { allPanels } from "@/lib/garments/edit";
import { collectionHref } from "@/lib/routes";
import { inkOn } from "@/lib/color/color";
import { copy } from "@/lib/i18n/en";
import type { GarmentDesign, PresentationStyle } from "@/lib/model/types";

const resolveLibrary: ImageResolver = (ref) => {
  const a = ref.kind === "library" ? getInspiration(ref.id) : undefined;
  return { src: a?.src, width: a?.width ?? 1000, height: a?.height ?? 1000, placeholder: a?.dominant ?? "#E2DACD" };
};

const JOURNEY = [
  { n: "01", title: "Concept", body: "Name the collection, the season and who it's for. Pick a few words that hold the idea." },
  { n: "02", title: "Moodboard", body: "Arrange images, colour chips and notes on a free canvas. Crop, rotate, layer and export." },
  { n: "03", title: "Colours", body: "Pull a palette from your images, then name, order and refine every colour." },
  { n: "04", title: "Fabrics & prints", body: "Choose fabrics for how they look and move, and prints you can scale, rotate and recolour." },
  { n: "05", title: "Garments", body: "Start from a template, swap collars, sleeves and lengths, and paint each panel." },
  { n: "06", title: "Collection", body: "Order the line-up, group looks, mark favourites and see how the pieces work together." },
  { n: "07", title: "Presentation", body: "Choose a layout style and export a polished PDF of the whole collection." },
];

const FAQ = [
  { q: "What can I make with Yamica Studio?", a: "Moodboards, colour palettes, fabric and print selections, garment flats (shirts, T-shirts, dresses, skirts, trousers and jackets) and a full collection presentation." },
  { q: "What can I export?", a: "Moodboards as PNG, garments as PNG or SVG, single presentation pages as PNG, and the whole presentation as a PDF. You can also download a backup file of your collections." },
  { q: "Are the garments sewing patterns?", a: copy.flatsDisclaimer },
  { q: "Are the colours exact?", a: copy.colorDisclaimer },
  { q: "Do I need an account? Where is my work saved?", a: `No account. ${copy.storageNoteLong}` },
  { q: "Can I use the library images as prints for sale?", a: "The inspiration images are original references made for this studio and are fine to use on boards and presentations. Develop your own artwork before printing anything commercially. The built-in vector prints are free to use in your designs." },
];

export default function Landing() {
  const sample = useMemo(() => createSoftCity(), []);
  const palette = activePalette(sample).swatches;
  const lookup = swatchLookup(sample);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-4 md:px-8">
          <Logo />
          <nav aria-label="Sections" className="hidden items-center gap-1 text-[14px] text-ink-3 md:flex">
            <a href="#journey" className="rounded-full px-3 py-1.5 hover:text-ink">How it works</a>
            <a href="#try" className="rounded-full px-3 py-1.5 hover:text-ink">Try a garment</a>
            <a href="#libraries" className="rounded-full px-3 py-1.5 hover:text-ink">Libraries</a>
            <a href="#faq" className="rounded-full px-3 py-1.5 hover:text-ink">FAQ</a>
          </nav>
          <ButtonLink href="/studio" variant="primary" size="sm" className="ms-auto">Open the studio</ButtonLink>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-4 pt-12 pb-20 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
          <div className="animate-fade-up">
            <p className="eyebrow">A digital fashion design studio</p>
            <h1 className="display mt-4 text-[56px] leading-[0.95] md:text-[84px]">
              Your ideas. Your style. <em className="text-lilac-strong">Your first collection.</em>
            </h1>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-2">
              Build moodboards, explore fabrics, customise garments and bring your fashion ideas together in one creative studio. Free, in your browser, no account.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/studio" variant="brand" size="lg">
                Start designing <ArrowRight className="size-4 rtl:-scale-x-100" />
              </ButtonLink>
              <ButtonLink href={collectionHref(SAMPLE_ID, "collection")} size="lg">
                Explore a sample collection
              </ButtonLink>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[13px] text-ink-3">
              <HardDrive className="size-4" /> {copy.storageNote}. Download a backup any time.
            </p>
          </div>
          <HeroCollage sample={sample} />
        </section>

        {/* --------------------------------------------------------- journey */}
        <section id="journey" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-[1320px] px-4 py-20 md:px-8">
            <p className="eyebrow">How it works</p>
            <h2 className="display mt-3 max-w-2xl text-[44px] md:text-[56px]">From first spark to finished line-up, in seven steps.</h2>
            <p className="mt-3 max-w-2xl text-ink-2">Follow the guided path, or switch to the free studio and jump between steps. Both work on the same collection.</p>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {JOURNEY.map((j) => (
                <li key={j.n} className="bg-surface p-6">
                  <span className="display text-[34px] text-lilac-strong">{j.n}</span>
                  <h3 className="mt-2 text-[17px] font-semibold">{j.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{j.body}</p>
                </li>
              ))}
              <li className="flex flex-col justify-between bg-lilac-wash p-6">
                <p className="display text-[28px] leading-tight">Begin with the Soft City sample to see every step filled in.</p>
                <Link href={collectionHref(SAMPLE_ID)} className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-lilac-deep hover:underline">
                  Open Soft City <ArrowRight className="size-4 rtl:-scale-x-100" />
                </Link>
              </li>
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------- try */}
        <TryGarment sample={sample} />

        {/* ---------------------------------------------------- presentation */}
        <PresentationExamples sample={sample} />

        {/* ------------------------------------------------------- libraries */}
        <section id="libraries" className="scroll-mt-20 mx-auto max-w-[1320px] px-4 py-20 md:px-8">
          <p className="eyebrow">Libraries</p>
          <h2 className="display mt-3 max-w-2xl text-[44px] md:text-[56px]">Everything you need to start, built in.</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <LibCard icon={<Sparkles className="size-5" />} count={INSPIRATION.length} title="Inspiration images" body="Architecture, nature, art, textures, urban scenes and fashion details, searchable by colour, mood and style." href="/studio/inspiration" />
            <LibCard icon={<Layers className="size-5" />} count={FABRICS.length} title="Fabrics" body="Cotton poplin to corduroy, each with weight, drape, stretch and opacity notes." href="/studio/materials" />
            <LibCard icon={<PaletteIcon className="size-5" />} count={PRINTS.length} title="Recolourable prints" body="Stripes, checks, florals, botanicals and geometrics you can scale, rotate and recolour." href="/studio/materials?tab=prints" />
            <LibCard icon={<Shirt className="size-5" />} count={TEMPLATES.length} title="Garment templates" body="Shirts, tees, dresses, skirts, trousers and jackets with swappable parts." href="/studio/garments" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2" aria-label="Soft City palette">
            {palette.map((s) => (
              <span key={s.id} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 ps-1 pe-3 text-[13px]">
                <span className="size-6 rounded-full ring-1 ring-black/10 ring-inset" style={{ background: s.hex }} /> {s.name}
              </span>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- faq */}
        <section id="faq" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-20 md:px-8 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="eyebrow">Questions</p>
              <h2 className="display mt-3 text-[44px] md:text-[56px]">What you can make, and what to expect.</h2>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded text-[16px] font-medium">
                    {f.q}
                    <span className="text-[22px] leading-none text-ink-3 transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-4 py-20 text-center md:px-8">
          <h2 className="display text-[48px] md:text-[64px]">Start with a feeling.</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-2">An image, a colour, a word. The studio helps you turn it into a collection.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/studio" variant="brand" size="lg">Start designing</ButtonLink>
            <ButtonLink href={collectionHref(SAMPLE_ID, "collection")} size="lg">Explore a sample collection</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-4 px-4 py-8 text-[13px] text-ink-3 md:px-8">
          <Logo />
          <p>Works in your browser. No account, no uploads to a server.</p>
          <p className="ms-auto">Inspiration imagery and prints are original Yamica Studio artwork.</p>
        </div>
      </footer>
    </div>
  );
}

function HeroCollage({ sample }: { sample: ReturnType<typeof createSoftCity> }) {
  const lookup = swatchLookup(sample);
  const pal = activePalette(sample).swatches;
  const shirt = sample.designs.find((d) => d.templateId === "shirt")!;
  const skirt = sample.designs.find((d) => d.templateId === "skirt")!;
  const img = (id: string) => getInspiration(id)!;
  return (
    <div className="relative mx-auto aspect-[1/0.92] w-full max-w-[640px]" aria-hidden>
      <figure className="animate-fade-up absolute start-0 top-[4%] w-[46%] overflow-hidden rounded-lg shadow-lift [animation-delay:80ms]">
        <img src={img("arch-concrete-arches").src} alt="" className="aspect-[4/5] w-full object-cover" />
      </figure>
      <figure className="animate-fade-up absolute end-[2%] top-0 w-[38%] overflow-hidden rounded-lg shadow-lift [animation-delay:160ms]">
        <img src={img("nature-leaf-shadow").src} alt="" className="aspect-[3/4] w-full object-cover" />
      </figure>
      <figure className="animate-fade-up absolute start-[30%] bottom-0 w-[30%] overflow-hidden rounded-lg shadow-lift [animation-delay:240ms]">
        <img src={img("tex-linen").src} alt="" className="aspect-square w-full object-cover" />
      </figure>
      <div className="animate-fade-up absolute end-[4%] bottom-[6%] flex w-[44%] items-end justify-center gap-0 rounded-xl border border-line bg-surface/95 p-3 shadow-pop [animation-delay:320ms]">
        <GarmentSVG design={shirt} swatch={lookup} tight className="w-1/2" />
        <GarmentSVG design={skirt} swatch={lookup} tight className="w-1/2" />
      </div>
      <div className="animate-fade-up absolute start-[3%] bottom-[10%] flex flex-col gap-1.5 rounded-xl border border-line bg-surface/95 p-3 shadow-pop [animation-delay:400ms]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Soft City</span>
        <span className="flex gap-1.5">
          {pal.map((s) => (
            <span key={s.id} className="size-6 rounded-full ring-1 ring-black/10 ring-inset" style={{ background: s.hex }} />
          ))}
        </span>
      </div>
    </div>
  );
}

const TRY_PRINTS = [null, "fine-stripe", "botanical-line", "soft-geometry", "gingham"] as const;

function TryGarment({ sample }: { sample: ReturnType<typeof createSoftCity> }) {
  const pal = activePalette(sample).swatches;
  const [templateId, setTemplateId] = useState<"shirt" | "dress" | "tee">("shirt");
  const [hex, setHex] = useState(pal[2]?.hex ?? "#A9B89E");
  const [printId, setPrintId] = useState<string | null>(null);
  const base = sample.designs.find((d) => d.templateId === templateId && !d.variationOf)!;
  const design = useMemo<GarmentDesign>(() => {
    const d = structuredClone(base);
    for (const p of allPanels(d)) {
      if (p.kind === "button") continue;
      const vp = printId ? getVectorPrint(printId) : undefined;
      d.panels[p.id] = {
        ...d.panels[p.id],
        outline: true,
        fill: vp && (p.kind === "body" || p.kind === "sleeve" || p.kind === "skirt" || p.kind === "panel")
          ? { type: "print", printId: vp.id, scale: 1, rotation: 0, offsetX: 0, offsetY: 0, colors: { [vp.slots[0].key]: { hex } } }
          : { type: "solid", color: { hex: vp ? "#F3EEE3" : hex } },
      };
    }
    return d;
  }, [base, hex, printId]);

  return (
    <section id="try" className="scroll-mt-20 mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-20 md:px-8 lg:grid-cols-[1fr_1fr]">
      <div className="order-2 rounded-2xl border border-line bg-surface p-6 lg:order-1">
        <GarmentSVG design={design} title={`${base.name} preview`} tight className="mx-auto aspect-[360/470] h-auto w-full max-w-[420px]" />
      </div>
      <div className="order-1 lg:order-2">
        <p className="eyebrow">Try it here</p>
        <h2 className="display mt-3 text-[44px] md:text-[56px]">Paint a garment in a few taps.</h2>
        <p className="mt-3 max-w-lg text-ink-2">In the studio you can change every panel on its own, swap collars and sleeves, set print scale and rotation, and save colourways.</p>
        <div className="mt-8 space-y-6">
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink-2">Garment</legend>
            <div className="flex flex-wrap gap-2">
              {(["shirt", "tee", "dress"] as const).map((t) => (
                <button key={t} aria-pressed={templateId === t} onClick={() => setTemplateId(t)} className={cx("rounded-full border px-4 py-2 text-[14px]", templateId === t ? "border-ink bg-ink text-surface" : "border-line-strong hover:bg-surface")}>
                  {t === "tee" ? "T-shirt" : t === "shirt" ? "Shirt" : "Dress"}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink-2">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {pal.map((s) => (
                <button key={s.id} aria-pressed={hex === s.hex} aria-label={s.name} onClick={() => setHex(s.hex)} className={cx("size-11 rounded-full ring-1 ring-black/10 ring-inset transition-transform", hex === s.hex && "outline-2 outline-offset-2 outline-lilac-strong")} style={{ background: s.hex }}>
                  {hex === s.hex && <Check className="mx-auto size-4" style={{ color: inkOn(s.hex) }} />}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink-2">Print</legend>
            <div className="flex flex-wrap gap-2">
              {TRY_PRINTS.map((p) => (
                <button key={p ?? "none"} aria-pressed={printId === p} onClick={() => setPrintId(p)} className={cx("rounded-full border px-4 py-2 text-[14px]", printId === p ? "border-ink bg-ink text-surface" : "border-line-strong hover:bg-surface")}>
                  {p ? getVectorPrint(p)!.name : "Solid"}
                </button>
              ))}
            </div>
          </fieldset>
          <ButtonLink href="/studio/garments" variant="primary">
            Design your own <ArrowRight className="size-4 rtl:-scale-x-100" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function PresentationExamples({ sample }: { sample: ReturnType<typeof createSoftCity> }) {
  const [style, setStyle] = useState<PresentationStyle>("editorial");
  // pages measure text with the loaded fonts, so draw them on the client only
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const s = { ...sample.presentation, style };
  const pages = buildPages(sample, s);
  const ctx: PageCtx = { c: sample, s, theme: THEMES[style], resolve: resolveLibrary, swatch: swatchLookup(sample), imagePrint: () => undefined };
  const show = [pages[0], pages.find((p) => p.key === "lineup"), pages.find((p) => p.key.startsWith("g-"))].filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <section className="border-y border-line bg-paper">
      <div className="mx-auto max-w-[1320px] px-4 py-20 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Presentation</p>
            <h2 className="display mt-3 max-w-2xl text-[44px] md:text-[56px]">Export a PDF that looks like a portfolio.</h2>
            <p className="mt-3 max-w-xl text-ink-2">Cover, concept, moodboard, palette, materials, line-up, a page per garment, and credits. These pages are drawn live from the Soft City sample.</p>
          </div>
          <div role="radiogroup" aria-label="Presentation style" className="inline-flex rounded-full bg-surface-2 p-0.5">
            {(Object.keys(STYLE_INFO) as PresentationStyle[]).map((k) => (
              <button key={k} role="radio" aria-checked={style === k} onClick={() => setStyle(k)} className={cx("rounded-full px-4 py-1.5 text-[14px]", style === k ? "bg-surface font-medium shadow-sm" : "text-ink-3 hover:text-ink")}>
                {STYLE_INFO[k].name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {show.map((p, i) => (
            <figure key={p.key}>
              <div className="aspect-[1414/1000] overflow-hidden rounded-md border border-line bg-surface shadow-lift [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">{mounted && p.render(ctx, pages.indexOf(p) + 1, pages.length)}</div>
              <figcaption className="mt-2 text-[13px] text-ink-3">{["Cover", "Line-up", "Garment page"][i]}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function LibCard({ icon, count, title, body, href }: { icon: React.ReactNode; count: number; title: string; body: string; href: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-line bg-surface p-5 transition-shadow hover:shadow-lift">
      <span className="text-lilac-strong">{icon}</span>
      <p className="display mt-4 text-[44px] leading-none">{count}</p>
      <h3 className="mt-1 text-[16px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-lilac-deep group-hover:underline">
        Browse <ArrowRight className="size-3.5 rtl:-scale-x-100" />
      </span>
    </Link>
  );
}
