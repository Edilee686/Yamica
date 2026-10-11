"use client";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useWorkspace } from "./context";
import { Button } from "@/components/ui/Button";
import { STAGES, stageStatus } from "@/lib/model/progress";
import { copy } from "@/lib/i18n/en";
import type { StageId } from "@/lib/model/types";
import { cx } from "@/components/ui/cx";

export function StageIntro({ stage, actions, className, compact }: { stage: StageId; actions?: React.ReactNode; className?: string; compact?: boolean }) {
  const { c, mode, goto } = useWorkspace();
  const st = stageStatus(c, stage);
  const t = copy.stages[stage];
  const idx = STAGES.indexOf(stage);
  const next = STAGES[idx + 1];
  const nextBtn = next ? (
    <Button variant={st.done ? "primary" : "secondary"} size="sm" onClick={() => goto(next)} icon={<ArrowRight className="size-4" />}>
      {t.next}
    </Button>
  ) : null;
  const status = (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium", st.done ? "bg-sage-soft text-sage-deep" : "bg-surface-2 text-ink-3")}>
      {st.done ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
      {st.done ? t.done : st.todo}
    </span>
  );
  if (mode === "free") {
    return (
      <div className={cx("flex flex-wrap items-center gap-3 px-4 py-3 md:px-6", className)}>
        <h1 className="text-[15px] font-semibold">{t.label}</h1>
        {status}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {actions}
          {nextBtn}
        </div>
      </div>
    );
  }
  if (compact) {
    return (
      <div className={cx("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6", className)}>
        <div className="min-w-0 flex-1 basis-full md:basis-auto">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="display text-[28px]">{t.title}</h1>
            <p className="eyebrow">Step {idx + 1} of {STAGES.length}</p>
          </div>
          <p className="max-w-3xl text-[13px] text-ink-3">{t.purpose}</p>
        </div>
        {status}
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {nextBtn}
        </div>
      </div>
    );
  }
  return (
    <div className={cx("flex flex-col gap-4 px-4 pt-6 pb-4 md:flex-row md:items-end md:justify-between md:px-6", className)}>
      <div className="max-w-2xl">
        <p className="eyebrow">Step {idx + 1} of {STAGES.length} · {t.label}</p>
        <h1 className="display mt-1.5 text-[36px] md:text-[44px]">{t.title}</h1>
        <p className="mt-1.5 text-[15px] text-ink-2">{t.purpose}</p>
        <div className="mt-3">{status}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {nextBtn}
      </div>
    </div>
  );
}
