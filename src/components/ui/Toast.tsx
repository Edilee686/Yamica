"use client";
import { create } from "zustand";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cx } from "./cx";

interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
  action?: { label: string; run: () => void };
}

const useToasts = create<{ toasts: Toast[] }>(() => ({ toasts: [] }));
let n = 0;

export function toast(message: string, opts: { tone?: Toast["tone"]; action?: Toast["action"]; duration?: number } = {}) {
  const id = ++n;
  useToasts.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone: opts.tone ?? "info", action: opts.action }] }));
  setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 7000 : 3800));
}

function dismiss(id: number) {
  useToasts.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertCircle : Info;
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink py-2 ps-4 pe-2 text-sm text-surface shadow-pop animate-fade-up">
            <Icon className={cx("size-4 shrink-0", t.tone === "error" ? "text-[#f0a69c]" : t.tone === "success" ? "text-[#b8d4b0]" : "text-lilac")} aria-hidden />
            <span className="py-1">{t.message}</span>
            {t.action && (
              <button className="rounded-full bg-white/12 px-3 py-1 font-semibold hover:bg-white/20" onClick={() => (t.action!.run(), dismiss(t.id))}>
                {t.action.label}
              </button>
            )}
            <button aria-label="Dismiss" className="rounded-full p-1 text-surface/60 hover:text-surface" onClick={() => dismiss(t.id)}>
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
