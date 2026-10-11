import type { StageId } from "@/lib/model/types";

/** Set when the site is served from a sub-path (e.g. GitHub Pages project sites). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** URL for a file in /public. next/link adds the base path itself; plain URLs don't. */
export const asset = (path: string) => `${BASE_PATH}${path}`;

export const collectionHref = (id: string, stage?: StageId, extra?: Record<string, string>) => {
  const q = new URLSearchParams({ id, ...(stage ? { stage } : {}), ...(extra ?? {}) });
  return `/studio/collection?${q.toString()}`;
};
