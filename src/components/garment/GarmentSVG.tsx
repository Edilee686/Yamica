"use client";

import { memo, useId } from "react";
import type { GarmentDesign } from "@/lib/model/types";
import { getFabric, textureTile } from "@/lib/fabrics/fabrics";
import { getVectorPrint, printMotifs, resolvePrintColors } from "@/lib/prints/prints";
import { buildGarment, resolveColor, resolvePanelConfig, type ImagePrintLookup, type SwatchLookup } from "@/lib/garments/resolve";

export interface GarmentSVGProps {
  design: Pick<GarmentDesign, "templateId" | "options" | "view" | "panels">;
  swatch?: SwatchLookup;
  imagePrint?: ImagePrintLookup;
  selected?: string | null;
  hovered?: string | null;
  onSelect?: (panelId: string) => void;
  onHover?: (panelId: string | null) => void;
  className?: string;
  title?: string;
  /** Crop the artboard to the garment (used for thumbnails). */
  tight?: boolean;
  /** Position when nested inside another SVG (presentation pages). */
  box?: { x: number; y: number; w: number; h: number };
}

const INK = "#34312E";

function GarmentSVGInner({ design, swatch, imagePrint, selected, hovered, onSelect, onHover, className, title, tight, box }: GarmentSVGProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const built = buildGarment(design.templateId, design.options, design.view);
  const interactive = !!onSelect;
  const usedTextures = new Set<string>();
  let usesSheen = false;

  const panels = built.panels.map((p) => {
    const cfg = resolvePanelConfig(design as GarmentDesign, p.id, p.configFrom);
    const fabric = getFabric(cfg.fabricId);
    const textureId = cfg.textureId === "none" ? undefined : (cfg.textureId ?? fabric?.textureId);
    if (textureId === "sheen") usesSheen = true;
    else if (textureId && textureTile(textureId)) usedTextures.add(textureId);
    return { p, cfg, textureId };
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={tight ? "20 20 360 470" : "0 0 400 500"}
      className={className}
      {...(box && { x: box.x, y: box.y, width: box.w, height: box.h, preserveAspectRatio: "xMidYMid meet" })}
      role={interactive ? "group" : "img"}
      aria-label={title ?? "Garment design"}
    >
      <defs>
        {[...usedTextures].map((tid) => {
          const t = textureTile(tid)!;
          return <pattern key={tid} id={`${uid}-tx-${tid}`} width={t.w} height={t.h} patternUnits="userSpaceOnUse" dangerouslySetInnerHTML={{ __html: t.body }} />;
        })}
        {usesSheen && (
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="400" y2="500" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".34" stopColor="#fff" stopOpacity=".34" />
            <stop offset=".46" stopColor="#fff" stopOpacity="0.02" />
            <stop offset=".62" stopColor="#fff" stopOpacity=".22" />
            <stop offset=".8" stopColor="#000" stopOpacity=".06" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        )}
        {panels.map(({ p, cfg }) => {
          const fill = cfg.fill;
          const clip = <clipPath key={`c-${p.id}`} id={`${uid}-clip-${p.id}`}><path d={p.d} /></clipPath>;
          if (fill.type !== "print") return clip;
          const transform = `translate(${p.origin[0] + fill.offsetX} ${p.origin[1] + fill.offsetY}) rotate(${fill.rotation}) scale(${fill.scale})`;
          const vector = getVectorPrint(fill.printId);
          if (vector) {
            const colors = resolvePrintColors(vector, Object.fromEntries(Object.entries(fill.colors ?? {}).map(([k, v]) => [k, { hex: resolveColor(v, swatch) }])));
            return [
              clip,
              <pattern
                key={`p-${p.id}`}
                id={`${uid}-pat-${p.id}`}
                width={vector.tile.w}
                height={vector.tile.h}
                patternUnits="userSpaceOnUse"
                patternTransform={transform}
                dangerouslySetInnerHTML={{ __html: printMotifs(vector.id, colors) }}
              />,
            ];
          }
          const img = imagePrint?.(fill.printId);
          if (img?.url) {
            const { w, h } = img.print.tile;
            return [
              clip,
              <pattern key={`p-${p.id}`} id={`${uid}-pat-${p.id}`} width={w} height={h} patternUnits="userSpaceOnUse" patternTransform={transform}>
                <image href={img.url} x="0" y="0" width={w} height={h} preserveAspectRatio="xMidYMid slice" />
              </pattern>,
            ];
          }
          return clip;
        })}
      </defs>

      {panels.map(({ p, cfg, textureId }) => {
        const fill = cfg.fill;
        let ground: string;
        let printed = false;
        if (fill.type === "solid") ground = resolveColor(fill.color, swatch);
        else {
          const vector = getVectorPrint(fill.printId);
          if (vector) {
            const g = fill.colors?.ground;
            ground = g ? resolveColor(g, swatch) : vector.slots[0].default;
            printed = true;
          } else {
            ground = "#E7E1D6";
            printed = !!imagePrint?.(fill.printId)?.url;
          }
        }
        const isSel = selected === p.id;
        const isHover = hovered === p.id && !isSel;
        const selectable = interactive && !p.configFrom;
        return (
          <g
            key={p.id}
            data-panel={p.id}
            onClick={selectable ? (e) => (e.stopPropagation(), onSelect!(p.id)) : undefined}
            onPointerEnter={selectable && onHover ? () => onHover(p.id) : undefined}
            onPointerLeave={selectable && onHover ? () => onHover(null) : undefined}
            style={selectable ? { cursor: "pointer" } : undefined}
          >
            <g clipPath={`url(#${uid}-clip-${p.id})`}>
              <rect x="0" y="0" width="400" height="500" fill={ground} />
              {printed && <rect x="0" y="0" width="400" height="500" fill={`url(#${uid}-pat-${p.id})`} />}
              {textureId === "sheen" && <rect x="0" y="0" width="400" height="500" fill={`url(#${uid}-sheen)`} />}
              {textureId && textureId !== "sheen" && usedTextures.has(textureId) && <rect x="0" y="0" width="400" height="500" fill={`url(#${uid}-tx-${textureId})`} />}
              {p.shade ? <rect x="0" y="0" width="400" height="500" fill="#000" opacity={p.shade} /> : null}
              {isHover && <rect x="0" y="0" width="400" height="500" fill="#8C6E9E" opacity=".1" />}
            </g>
            {cfg.outline !== false && (
              <>
                <path d={p.d} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3" strokeLinejoin="round" />
                <path d={p.d} fill="none" stroke={INK} strokeWidth="1.35" strokeLinejoin="round" />
              </>
            )}
          </g>
        );
      })}

      <g fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
        {built.details.map((d, i) => {
          const style =
            d.kind === "stitch"
              ? { stroke: INK, strokeWidth: 0.75, strokeDasharray: "2.4 1.8", opacity: 0.8 }
              : d.kind === "fold"
                ? { stroke: INK, strokeWidth: 0.9, opacity: 0.55 }
                : d.kind === "gather"
                  ? { stroke: INK, strokeWidth: 0.8, opacity: 0.6 }
                  : d.kind === "hole"
                    ? { stroke: INK, strokeWidth: 1.1, opacity: 0.85 }
                    : { stroke: INK, strokeWidth: 1, opacity: 0.85 };
          return (
            <g key={i}>
              {d.kind !== "hole" && <path d={d.d} stroke="#fff" strokeOpacity=".4" strokeWidth={style.strokeWidth + 1.4} />}
              <path d={d.d} {...style} />
            </g>
          );
        })}
      </g>

      {selected && (() => {
        const sp = built.panels.find((p) => p.id === selected);
        if (!sp) return null;
        return (
          <g pointerEvents="none" className="garment-selection">
            <path d={sp.d} fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
            <path d={sp.d} fill="none" stroke="#7A5C93" strokeWidth="2.4" strokeLinejoin="round" strokeDasharray="6 4" />
          </g>
        );
      })()}
    </svg>
  );
}

export const GarmentSVG = memo(GarmentSVGInner);
