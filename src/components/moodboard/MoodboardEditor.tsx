"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ImageRef, MoodItem, Moodboard } from "@/lib/model/types";
import { BOARD_H, BOARD_W } from "@/lib/moodboard/layouts";
import { snapBox, textHeight } from "@/lib/moodboard/ops";
import { MoodboardSVG, imageFrame, type ImageResolver } from "./MoodboardSVG";

type Handle = { hx: -1 | 0 | 1; hy: -1 | 0 | 1 };

interface Gesture {
  kind: "move" | "resize" | "rotate" | "crop" | "pan";
  id: string;
  start: { x: number; y: number };
  orig: MoodItem;
  handle?: Handle;
  keepAspect?: boolean;
  scroll?: { left: number; top: number; cx: number; cy: number };
  moved: boolean;
}

export interface MoodboardEditorProps {
  board: Moodboard;
  resolve: ImageResolver;
  swatchHex: (id: string) => string | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  cropMode: boolean;
  setCropMode: (v: boolean) => void;
  guides: boolean;
  zoom: number; // 1 = fit
  setZoom: (z: number) => void;
  onCommit: (id: string, patch: Partial<MoodItem>, coalesce?: string) => void;
  onDropRef: (ref: ImageRef, at: { x: number; y: number }) => void;
  onDropFiles: (files: File[], at: { x: number; y: number }) => void;
  onEditText: (id: string) => void;
}

const rad = (d: number) => (d * Math.PI) / 180;
const rot = (x: number, y: number, a: number) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });

