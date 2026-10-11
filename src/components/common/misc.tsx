"use client";

export function relTime(t: number) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[12px] text-ink-3">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Collection progress">
        <div className="h-full rounded-full bg-lilac-strong transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

