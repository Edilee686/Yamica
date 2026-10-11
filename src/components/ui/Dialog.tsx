"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./cx";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    const el = ref.current;
    const focusables = () => el?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [];
    setTimeout(() => {
      const first = el?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[1] ?? focusables()[0];
      first?.focus();
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (e.stopPropagation(), onClose());
      if (e.key === "Tab" && el) {
        const f = [...focusables()].filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
      }
    };
    document.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      (prevFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-6xl" };
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-ink/35 animate-fade-in" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        className={cx(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-xl bg-surface shadow-pop animate-pop sm:rounded-xl",
          widths[size],
          className,
        )}
      >
        <div className="flex items-start gap-4 px-6 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id="dlg-title" className="display text-[28px]">{title}</h2>
            {description && <div className="mt-1 text-sm text-ink-3">{description}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="-me-2 rounded-md p-2 text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        {children && <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6 pb-4">{children}</div>}
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Bottom sheet for small screens. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="absolute inset-x-0 bottom-0 flex max-h-[78dvh] flex-col rounded-t-xl bg-surface shadow-pop animate-sheet">
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-line-strong absolute left-1/2 top-1.5 -translate-x-1/2" />
          <h2 className="mt-2 text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="mt-2 rounded-md p-2 text-ink-3 hover:bg-surface-2"><X className="size-5" /></button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button className="h-10 rounded-full px-4 text-sm font-medium text-ink-2 hover:bg-surface-2" onClick={onClose}>Cancel</button>
          <button
            data-autofocus
            className={cx("h-10 rounded-full px-4 text-sm font-medium text-white", danger ? "bg-danger hover:bg-[#8c3128]" : "bg-ink hover:bg-[#45403c]")}
            onClick={() => (onConfirm(), onClose())}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}