export function MoodboardEditor(p: MoodboardEditorProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [fitW, setFitW] = useState(800);
  const [draft, setDraft] = useState<{ id: string; patch: Partial<MoodItem> } | null>(null);
  const [guideLines, setGuideLines] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const g = useRef<Gesture | null>(null);
  const [dropHover, setDropHover] = useState(false);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 48;
      const h = el.clientHeight - 48;
      setFitW(Math.max(280, Math.min(w, (h * BOARD_W) / BOARD_H)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = (fitW * p.zoom) / BOARD_W; // px per board unit
  const items = useMemo(() => (draft ? p.board.items.map((it) => (it.id === draft.id ? ({ ...it, ...draft.patch } as MoodItem) : it)) : p.board.items), [p.board.items, draft]);
  const selected = items.find((i) => i.id === p.selectedId) ?? null;

  const toBoard = useCallback((clientX: number, clientY: number) => {
    const s = svg.current;
    if (!s) return { x: 0, y: 0 };
    const r = s.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * BOARD_W, y: ((clientY - r.top) / r.height) * BOARD_H };
  }, []);

  function begin(e: React.PointerEvent, kind: Gesture["kind"], it: MoodItem, handle?: Handle) {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    g.current = { kind, id: it.id, start: toBoard(e.clientX, e.clientY), orig: it, handle, keepAspect: (it.type === "image" || it.type === "swatch") !== e.shiftKey, moved: false };
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const target = (e.target as Element).closest("[data-item]");
    const id = target?.getAttribute("data-item");
    if (!id) {
      p.onSelect(null);
      p.setCropMode(false);
      // pan when zoomed in
      if (p.zoom > 1 && wrap.current) {
        g.current = { kind: "pan", id: "", start: { x: e.clientX, y: e.clientY }, orig: items[0], scroll: { left: wrap.current.scrollLeft, top: wrap.current.scrollTop, cx: e.clientX, cy: e.clientY }, moved: false };
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
      return;
    }
    const it = items.find((i) => i.id === id)!;
    if (p.selectedId !== id) {
      p.onSelect(id);
      if (p.cropMode) p.setCropMode(false);
    }
    begin(e, p.cropMode && p.selectedId === id && it.type === "image" ? "crop" : "move", it);
  }

  function onPointerMove(e: React.PointerEvent) {
    const gs = g.current;
    if (!gs) return;
    if (gs.kind === "pan" && gs.scroll && wrap.current) {
      wrap.current.scrollLeft = gs.scroll.left - (e.clientX - gs.scroll.cx);
      wrap.current.scrollTop = gs.scroll.top - (e.clientY - gs.scroll.cy);
      return;
    }
    const pt = toBoard(e.clientX, e.clientY);
    const dx = pt.x - gs.start.x;
    const dy = pt.y - gs.start.y;
    if (!gs.moved && Math.hypot(dx, dy) * scale < 3) return;
    gs.moved = true;
    const o = gs.orig;
    if (gs.kind === "move") {
      let x = o.x + dx;
      let y = o.y + dy;
      if (p.guides && !e.altKey) {
        const s = snapBox({ x, y, w: o.w, h: o.h }, items.filter((i) => i.id !== o.id), 6 / Math.max(scale, 0.2));
        x += s.dx;
        y += s.dy;
        setGuideLines({ x: s.guideX, y: s.guideY });
      }
      setDraft({ id: o.id, patch: { x, y } });
    } else if (gs.kind === "rotate") {
      const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
      let a = (Math.atan2(pt.y - c.y, pt.x - c.x) * 180) / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      else for (const t of [-180, -90, 0, 90, 180]) if (Math.abs(a - t) < 3) a = t;
      a = ((((a + 180) % 360) + 360) % 360) - 180;
      setDraft({ id: o.id, patch: { rotation: Math.round(a * 10) / 10 } });
    } else if (gs.kind === "resize" && gs.handle) {
      const { hx, hy } = gs.handle;
      const th = rad(o.rotation);
      const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
      const aL = { x: (-hx * o.w) / 2, y: (-hy * o.h) / 2 };
      const aW = rot(aL.x, aL.y, th);
      const A = { x: c.x + aW.x, y: c.y + aW.y };
      const v = rot(pt.x - A.x, pt.y - A.y, -th);
      const min = 24;
      let w = hx ? Math.max(min, hx * v.x) : o.w;
      let h = hy ? Math.max(min, hy * v.y) : o.h;
      if (o.type === "text") {
        h = textHeight({ ...o, w });
      } else if (gs.keepAspect && hx && hy) {
        const ratio = o.w / o.h;
        if (w / h > ratio) h = w / ratio;
        else w = h * ratio;
      }
      const off = rot((hx * w) / 2, (hy * h) / 2, th);
      const nc = { x: A.x + off.x, y: A.y + off.y };
      setDraft({ id: o.id, patch: { x: nc.x - w / 2, y: nc.y - h / 2, w, h } });
    } else if (gs.kind === "crop" && o.type === "image") {
      const img = p.resolve(o.image);
      const f = imageFrame(o, img);
      const ox = f.w - o.w;
      const oy = f.h - o.h;
      const local = rot(dx, dy, -rad(o.rotation));
      const fx = ox > 0.5 ? Math.max(-1, Math.min(1, o.crop.fx - (local.x / ox) * 2)) : 0;
      const fy = oy > 0.5 ? Math.max(-1, Math.min(1, o.crop.fy - (local.y / oy) * 2)) : 0;
      setDraft({ id: o.id, patch: { crop: { ...o.crop, fx, fy } } as Partial<MoodItem> });
    }
  }

  function onPointerUp() {
    const gs = g.current;
    g.current = null;
    setGuideLines({ x: null, y: null });
    if (gs && gs.moved && draft && draft.id === gs.id) {
      const patch = draft.patch;
      for (const k of ["x", "y", "w", "h"] as const) if (typeof (patch as Record<string, number>)[k] === "number") (patch as Record<string, number>)[k] = Math.round((patch as Record<string, number>)[k] * 10) / 10;
      p.onCommit(gs.id, patch);
    }
    setDraft(null);
  }

  // Ctrl/⌘ + wheel zoom
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      p.setZoom(Math.max(0.5, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [p]);

  const hs = 11 / scale; // handle size in board units
  const sel = selected;

  return (
    <div
      ref={wrap}
      className={`canvas-dots relative min-h-0 flex-1 overflow-auto ${dropHover ? "ring-2 ring-inset ring-lilac-strong" : ""}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-yamica-image") || e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropHover(true);
        }
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={(e) => {
        setDropHover(false);
        const at = toBoard(e.clientX, e.clientY);
        const raw = e.dataTransfer.getData("application/x-yamica-image");
        if (raw) {
          e.preventDefault();
          p.onDropRef(JSON.parse(raw), at);
        } else if (e.dataTransfer.files.length) {
          e.preventDefault();
          p.onDropFiles([...e.dataTransfer.files], at);
        }
      }}
    >
      <div className="flex min-h-full min-w-full items-center justify-center p-6" style={{ width: p.zoom > 1 ? fitW * p.zoom + 48 : undefined }}>
        <div className="shadow-lift" style={{ width: fitW * p.zoom, height: (fitW * p.zoom * BOARD_H) / BOARD_W }}>
          <MoodboardSVG
            svgRef={svg}
            board={p.board}
            items={items}
            resolve={p.resolve}
            swatchHex={p.swatchHex}
            uid="ed"
            className="block size-full touch-none select-none"
            onPointerDown={onPointerDown}
          >
            {/* Overlay: selection, handles and guides. Never exported. */}
            <g>
              {sel && (
                <g transform={`translate(${sel.x + sel.w / 2} ${sel.y + sel.h / 2}) rotate(${sel.rotation})`}>
                  <rect x={-sel.w / 2} y={-sel.h / 2} width={sel.w} height={sel.h} fill="none" stroke="#6E5690" strokeWidth={1.5 / scale} strokeDasharray={p.cropMode ? `${6 / scale} ${4 / scale}` : undefined} pointerEvents="none" />
                  {p.cropMode && sel.type === "image" ? (
                    <rect
                      x={-sel.w / 2}
                      y={-sel.h / 2}
                      width={sel.w}
                      height={sel.h}
                      fill="#6E5690"
                      fillOpacity={0.06}
                      style={{ cursor: "grab" }}
                      onPointerDown={(e) => begin(e, "crop", sel)}
                    />
                  ) : (
                    <>
                      <rect x={-sel.w / 2} y={-sel.h / 2} width={sel.w} height={sel.h} fill="transparent" style={{ cursor: "move" }} onPointerDown={(e) => begin(e, "move", sel)} onDoubleClick={() => (sel.type === "image" ? p.setCropMode(true) : sel.type === "text" ? p.onEditText(sel.id) : undefined)} />
                      <line x1={0} y1={-sel.h / 2} x2={0} y2={-sel.h / 2 - 28 / scale} stroke="#6E5690" strokeWidth={1.2 / scale} pointerEvents="none" />
                      <circle cx={0} cy={-sel.h / 2 - 28 / scale} r={hs * 0.6} fill="#fff" stroke="#6E5690" strokeWidth={1.5 / scale} style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, "rotate", sel)}>
                        <title>Rotate (hold Shift to snap)</title>
                      </circle>
                      {(
                        [
                          [-1, -1], [1, -1], [1, 1], [-1, 1],
                          ...(sel.type === "text" ? [[-1, 0], [1, 0]] : [[0, -1], [1, 0], [0, 1], [-1, 0]]),
                        ] as [Handle["hx"], Handle["hy"]][]
                      ).map(([hx, hy]) => (
                        <rect
                          key={`${hx}${hy}`}
                          x={(hx * sel.w) / 2 - hs / 2}
                          y={(hy * sel.h) / 2 - hs / 2}
                          width={hs}
                          height={hs}
                          rx={hs * 0.2}
                          fill="#fff"
                          stroke="#6E5690"
                          strokeWidth={1.5 / scale}
                          style={{ cursor: hx && hy ? (hx === hy ? "nwse-resize" : "nesw-resize") : hx ? "ew-resize" : "ns-resize" }}
                          onPointerDown={(e) => begin(e, "resize", sel, { hx, hy })}
                        />
                      ))}
                    </>
                  )}
                </g>
              )}
              {guideLines.x !== null && <line x1={guideLines.x} y1={0} x2={guideLines.x} y2={BOARD_H} stroke="#D9436E" strokeWidth={1 / scale} pointerEvents="none" />}
              {guideLines.y !== null && <line x1={0} y1={guideLines.y} x2={BOARD_W} y2={guideLines.y} stroke="#D9436E" strokeWidth={1 / scale} pointerEvents="none" />}
            </g>
          </MoodboardSVG>
        </div>
      </div>
    </div>
  );
}
