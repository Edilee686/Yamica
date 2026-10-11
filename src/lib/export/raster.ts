"use client";
// Export pipeline: render a React SVG offscreen (without editing controls),
// inline its images and fonts so it's self-contained, then rasterise.

import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { asset } from "@/lib/routes";

const fontCache = new Map<string, string>();

async function toDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

async function fontData(url: string) {
  if (!fontCache.has(url)) {
    const blob = await (await fetch(url)).blob();
    fontCache.set(url, await toDataURL(blob));
  }
  return fontCache.get(url)!;
}

export async function fontFaceCSS(): Promise<string> {
  const [serif, serifItalic, sans] = await Promise.all([
    fontData(asset("/fonts/instrument-serif.woff2")),
    fontData(asset("/fonts/instrument-serif-italic.woff2")),
    fontData(asset("/fonts/instrument-sans.woff2")),
  ]);
  return `@font-face{font-family:"Instrument Serif";src:url(${serif}) format("woff2");font-style:normal;font-weight:400}@font-face{font-family:"Instrument Serif";src:url(${serifItalic}) format("woff2");font-style:italic;font-weight:400}@font-face{font-family:"Instrument Sans";src:url(${sans}) format("woff2");font-weight:400 700}`;
}

/** Render a React element (an <svg>) to markup, outside of the visible page. */
export async function renderSvgMarkup(el: ReactElement): Promise<string> {
  await document.fonts?.ready;
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;width:1600px;pointer-events:none;opacity:0";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(el));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const svg = host.querySelector("svg");
    if (!svg) throw new Error("Nothing to export");
    return new XMLSerializer().serializeToString(svg);
  } finally {
    root.unmount();
    host.remove();
  }
}

const imageCache = new Map<string, string>();

/** Replace external/blob image hrefs with data URLs so the SVG is standalone. */
export async function inlineImages(svg: string): Promise<string> {
  const urls = [...new Set([...svg.matchAll(/href="([^"#][^"]*)"/g)].map((m) => m[1]).filter((u) => !u.startsWith("data:")))];
  let out = svg;
  for (const raw of urls) {
    const u = raw.replace(/&amp;/g, "&");
    try {
      if (!imageCache.has(u)) imageCache.set(u, await toDataURL(await (await fetch(u)).blob()));
      out = out.split(`href="${raw}"`).join(`href="${imageCache.get(u)}"`);
    } catch {
      // leave the placeholder colour visible if an image can't be read
      out = out.split(`href="${raw}"`).join(`href=""`);
    }
  }
  return out;
}

export async function standaloneSvg(svg: string, opts: { width: number; height: number; fonts?: boolean }): Promise<string> {
  let out = await inlineImages(svg);
  out = out.replace(/<svg([^>]*?)>/, (m, attrs: string) => {
    let a = attrs.replace(/\s(width|height|class|style)="[^"]*"/g, "");
    if (!/xmlns=/.test(a)) a += ' xmlns="http://www.w3.org/2000/svg"';
    if (!/xmlns:xlink=/.test(a)) a += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
    return `<svg${a} width="${opts.width}" height="${opts.height}">`;
  });
  if (opts.fonts !== false) {
    const css = await fontFaceCSS();
    out = out.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`);
  }
  return out;
}

export async function rasterize(svg: string, width: number, height: number, type: "image/png" | "image/jpeg" = "image/png", quality = 0.92, background?: string): Promise<Blob> {
  const img = new Image();
  img.decoding = "sync";
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    img.src = url;
    await img.decode();
    // give embedded fonts a moment on browsers that load them lazily
    await new Promise((r) => setTimeout(r, 60));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    if (background || type === "image/jpeg") {
      ctx.fillStyle = background ?? "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), type, quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** One call: React SVG element → PNG/JPEG blob at the given pixel size. */
export async function exportElement(el: ReactElement, width: number, height: number, type: "image/png" | "image/jpeg" = "image/png", background?: string) {
  const markup = await renderSvgMarkup(el);
  const svg = await standaloneSvg(markup, { width, height });
  return rasterize(svg, width, height, type, 0.92, background);
}

export async function exportSvgFile(el: ReactElement, width: number, height: number) {
  const markup = await renderSvgMarkup(el);
  const svg = await standaloneSvg(markup, { width, height, fonts: false });
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n`, svg], { type: "image/svg+xml" });
}
