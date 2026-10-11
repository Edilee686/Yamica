"use client";
import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { cx } from "./cx";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; disabled?: boolean; title?: string }[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex flex-wrap rounded-full bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full font-medium transition-colors",
            size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
            value === o.value ? "bg-surface text-ink shadow-soft" : "text-ink-3 hover:text-ink",
            o.disabled && "opacity-40 hover:text-ink-3",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  resetTo,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  resetTo?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">{label}</label>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[12px] tabular-nums text-ink-3">{format(value)}</span>
          {resetTo !== undefined && value !== resetTo && (
            <button aria-label={`Reset ${label}`} onClick={() => onChange(resetTo)} className="rounded p-0.5 text-ink-4 hover:text-ink">
              <RotateCcw className="size-3" />
            </button>
          )}
        </div>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
      {hint && <p className="mt-0.5 text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
        active ? "border-ink bg-ink text-surface" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[13px] font-medium text-ink-2">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-lilac-strong" : "bg-line-strong")}
      >
        <span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow transition-[inset-inline-start]", checked ? "start-[18px]" : "start-0.5")} />
      </button>
    </label>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-lilac-strong">{icon}</div>}
      <p className="display text-2xl">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-3">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
