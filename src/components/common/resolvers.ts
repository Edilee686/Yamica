"use client";
import { useCallback } from "react";
import type { Collection, ImageRef } from "@/lib/model/types";
import { getInspiration } from "@/lib/inspiration/library";
import { useStudio } from "@/lib/store/studio";
import type { ImageResolver } from "@/components/moodboard/MoodboardSVG";
import type { ImagePrintLookup } from "@/lib/garments/resolve";

export function useImageResolver(): ImageResolver {
  const uploads = useStudio((s) => s.uploads);
  const urls = useStudio((s) => s.uploadUrls);
  return useCallback(
    (ref: ImageRef) => {
      if (ref.kind === "library") {
        const a = getInspiration(ref.id);
        return { src: a?.src, width: a?.width ?? 1000, height: a?.height ?? 1000, placeholder: a?.dominant ?? "#E2DACD" };
      }
      const u = uploads[ref.id];
      return { src: urls[ref.id], width: u?.width ?? 1000, height: u?.height ?? 1000, placeholder: u?.dominant ?? "#E2DACD" };
    },
    [uploads, urls],
  );
}

export function useImagePrintLookup(c: Collection | undefined): ImagePrintLookup {
  const urls = useStudio((s) => s.uploadUrls);
  return useCallback(
    (id: string) => {
      const p = c?.imagePrints.find((x) => x.id === id);
      return p ? { print: p, url: urls[p.uploadId] } : undefined;
    },
    [c?.imagePrints, urls],
  );
}
