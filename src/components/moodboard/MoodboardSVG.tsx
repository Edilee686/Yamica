"use client";
import { memo } from "react";
import type { ImageRef, MoodItem, Moodboard } from "@/lib/model/types";
import { BOARD_H, BOARD_W } from "@/lib/moodboard/layouts";
import { FONT_STACK, wrapText } from "@/lib/text/wrap";
import { inkOn } from "@/lib/color/color";

export interface ResolvedImage {
  src?: string;
  width: number;
  height: number;
  placeholder: string;
}
export type ImageResolver = (ref: ImageRef) => ResolvedImage;

export function imageFrame(item: { w: number; h: number; crop: { zoom: number; fx: number; fy: number } }, img: { width: number; height: number }) {
  const s = Math.max(item.w / img.width, item.h / img.height) * Math.max(1, item.crop.zoom);
  const dw = img.width * s;
  const dh = img.height * s;
  const ox = dw - item.w;
  const oy = dh - item.h;
  return { x: -(ox / 2) * (1 + item.crop.fx), y: -(oy / 2) * (1 + item.crop.fy), w: dw, h: dh };
}

function Item({ it, resolve, uid, swatchHex }: { it: MoodItem; resolve: ImageResolver; uid: string; swatchHex?: (id: string) => string | undefined }) {
  const t = `translate(${it.x + it.w / 2} ${it.y + it.h / 2}) rotate(${it.rotation}) translate(${-it.w / 2} ${-it.h / 2})`;
  switch (it.type) {
    case "image": {
      const img = resolve(it.image);
      const f = imageFrame(it, img);
      return (
        <g transform={t} data-item={it.id}>
          <clipPath id={`${uid}-c-${it.id}`}>
            <rect width={it.w} height={it.h} />
          </clipPath>
          <rect width={it.w} height={it.h} fill={img.placeholder} />
          {img.src && (
            <g clipPath={`url(#${uid}-c-${it.id})`}>
              <image href={img.src} x={f.x} y={f.y} width={f.w} height={f.h} preserveAspectRatio="none" />
            </g>
          )}
        </g>
      );
    }
    case "text": {
      const lines = wrapText(it.text || " ", { family: it.font, size: it.size, weight: it.weight, italic: it.italic, width: it.w });
      const lh = it.size * (it.font === "serif" ? 1.05 : 1.3);
      const anchor = it.align;
      const x = anchor === "middle" ? it.w / 2 : anchor === "end" ? it.w : 0;
      return (
        <g transform={t} data-item={it.id}>
          <rect width={it.w} height={it.h} fill="transparent" />
          <text
            fontFamily={FONT_STACK[it.font]}
            fontSize={it.size}
            fontWeight={it.weight ?? 400}
            fontStyle={it.italic ? "italic" : undefined}
            fill={it.color}
            textAnchor={anchor}
            letterSpacing={it.font === "sans" && (it.weight ?? 400) >= 600 ? it.size * 0.08 : undefined}
          >
            {lines.map((l, i) => (
              <tspan key={i} x={x} y={it.size * 0.92 + i * lh}>
                {l || " "}
              </tspan>
            ))}
          </text>
        </g>
      );
    }
    case "swatch": {
      const hex = (it.swatchId && swatchHex?.(it.swatchId)) || it.hex;
      const showLabel = it.label && it.h >= 50;
      return (
        <g transform={t} data-item={it.id}>
          <rect width={it.w} height={it.h} fill={hex} />
          <rect width={it.w} height={it.h} fill="none" stroke="#000" strokeOpacity=".08" />
          {showLabel && (
            <text x={8} y={it.h - 9} fontFamily={FONT_STACK.sans} fontSize={Math.max(10, Math.min(14, it.w / 7))} fill={inkOn(hex)} opacity=".85">
              {wrapText(it.label!, { family: "sans", size: Math.max(10, Math.min(14, it.w / 7)), width: it.w - 14, maxLines: 1 })[0]}
            </text>
          )}
        </g>
      );
    }
    case "shape": {
      const sw = it.strokeWidth;
      return (
        <g transform={t} data-item={it.id}>
          {it.shape === "rect" && <rect width={it.w} height={it.h} fill={it.fill} stroke={sw ? it.stroke : "none"} strokeWidth={sw} />}
          {it.shape === "ellipse" && <ellipse cx={it.w / 2} cy={it.h / 2} rx={it.w / 2} ry={it.h / 2} fill={it.fill} stroke={sw ? it.stroke : "none"} strokeWidth={sw} />}
          {it.shape === "line" && (
            <>
              <rect width={it.w} height={it.h} fill="transparent" />
              <line x1={0} y1={it.h / 2} x2={it.w} y2={it.h / 2} stroke={it.stroke} strokeWidth={Math.max(1, sw)} />
            </>
          )}
        </g>
      );
    }
  }
}

function MoodboardSVGInner({
  board,
  items,
  resolve,
  swatchHex,
  uid = "mb",
  className,
  svgRef,
  onPointerDown,
  children,
  box,
}: {
  box?: { x: number; y: number; w: number; h: number };
  board: Pick<Moodboard, "background">;
  items: MoodItem[];
  resolve: ImageResolver;
  swatchHex?: (id: string) => string | undefined;
  uid?: string;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
  children?: React.ReactNode;
}) {
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className={className} onPointerDown={onPointerDown} role="img" aria-label="Moodboard" {...(box && { x: box.x, y: box.y, width: box.w, height: box.h })}>
      <rect width={BOARD_W} height={BOARD_H} fill={board.background} />
      {items.map((it) => (
        <Item key={it.id} it={it} resolve={resolve} uid={uid} swatchHex={swatchHex} />
      ))}
      {children}
    </svg>
  );
}

export const MoodboardSVG = memo(MoodboardSVGInner);
