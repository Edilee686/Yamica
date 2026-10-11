"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Archive, ArrowLeft, Check, Redo2, Undo2 } from "lucide-react";
import { useWorkspace } from "./context";
import { DNAButton } from "./CollectionDNA";
import { LogoMark } from "@/components/common/Logo";
import { SaveStatus } from "@/components/common/SaveStatus";
import { BackupDialog } from "@/components/common/BackupMenu";
import { IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/controls";
import { cx } from "@/components/ui/cx";
import { useStudio } from "@/lib/store/studio";
import { STAGES, stageStatus } from "@/lib/model/progress";
import { copy } from "@/lib/i18n/en";
import type { StageId } from "@/lib/model/types";

export function WorkspaceHeader({ stage }: { stage: StageId }) {
  const { c, mode, goto } = useWorkspace();
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  useStudio((s) => s.historyTick);
  const canUndo = useStudio.getState().canUndo(c.id);
  const canRedo = useStudio.getState().canRedo(c.id);
  const setPrefs = useStudio((s) => s.setPrefs);
  const [backup, setBackup] = useState(false);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 md:gap-3 md:px-5">
        <Link href="/studio" className="tip relative flex items-center gap-1 rounded-md p-1.5 text-ink-2 hover:bg-surface-2" data-tip="Back to My Studio" aria-label="Back to My Studio">
          <ArrowLeft className="size-4" />
          <LogoMark className="size-6" />
        </Link>
        <TitleEditor />
        <div className="ms-auto flex items-center gap-1 md:gap-2">
          <div className="hidden md:block"><SaveStatus /></div>
          <div className="md:hidden"><SaveStatus compact /></div>
          <div className="mx-1 hidden h-5 w-px bg-line md:block" />
          <IconButton label="Undo" shortcut={`${mod}Z`} disabled={!canUndo} onClick={() => undo(c.id)}>
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton label="Redo" shortcut={`${mod}⇧Z`} disabled={!canRedo} onClick={() => redo(c.id)}>
            <Redo2 className="size-4" />
          </IconButton>
          <div className="hidden sm:block"><DNAButton /></div>
          <Segmented
            label="Experience mode"
            size="sm"
            className="shrink-0 flex-nowrap!"
            value={mode}
            onChange={(m) => setPrefs((p) => void (p.mode = m))}
            options={[
              { value: "guided", label: copy.modes.guided, title: copy.modes.guidedHint },
              { value: "free", label: <span><span className="hidden md:inline">Free studio</span><span className="md:hidden">Free</span></span>, title: copy.modes.freeHint },
            ]}
          />
          <IconButton label="Backup & restore" onClick={() => setBackup(true)} className="hidden sm:inline-flex">
            <Archive className="size-4" />
          </IconButton>
        </div>
      </div>
      <nav aria-label="Collection stages" className="scroll-thin overflow-x-auto border-t border-line/70">
        <ol className="flex min-w-max items-center gap-0.5 px-3 py-1.5 md:px-5">
          {STAGES.map((s, i) => {
            const st = stageStatus(c, s);
            const active = s === stage;
            return (
              <li key={s} className="flex items-center">
                {i > 0 && <span className="mx-0.5 h-px w-3 bg-line-strong md:w-5" aria-hidden />}
                <button
                  onClick={() => goto(s)}
                  aria-current={active ? "step" : undefined}
                  title={st.done ? `${copy.stages[s].label}: ${st.summary}` : st.todo}
                  className={cx(
                    "flex items-center gap-1.5 rounded-full py-1 ps-1 pe-3 text-[13px] transition-colors",
                    active ? "bg-ink text-surface" : "text-ink-2 hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cx(
                      "flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                      st.done ? (active ? "bg-lilac text-ink" : "bg-sage-soft text-sage-deep") : active ? "bg-white/15" : "bg-surface-3 text-ink-3",
                    )}
                  >
                    {st.done ? <Check className="size-3" strokeWidth={3} aria-label="complete" /> : i + 1}
                  </span>
                  {copy.stages[s].label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <BackupDialog open={backup} onClose={() => setBackup(false)} collectionId={c.id} />
    </header>
  );
}

function TitleEditor() {
  const { c } = useWorkspace();
  const rename = useStudio((s) => s.rename);
  const [v, setV] = useState(c.name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== ref.current) setV(c.name);
  }, [c.name]);
  return (
    <input
      ref={ref}
      aria-label="Collection name"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => rename(c.id, v.trim() || "Untitled collection")}
      onKeyDown={(e) => e.key === "Enter" && ref.current?.blur()}
      maxLength={80}
      className="display min-w-0 max-w-[46vw] truncate rounded-md bg-transparent px-1.5 py-0.5 text-[22px] hover:bg-surface-2 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-lilac-soft md:max-w-[340px] md:text-[26px]"
    />
  );
}
