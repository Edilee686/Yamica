"use client";
import { memo, useState } from "react";
import { ImageOff } from "lucide-react";
import type { ImageRef } from "@/lib/model/types";
import { getInspiration } from "@/lib/inspiration/library";
import { useStudio } from "@/lib/store/studio";
import { getVectorPrint, printSwatchSVG, resolvePrintColors } from "@/lib/prints/prints";
import { getFabric, textureTile } from "@/lib/fabrics/fabrics";
import { cx } from "@/components/ui/cx";

export function useImageSrc(ref: ImageRef | undefined): { src?: string; placeholder: string; alt: string } {
  const uploadUrl = useStudio((s) => (ref?.kind === "upload" ? s.uploadUrls[ref.id] : undefined));
  const upload = useStudio((s) => (ref?.kind === "upload" ? s.uploads[ref.id] : undefined));
  if (!ref) return { placeholder: "#E2DACD", alt: "" };
  if (ref.kind === "library") {
    const a = getInspiration(ref.id);
    return { src: a?.src, placeholder: a?.dominant ?? "#E2DACD", alt: a?.title ?? "Inspiration image" };
  }
  return { src: uploadUrl, placeholder: upload?.dominant ?? "#E2DACD", alt: upload?.name ?? "Uploaded image" };
}

/** An image with a colour placeholder and a graceful fallback if it fails. */
export function SafeImage({ src, placeholder, alt, className, fit = "cover" }: { src?: string; placeholder: string; alt: string; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cx("relative overflow-hidden", className)} style={{ background: placeholder }}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          draggable={false}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cx("absolute inset-0 size-full transition-opacity duration-300", fit === "cover" ? "object-cover" : "object-contain", loaded ? "opacity-100" : "opacity-0")}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[11px] text-ink-2/80">
          <ImageOff className="size-4" aria-hidden />
          {failed || !src ? "Image unavailable" : null}
        </div>
      )}
    </div>
  );
}

export function RefImage({ image, className, fit }: { image: ImageRef; className?: string; fit?: "cover" | "contain" }) {
  const { src, placeholder, alt } = useImageSrc(image);
  return <SafeImage src={src} placeholder={placeholder} alt={alt} className={className} fit={fit} />;
}

export const PrintSwatch = memo(function PrintSwatch({
  printId,
  colors,
  className,
  scale = 1,
  size = 120,
  imageUrl,
}: {
  printId: string;
  colors?: Record<string, string>;
  className?: string;
  scale?: number;
  size?: number;
  imageUrl?: string;
}) {
  const p = getVectorPrint(printId);
  if (!p) {
    return imageUrl ? (
      <div className={cx("overflow-hidden", className)} style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: `${60 * scale}px`, backgroundRepeat: "repeat" }} />
    ) : (
      <div className={cx("bg-surface-3", className)} />
    );
  }
  const c = colors ?? resolvePrintColors(p);
  return <div className={cx("overflow-hidden [&>svg]:block [&>svg]:size-full", className)} aria-hidden dangerouslySetInnerHTML={{ __html: printSwatchSVG(printId, c, size, scale).replace(/width="\d+" height="\d+"/, 'preserveAspectRatio="xMidYMid slice"') }} />;
});

export const FabricSwatch = memo(function FabricSwatch({ fabricId, color, className, zoom = 3 }: { fabricId: string; color?: string; className?: string; zoom?: number }) {
  const f = getFabric(fabricId);
  const t = f ? textureTile(f.textureId) : null;
  const bg = color ?? f?.swatchColor ?? "#E2DACD";
  const id = `fx-${fabricId}-${zoom}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={cx("block", className)} aria-hidden>
      <defs>
        {t && <pattern id={id} width={t.w} height={t.h} patternUnits="userSpaceOnUse" patternTransform={`scale(${zoom})`} dangerouslySetInnerHTML={{ __html: t.body }} />}
        <linearGradient id={`${id}-sh`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={f?.textureId === "sheen" ? 0.45 : 0.12} />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={f?.textureId === "sheen" ? 0.18 : 0.08} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={bg} />
      {t && <rect width="100" height="100" fill={`url(#${id})`} />}
      <rect width="100" height="100" fill={`url(#${id}-sh)`} />
    </svg>
  );
});

export function ColorDot({ hex, size = 20, className, title }: { hex: string; size?: number; className?: string; title?: string }) {
  return <span title={title} className={cx("inline-block shrink-0 rounded-full ring-1 ring-black/10 ring-inset", className)} style={{ background: hex, width: size, height: size }} />;
}
