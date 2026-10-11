"use client";
// Presentation pages as plain SVG, so the on-screen preview and the exported
// PDF are rendered from exactly the same drawing.

import type { ReactElement, ReactNode } from "react";
import type { Collection, GarmentDesign, PresentationSettings, PresentationStyle } from "@/lib/model/types";
import { GarmentSVG } from "@/components/garment/GarmentSVG";
import { MoodboardSVG, type ImageResolver } from "@/components/moodboard/MoodboardSVG";
import type { ImagePrintLookup, SwatchLookup } from "@/lib/garments/resolve";
import { activeMoodboard, activePalette } from "@/lib/model/factory";
import { BOARD_H, BOARD_W } from "@/lib/moodboard/layouts";
import { FONT_STACK, wrapText } from "@/lib/text/wrap";
import { getTemplate, CATEGORY_LABELS } from "@/lib/garments/templates";
import { normaliseOptions } from "@/lib/garments/resolve";
import { getFabric, textureTile, WEIGHT_LABELS } from "@/lib/fabrics/fabrics";
import { getVectorPrint, printSwatchSVG } from "@/lib/prints/prints";
import { getInspiration } from "@/lib/inspiration/library";
import { inkOn, hexToRgb } from "@/lib/color/color";
import { designMaterials, lineup } from "@/lib/collection/summary";
import { STATUS_LABELS } from "@/components/garment/GarmentEditor";
import { copy } from "@/lib/i18n/en";

export const PAGE_W = 1414;
export const PAGE_H = 1000;

interface Theme {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  accent: string;
  rule: string;
  title: "serif" | "sans";
  titleSize: number;
  label: (n: number, s: string) => string;
}

export const THEMES: Record<PresentationStyle, Theme> = {
  minimal: { bg: "#FCFBF8", panel: "#F3F1EC", ink: "#2B2826", muted: "#8A837C", accent: "#2B2826", rule: "#E4E0D8", title: "sans", titleSize: 40, label: (_n, s) => s.toUpperCase() },
  editorial: { bg: "#F7F3EC", panel: "#EEE7DC", ink: "#2B2826", muted: "#7A726B", accent: "#6E5690", rule: "#D9D0C2", title: "serif", titleSize: 76, label: (n, s) => `${String(n).padStart(2, "0")} — ${s}` },
  student: { bg: "#FFFFFF", panel: "#F2F4EF", ink: "#26292A", muted: "#6B716C", accent: "#55684D", rule: "#D5DBD1", title: "sans", titleSize: 44, label: (n, s) => `Section ${n} · ${s}` },
};

export const STYLE_INFO: Record<PresentationStyle, { name: string; blurb: string }> = {
  minimal: { name: "Minimal portfolio", blurb: "Quiet white pages, small type, lots of space." },
  editorial: { name: "Editorial", blurb: "Large serif titles and image-led spreads." },
  student: { name: "Student", blurb: "Clear sections with specs and annotations." },
};

export interface PageCtx {
  c: Collection;
  s: PresentationSettings;
  theme: Theme;
  resolve: ImageResolver;
  swatch: SwatchLookup;
  imagePrint: ImagePrintLookup;
}

export interface PageDef {
  key: string;
  label: string;
  section: string;
  render: (ctx: PageCtx, n: number, total: number) => ReactElement;
}

/* ------------------------------------------------------------ primitives */

function T({ x, y, text, size, family = "sans", fill, weight, width, lh = 1.35, maxLines, anchor, italic, ls }: { x: number; y: number; text: string; size: number; family?: "serif" | "sans"; fill: string; weight?: number; width?: number; lh?: number; maxLines?: number; anchor?: "start" | "middle" | "end"; italic?: boolean; ls?: number }) {
  const lines = width ? wrapText(text, { family, size, weight, italic, width, maxLines }) : [text];
  return (
    <text x={x} y={y} fontFamily={FONT_STACK[family]} fontSize={size} fill={fill} fontWeight={weight} textAnchor={anchor} fontStyle={italic ? "italic" : undefined} letterSpacing={ls}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : size * lh}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function linesHeight(text: string, o: { family: "serif" | "sans"; size: number; width: number; lh?: number; maxLines?: number; weight?: number }) {
  return wrapText(text, o).length * o.size * (o.lh ?? 1.35);
}

function Frame({ ctx, n, total, section, children }: { ctx: PageCtx; n: number; total: number; section: string; children: ReactNode }) {
  const { theme: th, c } = ctx;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} role="img" aria-label={`${section} page`}>
      <rect width={PAGE_W} height={PAGE_H} fill={th.bg} />
      {children}
      {section && (
        <>
          <T x={64} y={PAGE_H - 40} text={c.name} size={13} fill={th.muted} />
          <T x={PAGE_W - 64} y={PAGE_H - 40} text={`${section}   ${n} / ${total}`} size={13} fill={th.muted} anchor="end" />
        </>
      )}
    </svg>
  );
}

