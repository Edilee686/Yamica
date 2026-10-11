"use client";
import { useEffect, useState } from "react";
import { Check, CloudOff, HardDrive, Loader2 } from "lucide-react";
import { useStudio } from "@/lib/store/studio";
import { copy } from "@/lib/i18n/en";
import { cx } from "@/components/ui/cx";

export function SaveStatus({ compact }: { compact?: boolean }) {
  const save = useStudio((s) => s.save);
  const storageError = useStudio((s) => s.storageError);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (save.status !== "saved") return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(t);
  }, [save.status, save.at]);
  if (storageError) {
    return (
      <span className="tip relative inline-flex items-center gap-1.5 text-[12px] font-medium text-danger" data-tip="Not saving in this browser">
        <CloudOff className="size-4" /> {!compact && "Not saved"}
      </span>
    );
  }
  const label = save.status === "saving" ? copy.save.saving : save.status === "error" ? copy.save.error : save.status === "saved" ? copy.save.saved : copy.save.idle;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cx("tip relative inline-flex items-center gap-1.5 text-[12px] font-medium", save.status === "error" ? "text-danger" : "text-ink-3")}
      data-tip={save.status === "error" ? save.error : copy.storageNote}
    >
      {save.status === "saving" ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : save.status === "error" ? (
        <CloudOff className="size-3.5" />
      ) : flash ? (
        <Check className="size-3.5 text-success" />
      ) : (
        <HardDrive className="size-3.5" />
      )}
      {!compact && <span>{label}</span>}
    </span>
  );
}
