"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useStudio } from "@/lib/store/studio";
import { Toaster } from "@/components/ui/Toast";
import { LogoMark } from "./Logo";

export function StudioRoot({ children }: { children: React.ReactNode }) {
  const hydrated = useStudio((s) => s.hydrated);
  const storageError = useStudio((s) => s.storageError);
  useEffect(() => {
    void useStudio.getState().hydrate();
  }, []);
  return (
    <>
      {storageError && (
        <div role="alert" className="flex items-center justify-center gap-2 bg-butter-soft px-4 py-2 text-[13px] text-ink">
          <AlertTriangle className="size-4 shrink-0" /> {storageError}
        </div>
      )}
      {hydrated ? (
        children
      ) : (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-ink-3" aria-busy="true">
          <LogoMark className="size-10 animate-pulse" />
          <p className="text-sm">Opening your studio…</p>
        </div>
      )}
      <Toaster />
    </>
  );
}