function Heading({ ctx, n, label, title, y = 96 }: { ctx: PageCtx; n: number; label: string; title: string; y?: number }) {
  const th = ctx.theme;
  return (
    <g>
      <T x={64} y={y} text={th.label(n, label)} size={14} fill={th.accent} weight={600} ls={1.4} />
      <T x={64} y={y + 18 + th.titleSize} text={title} size={th.titleSize} family={th.title} fill={th.ink} weight={th.title === "sans" ? 500 : 400} />
      {ctx.s.style === "student" && <rect x={64} y={y + 40 + th.titleSize} width={PAGE_W - 128} height={1.5} fill={th.rule} />}
    </g>
  );
}

function svgData(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* --------------------------------------------------------------- pages */

function Cover(ctx: PageCtx) {
  const { c, s, theme: th } = ctx;
  const board = lineup(c);
  const mb = activeMoodboard(c);
  const pal = activePalette(c).swatches;
  const year = new Date().getFullYear();
  if (s.style === "minimal") {
    return (
      <Frame ctx={ctx} n={1} total={1} section="">
        <T x={64} y={120} text={(c.concept.season || "Collection").toUpperCase()} size={14} fill={th.muted} ls={2} />
        <T x={64} y={430} text={c.name} size={88} fill={th.ink} weight={500} width={760} lh={1.05} maxLines={3} />
        <T x={64} y={PAGE_H - 96} text={s.designer || "Designer"} size={16} fill={th.ink} />
        <T x={64} y={PAGE_H - 70} text={`${year}`} size={14} fill={th.muted} />
        {board.slice(0, 3).map((d, i) => (
          <GarmentSVG key={d.id} design={d} swatch={ctx.swatch} imagePrint={ctx.imagePrint} tight box={{ x: 860 + i * 160 - (board.length < 3 ? -80 : 0), y: 300, w: 200, h: 260 }} />
        ))}
        {pal.slice(0, 6).map((sw, i) => (
          <rect key={sw.id} x={64 + i * 28} y={480 + 20} width={20} height={20} fill={sw.hex} rx={10} />
        ))}
      </Frame>
    );
  }
  if (s.style === "student") {
    return (
      <Frame ctx={ctx} n={1} total={1} section="">
        <rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill={th.panel} />
        <rect x={64} y={64} width={PAGE_W - 128} height={PAGE_H - 128} fill={th.bg} stroke={th.rule} />
        <T x={112} y={150} text="FASHION DESIGN PORTFOLIO" size={14} fill={th.accent} weight={600} ls={2} />
        <T x={112} y={250} text={c.name} size={72} fill={th.ink} weight={600} width={700} lh={1.05} maxLines={2} />
        <T x={112} y={420} text={c.concept.statement || ""} size={20} fill={th.muted} width={620} maxLines={4} />
        <g>
          {[
            ["Designer", s.designer || "—"],
            ["Season", c.concept.season || "—"],
            ["Pieces", String(board.length)],
            ["Year", String(year)],
          ].map(([k, v], i) => (
            <g key={k}>
              <T x={112 + [0, 260, 460, 560][i]} y={760} text={k.toUpperCase()} size={12} fill={th.muted} ls={1.2} />
              <T x={112 + [0, 260, 460, 560][i]} y={790} text={v} size={18} fill={th.ink} width={[240, 180, 90, 90][i]} maxLines={2} />
            </g>
          ))}
        </g>
        {board.slice(0, 4).map((d, i) => (
          <GarmentSVG key={d.id} design={d} swatch={ctx.swatch} imagePrint={ctx.imagePrint} tight box={{ x: 830 + (i % 2) * 230, y: 140 + Math.floor(i / 2) * 330, w: 220, h: 300 }} />
        ))}
      </Frame>
    );
  }
  // editorial: moodboard bleed on the right
  const imgW = 700;
  return (
    <Frame ctx={ctx} n={1} total={1} section="">
      <clipPath id="cv-clip">
        <rect x={PAGE_W - imgW} y={0} width={imgW} height={PAGE_H} />
      </clipPath>
      {(() => {
        const hero = [...(mb?.items ?? [])].filter((i) => i.type === "image").sort((a, b) => b.w * b.h - a.w * a.h)[0];
        if (!hero || hero.type !== "image") return <rect x={PAGE_W - imgW} width={imgW} height={PAGE_H} fill={th.panel} />;
        const img = ctx.resolve(hero.image);
        const sc = Math.max(imgW / img.width, PAGE_H / img.height);
        return (
          <g clipPath="url(#cv-clip)">
            <rect x={PAGE_W - imgW} width={imgW} height={PAGE_H} fill={img.placeholder} />
            {img.src && <image href={img.src} x={PAGE_W - imgW + (imgW - img.width * sc) / 2} y={(PAGE_H - img.height * sc) / 2} width={img.width * sc} height={img.height * sc} preserveAspectRatio="none" />}
          </g>
        );
      })()}
      <T x={64} y={110} text={(c.concept.season || "Collection").toUpperCase()} size={14} fill={th.accent} weight={600} ls={2} />
      <T x={64} y={420} text={c.name} size={120} family="serif" fill={th.ink} width={600} lh={0.95} maxLines={3} />
      <T x={64} y={600} text={c.concept.statement} size={22} family="serif" italic fill={th.muted} width={520} maxLines={4} />
      <T x={64} y={PAGE_H - 90} text={s.designer ? `Designed by ${s.designer}` : ""} size={16} fill={th.ink} />
      <T x={64} y={PAGE_H - 64} text={String(year)} size={14} fill={th.muted} />
      {pal.slice(0, 6).map((sw, i) => (
        <rect key={sw.id} x={64 + i * 34} y={PAGE_H - 170} width={26} height={26} rx={13} fill={sw.hex} stroke="#0001" />
      ))}
    </Frame>
  );
}

function ConceptPage(ctx: PageCtx, n: number, total: number, sec: number) {
  const { c, theme: th } = ctx;
  const k = c.concept;
  const mb = activeMoodboard(c);
  const imgs = (mb?.items ?? []).filter((i) => i.type === "image").slice(0, 2);
  const facts: [string, string][] = [
    ["Season", k.season],
    ["For", k.audience],
    ["Silhouettes", k.silhouettes.join(", ")],
    ["Materials", k.materials.join(", ")],
    ["Planned pieces", k.garmentTarget ? String(k.garmentTarget) : ""],
  ].filter(([, v]) => v) as [string, string][];
  let fy = 520;
  return (
    <Frame ctx={ctx} n={n} total={total} section="Concept">
      <Heading ctx={ctx} n={sec} label="Concept" title="The idea" />
      <T x={64} y={330} text={k.statement || "No concept statement yet."} size={ctx.s.style === "editorial" ? 34 : 26} family={ctx.s.style === "editorial" ? "serif" : "sans"} fill={th.ink} width={700} lh={1.25} maxLines={5} />
      {facts.map(([label, v]) => {
        const y = fy;
        fy += Math.max(44, linesHeight(v, { family: "sans", size: 17, width: 520, maxLines: 3 }) + 22);
        return (
          <g key={label}>
            <rect x={64} y={y - 26} width={700} height={1} fill={th.rule} />
            <T x={64} y={y} text={label.toUpperCase()} size={12} fill={th.muted} ls={1.2} />
            <T x={244} y={y} text={v} size={17} fill={th.ink} width={520} maxLines={3} />
          </g>
        );
      })}
      <g>
        {k.keywords.slice(0, 8).map((w, i) => {
          const x = 64 + (i % 4) * 176;
          const y = Math.min(fy + 10, 840) + Math.floor(i / 4) * 44;
          return (
            <g key={w}>
              <rect x={x} y={y - 22} width={164} height={34} rx={17} fill="none" stroke={th.accent} />
              <T x={x + 82} y={y} text={w} size={15} fill={th.accent} anchor="middle" />
            </g>
          );
        })}
      </g>
      {imgs.map((it, i) => {
        if (it.type !== "image") return null;
        const img = ctx.resolve(it.image);
        const bx = { x: 830 + i * 270, y: 200 + i * 240, w: 250, h: 340 };
        const sc = Math.max(bx.w / img.width, bx.h / img.height);
        return (
          <g key={it.id}>
            <clipPath id={`cp-img-${i}`}>
              <rect x={bx.x} y={bx.y} width={bx.w} height={bx.h} />
            </clipPath>
            <rect x={bx.x} y={bx.y} width={bx.w} height={bx.h} fill={img.placeholder} />
            {img.src && <image href={img.src} clipPath={`url(#cp-img-${i})`} x={bx.x + (bx.w - img.width * sc) / 2} y={bx.y + (bx.h - img.height * sc) / 2} width={img.width * sc} height={img.height * sc} preserveAspectRatio="none" />}
          </g>
        );
      })}
    </Frame>
  );
}

function MoodboardPage(ctx: PageCtx, n: number, total: number, sec: number) {
  const mb = activeMoodboard(ctx.c);
  const w = PAGE_W - 128;
  const h = (w * BOARD_H) / BOARD_W;
  const fitH = 760;
  const scale = Math.min(1, fitH / h);
  const bw = w * scale;
  const bh = h * scale;
  return (
    <Frame ctx={ctx} n={n} total={total} section="Moodboard">
      <T x={64} y={88} text={ctx.theme.label(sec, "Moodboard")} size={14} fill={ctx.theme.accent} weight={600} ls={1.4} />
      {mb && mb.items.length ? (
        <MoodboardSVG board={mb} items={mb.items} resolve={ctx.resolve} swatchHex={ctx.swatch} uid="pmb" box={{ x: (PAGE_W - bw) / 2, y: 120, w: bw, h: bh }} />
      ) : (
        <T x={PAGE_W / 2} y={PAGE_H / 2} text="The moodboard is empty." size={20} fill={ctx.theme.muted} anchor="middle" />
      )}
    </Frame>
  );
}

function PalettePage(ctx: PageCtx, n: number, total: number, sec: number) {
  const { c, theme: th } = ctx;
  const pal = activePalette(c);
  const sw = pal.swatches;
  const cols = Math.min(Math.max(sw.length, 1), 6);
  const gap = 20;
  const cw = (PAGE_W - 128 - gap * (cols - 1)) / cols;
  const rows = Math.ceil(sw.length / cols);
  const ch = rows > 1 ? 250 : 420;
  const alts = c.palettes.filter((p) => p.id !== pal.id && p.swatches.length);
  return (
    <Frame ctx={ctx} n={n} total={total} section="Colour">
      <Heading ctx={ctx} n={sec} label="Colour" title={pal.name || "Palette"} />
      {sw.map((s, i) => {
        const x = 64 + (i % cols) * (cw + gap);
        const y = 250 + Math.floor(i / cols) * (ch + 110);
        const [r, g, b] = hexToRgb(s.hex);
        return (
          <g key={s.id}>
            <rect x={x} y={y} width={cw} height={ch} fill={s.hex} rx={ctx.s.style === "minimal" ? 0 : 6} stroke="#0000000f" />
            {s.role !== "none" && <T x={x + 16} y={y + 30} text={s.role.toUpperCase()} size={11} fill={inkOn(s.hex)} ls={1.2} weight={600} />}
            <T x={x} y={y + ch + 32} text={s.name} size={20} fill={th.ink} family={th.title} width={cw} maxLines={1} />
            <T x={x} y={y + ch + 58} text={`${s.hex.toUpperCase()}   RGB ${r} ${g} ${b}`} size={13} fill={th.muted} />
          </g>
        );
      })}
      {alts.length > 0 && rows === 1 && (
        <g>
          <T x={64} y={830} text="ALTERNATE PALETTES" size={12} fill={th.muted} ls={1.2} />
          {alts.slice(0, 3).map((p, i) => (
            <g key={p.id}>
              <T x={64 + i * 420} y={862} text={p.name} size={14} fill={th.ink} />
              {p.swatches.slice(0, 8).map((s, j) => (
                <rect key={s.id} x={64 + i * 420 + j * 34} y={874} width={30} height={30} rx={4} fill={s.hex} stroke="#0000000f" />
              ))}
            </g>
          ))}
        </g>
      )}
      <T x={64} y={PAGE_H - 70} text={copy.colorDisclaimer} size={12} fill={th.muted} width={PAGE_W - 128} maxLines={2} />
    </Frame>
  );
}

function usedMaterials(c: Collection) {
  const fabrics = new Set<string>(c.saved.fabrics);
  const prints = new Set<string>(c.saved.prints);
  for (const d of lineup(c)) {
    const m = designMaterials(c, d);
    m.fabrics.forEach((f) => fabrics.add(f));
    m.prints.forEach((p) => prints.add(p));
  }
  return { fabrics: [...fabrics].map(getFabric).filter((f): f is NonNullable<ReturnType<typeof getFabric>> => !!f), prints: [...prints] };
}

function MaterialsPage(ctx: PageCtx, n: number, total: number, sec: number) {
  const { c, theme: th } = ctx;
  const { fabrics, prints } = usedMaterials(c);
  const fw = 200;
  return (
    <Frame ctx={ctx} n={n} total={total} section="Materials">
      <Heading ctx={ctx} n={sec} label="Materials" title="Fabrics & prints" />
      <T x={64} y={262} text="FABRICS" size={12} fill={th.muted} ls={1.2} />
      {fabrics.length === 0 && <T x={64} y={300} text="No fabrics chosen yet." size={16} fill={th.muted} />}
      {fabrics.slice(0, 6).map((f, i) => {
        const x = 64 + i * (fw + 24);
        const tile = textureTile(f.textureId);
        return (
          <g key={f.id}>
            {tile && (
              <pattern id={`mt-${f.id}`} width={tile.w} height={tile.h} patternUnits="userSpaceOnUse" patternTransform="scale(2.2)" dangerouslySetInnerHTML={{ __html: tile.body }} />
            )}
            <rect x={x} y={282} width={fw} height={130} fill={f.swatchColor} />
            {tile && <rect x={x} y={282} width={fw} height={130} fill={`url(#mt-${f.id})`} />}
            <T x={x} y={444} text={f.name} size={17} fill={th.ink} width={fw} maxLines={1} />
            <T x={x} y={468} text={`${WEIGHT_LABELS[f.weight] ?? f.weight} · ${f.drape} drape`} size={12} fill={th.muted} width={fw} maxLines={1} />
            {ctx.s.style === "student" && <T x={x} y={490} text={f.summary} size={12} fill={th.muted} width={fw} maxLines={3} />}
          </g>
        );
      })}
      <T x={64} y={590} text="PRINTS" size={12} fill={th.muted} ls={1.2} />
      {prints.length === 0 && <T x={64} y={628} text="No prints in this collection." size={16} fill={th.muted} />}
      {prints.slice(0, 6).map((id, i) => {
        const x = 64 + i * (fw + 24);
        const vp = getVectorPrint(id);
        const ip = vp ? undefined : ctx.imagePrint(id);
        const href = vp ? svgData(printSwatchSVG(id, undefined, 200, 1)) : ip?.url;
        return (
          <g key={id}>
            <rect x={x} y={610} width={fw} height={170} fill={th.panel} />
            {href && <image href={href} x={x} y={610} width={fw} height={170} preserveAspectRatio="xMidYMid slice" />}
            <T x={x} y={812} text={vp?.name ?? ip?.print.name ?? "Image print"} size={17} fill={th.ink} width={fw} maxLines={1} />
            <T x={x} y={836} text={vp ? "Vector print · recolourable" : "Image print"} size={12} fill={th.muted} />
          </g>
        );
      })}
      <T x={64} y={PAGE_H - 70} text={copy.materialsDisclaimer} size={12} fill={th.muted} width={PAGE_W - 128} maxLines={2} />
    </Frame>
  );
}

function LineupPage(ctx: PageCtx, n: number, total: number, sec: number) {
  const { c, theme: th } = ctx;
  const board = lineup(c);
  const count = Math.max(1, board.length);
  const perRow = count <= 6 ? count : Math.ceil(count / 2);
  const rows = Math.ceil(count / perRow);
  const areaW = PAGE_W - 128;
  const cellW = areaW / perRow;
  const cellH = rows === 1 ? 520 : 290;
  const figW = Math.min(cellW - 16, (cellH - 20) * (360 / 470));
  return (
    <Frame ctx={ctx} n={n} total={total} section="Line-up">
      <Heading ctx={ctx} n={sec} label="Line-up" title={`${board.length} piece${board.length === 1 ? "" : "s"}`} />
      {board.length === 0 && <T x={64} y={340} text="No designs in the line-up yet." size={18} fill={th.muted} />}
      {board.map((d, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const cx = 64 + col * cellW + cellW / 2;
        const y = (rows === 1 ? 270 : 240) + row * (cellH + 60);
        const figH = figW * (470 / 360);
        return (
          <g key={d.id}>
            <GarmentSVG design={d} swatch={ctx.swatch} imagePrint={ctx.imagePrint} tight box={{ x: cx - figW / 2, y, w: figW, h: figH }} />
            <T x={cx} y={y + figH + 30} text={`${String(i + 1).padStart(2, "0")}  ${d.name}`} size={14} fill={th.ink} anchor="middle" />
            {ctx.s.style !== "minimal" && <T x={cx} y={y + figH + 50} text={STATUS_LABELS[d.status]} size={12} fill={th.muted} anchor="middle" />}
          </g>
        );
      })}
    </Frame>
  );
}

function LooksPage(ctx: PageCtx, n: number, total: number, sec: number) {
  const { c, theme: th } = ctx;
  const looks = c.looks.filter((l) => l.designIds.length).slice(0, 4);
  const byId = new Map(c.designs.map((d) => [d.id, d]));
  const cols = Math.min(looks.length, 2) || 1;
  const cw = (PAGE_W - 128 - 32 * (cols - 1)) / cols;
  const ch = looks.length > 2 ? 300 : 620;
  return (
    <Frame ctx={ctx} n={n} total={total} section="Looks">
      <Heading ctx={ctx} n={sec} label="Looks" title="Styled together" />
      {looks.map((l, i) => {
        const x = 64 + (i % cols) * (cw + 32);
        const y = 240 + Math.floor(i / cols) * (ch + 40);
        const pieces = l.designIds.map((id) => byId.get(id)).filter((d): d is GarmentDesign => !!d);
        const fh = ch - 110;
        const fw = Math.min(fh * (360 / 470), (cw - 40) / Math.max(1, pieces.length));
        const startX = x + (cw - fw * pieces.length) / 2;
        return (
          <g key={l.id}>
            <rect x={x} y={y} width={cw} height={ch} fill={th.panel} rx={ctx.s.style === "minimal" ? 0 : 8} />
            {pieces.map((d, j) => (
              <GarmentSVG key={d.id} design={d} swatch={ctx.swatch} imagePrint={ctx.imagePrint} tight box={{ x: startX + j * fw, y: y + 20, w: fw, h: fh }} />
            ))}
            <T x={x + 20} y={y + ch - 56} text={l.name} size={20} family={th.title} fill={th.ink} />
            <T x={x + 20} y={y + ch - 30} text={l.description || pieces.map((d) => d.name).join(" · ")} size={13} fill={th.muted} width={cw - 40} maxLines={1} />
          </g>
        );
      })}
    </Frame>
  );
}

function GarmentPage(ctx: PageCtx, d: GarmentDesign, n: number, total: number, sec: number, idx: number) {
  const { c, theme: th } = ctx;
  const t = getTemplate(d.templateId);
  const opts = normaliseOptions(t, d.options);
  const hasBack = t.views.includes("back");
  const m = designMaterials(c, d);
  const tot = [...m.colors.values()].reduce((a, b) => a + b, 0) || 1;
  const colors = [...m.colors].sort((a, b) => b[1] - a[1]).filter(([, w]) => w / tot > 0.02).slice(0, 6);
  const figH = 760;
  const figW = figH * (360 / 470);
  const fx = 64;
  const specX = hasBack ? 64 + figW * 0.62 * 2 + 70 : 64 + figW + 60;
  const specW = PAGE_W - 64 - specX;
  const specs: [string, string][] = t.options.map((o) => [o.label, o.values.find((v) => v.id === opts[o.id])?.label ?? ""]);
  let y = 260;
  return (
    <Frame ctx={ctx} n={n} total={total} section="Garments">
      {hasBack ? (
        <g>
          <GarmentSVG design={{ ...d, view: "front" }} swatch={ctx.swatch} imagePrint={ctx.imagePrint} tight box={{ x: fx, y: 140, w: figW * 0.62, h: figH * 0.62 * 1.3 }} />
          <GarmentSVG design={{ ...d, view: "back" }} swatch={ctx.swatch} imagePrint={ctx.imagePrint} tight box={{ x: fx + figW * 0.62 + 20, y: 140, w: figW * 0.62, h: figH * 0.62 * 1.3 }} />
          <T x={fx + (figW * 0.62) / 2} y={PAGE_H - 96} text="Front" size={13} fill={th.muted} anchor="middle" />
          <T x={fx + figW * 0.62 * 1.5 + 20} y={PAGE_H - 96} text="Back" size={13} fill={th.muted} anchor="middle" />
        </g>
      ) : (
        <g>
          <GarmentSVG design={{ ...d, view: "front" }} swatch={ctx.swatch} imagePrint={ctx.imagePrint} tight box={{ x: fx, y: 90, w: figW, h: figH }} />
          <T x={fx + figW / 2} y={PAGE_H - 96} text="Front view" size={13} fill={th.muted} anchor="middle" />
        </g>
      )}
      <T x={specX} y={110} text={th.label(sec, `Look piece ${String(idx + 1).padStart(2, "0")}`)} size={13} fill={th.accent} weight={600} ls={1.2} />
      <T x={specX} y={168} text={d.name} size={Math.min(th.titleSize, 52)} family={th.title} fill={th.ink} width={specW} lh={1.05} maxLines={2} weight={th.title === "sans" ? 500 : 400} />
      <T x={specX} y={226} text={`${CATEGORY_LABELS[t.category]} · ${STATUS_LABELS[d.status]}`} size={14} fill={th.muted} />
      {specs.map(([k, v]) => {
        const yy = (y += 30);
        return (
          <g key={k}>
            <T x={specX} y={yy} text={k} size={13} fill={th.muted} />
            <T x={specX + 130} y={yy} text={v} size={14} fill={th.ink} width={specW - 130} maxLines={1} />
          </g>
        );
      })}
      {(() => {
        y += 50;
        const fab = [...m.fabrics].map((f) => getFabric(f)?.name ?? f).join(", ") || "Not set";
        const pr = [...m.prints].map((p) => getVectorPrint(p)?.name ?? ctx.imagePrint(p)?.print.name ?? "Image print").join(", ") || "None";
        const y1 = y;
        y += 64;
        const y2 = y;
        y += 64;
        const y3 = y;
        y += 70;
        return (
          <g>
            <T x={specX} y={y1} text="FABRIC" size={11} fill={th.muted} ls={1.2} />
            <T x={specX} y={y1 + 24} text={fab} size={15} fill={th.ink} width={specW} maxLines={1} />
            <T x={specX} y={y2} text="PRINT" size={11} fill={th.muted} ls={1.2} />
            <T x={specX} y={y2 + 24} text={pr} size={15} fill={th.ink} width={specW} maxLines={1} />
            <T x={specX} y={y3} text="COLOURS" size={11} fill={th.muted} ls={1.2} />
            {colors.map(([hex], i) => (
              <rect key={hex} x={specX + i * 36} y={y3 + 12} width={28} height={28} rx={ctx.s.style === "minimal" ? 0 : 14} fill={hex} stroke="#0000001a" />
            ))}
          </g>
        );
      })()}
      {d.notes.trim() && (
        <g>
          <T x={specX} y={y + 10} text="NOTES" size={11} fill={th.muted} ls={1.2} />
          <T x={specX} y={y + 34} text={d.notes} size={14} fill={th.ink} width={specW} maxLines={Math.max(1, Math.floor((PAGE_H - 130 - (y + 34)) / 19))} />
        </g>
      )}
    </Frame>
  );
}

export interface CreditLine {
  title: string;
  detail: string;
}

/** Every third-party or user asset the presentation shows, with its licence. */
export function creditLines(c: Collection): CreditLine[] {
  const out: CreditLine[] = [];
  const seen = new Set<string>();
  const mb = activeMoodboard(c);
  for (const it of mb?.items ?? []) {
    if (it.type !== "image" || seen.has(it.image.id)) continue;
    seen.add(it.image.id);
    if (it.image.kind === "library") {
      const a = getInspiration(it.image.id);
      if (a) out.push({ title: a.title, detail: `${a.license.creator} · ${a.license.license}` });
    } else out.push({ title: "Your uploaded image", detail: "Uploaded by the designer" });
  }
  const { prints } = usedMaterials(c);
  for (const p of prints) {
    const vp = getVectorPrint(p);
    if (vp) out.push({ title: `${vp.name} print`, detail: `${vp.license.creator} · ${vp.license.license}` });
    else {
      const ip = c.imagePrints.find((x) => x.id === p);
      if (ip) out.push({ title: `${ip.name} (image print)`, detail: `${ip.license.creator} · ${ip.license.license}` });
    }
  }
  out.push({ title: "Instrument Serif & Instrument Sans", detail: "SIL Open Font License" });
  return out;
}

function NotesPage(ctx: PageCtx, n: number, total: number, sec: number) {
  const { c, s, theme: th } = ctx;
  const credits = creditLines(c);
  const colW = 600;
  const per = Math.ceil(credits.length / 2);
  return (
    <Frame ctx={ctx} n={n} total={total} section="Notes & credits">
      <Heading ctx={ctx} n={sec} label="Notes & credits" title="Notes" />
      <T x={64} y={270} text={c.notes.trim() || "No collection notes."} size={18} fill={c.notes.trim() ? th.ink : th.muted} width={colW} lh={1.45} maxLines={14} />
      {s.credits.trim() && <T x={64} y={600} text={s.credits} size={15} fill={th.ink} width={colW} maxLines={4} />}
      <T x={64} y={720} text={s.designer ? `Designed by ${s.designer}` : ""} size={16} fill={th.ink} />
      <T x={64} y={760} text={copy.flatsDisclaimer} size={12} fill={th.muted} width={colW} maxLines={3} />
      <T x={64} y={820} text={copy.colorDisclaimer} size={12} fill={th.muted} width={colW} maxLines={3} />
      <T x={750} y={262} text="IMAGE, PRINT AND TYPE CREDITS" size={12} fill={th.muted} ls={1.2} />
      {credits.slice(0, 28).map((l, i) => {
        const col = i < per && credits.length > 14 ? 0 : credits.length > 14 ? 1 : 0;
        const row = credits.length > 14 ? (i < per ? i : i - per) : i;
        const x = 750 + col * 300;
        const y = 296 + row * 44;
        return (
          <g key={i}>
            <T x={x} y={y} text={l.title} size={13} fill={th.ink} width={credits.length > 14 ? 280 : 600} maxLines={1} />
            <T x={x} y={y + 18} text={l.detail} size={11} fill={th.muted} width={credits.length > 14 ? 280 : 600} maxLines={1} />
          </g>
        );
      })}
      <T x={750} y={PAGE_H - 70} text="Made with Yamica Studio" size={12} fill={th.muted} />
    </Frame>
  );
}

/* ------------------------------------------------------------- page list */

export function buildPages(c: Collection, s: PresentationSettings): PageDef[] {
  const defs: { key: string; label: string; section: string; draw: (ctx: PageCtx, n: number, total: number, sec: number) => ReactElement }[] = [];
  if (s.sections.cover) defs.push({ key: "cover", label: "Cover", section: "cover", draw: (ctx) => Cover(ctx) });
  if (s.sections.concept) defs.push({ key: "concept", label: "Concept", section: "concept", draw: ConceptPage });
  if (s.sections.moodboard) defs.push({ key: "moodboard", label: "Moodboard", section: "moodboard", draw: MoodboardPage });
  if (s.sections.palette) defs.push({ key: "palette", label: "Colour palette", section: "palette", draw: PalettePage });
  if (s.sections.materials) defs.push({ key: "materials", label: "Fabrics & prints", section: "materials", draw: MaterialsPage });
  if (s.sections.lineup) {
    defs.push({ key: "lineup", label: "Line-up", section: "lineup", draw: LineupPage });
    if (c.looks.some((l) => l.designIds.length)) defs.push({ key: "looks", label: "Looks", section: "lineup", draw: LooksPage });
  }
  if (s.sections.garments) {
    const list = lineup(c).filter((d) => s.garmentPages === "board" || d.status === "selected" || d.status === "final");
    list.forEach((d, i) => defs.push({ key: `g-${d.id}`, label: d.name, section: "garments", draw: (ctx, n, t, sec) => GarmentPage(ctx, d, n, t, sec, i) }));
  }
  if (s.sections.notes) defs.push({ key: "notes", label: "Notes & credits", section: "notes", draw: NotesPage });

  // section numbers skip the cover
  const order = [...new Set(defs.map((d) => d.section).filter((x) => x !== "cover"))];
  return defs.map((d) => ({
    key: d.key,
    label: d.label,
    section: d.section,
    render: (ctx, n, total) => d.draw(ctx, n, total, order.indexOf(d.section) + 1),
  }));
}
