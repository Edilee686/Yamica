// Measured text wrapping for SVG text (SVG has no native wrapping), shared by
// the moodboard, presentation pages and exports so line breaks always match.

let ctx: CanvasRenderingContext2D | null = null;

export const FONT_STACK = {
  serif: '"Instrument Serif", "Times New Roman", serif',
  sans: '"Instrument Sans", system-ui, sans-serif',
};

function measure(text: string, font: string) {
  if (typeof document === "undefined") return text.length * 8;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
}

export function wrapText(text: string, opts: { family: "serif" | "sans"; size: number; weight?: number; italic?: boolean; width: number; maxLines?: number }): string[] {
  const font = `${opts.italic ? "italic " : ""}${opts.weight ?? 400} ${opts.size}px ${FONT_STACK[opts.family]}`;
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = `${line} ${words[i]}`;
      if (measure(test, font) <= opts.width) line = test;
      else {
        out.push(line);
        line = words[i];
      }
    }
    out.push(line);
  }
  if (opts.maxLines && out.length > opts.maxLines) {
    const cut = out.slice(0, opts.maxLines);
    cut[cut.length - 1] = cut[cut.length - 1].replace(/\s*\S*$/, "") + "…";
    return cut;
  }
  return out;
}
