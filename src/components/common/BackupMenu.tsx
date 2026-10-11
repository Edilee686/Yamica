"use client";
import { useRef, useState } from "react";
import { Archive, Download, HardDrive, Upload } from "lucide-react";
import { useStudio } from "@/lib/store/studio";
import { exportBundle, importBundle } from "@/lib/export/bundle";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { copy } from "@/lib/i18n/en";

export function BackupDialog({ open, onClose, collectionId }: { open: boolean; onClose: () => void; collectionId?: string }) {
  const collections = useStudio((s) => s.collections);
  const [busy, setBusy] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const current = collectionId ? collections[collectionId] : undefined;

  async function doExport(ids: string[]) {
    setBusy("export");
    try {
      const r = await exportBundle(ids);
      toast(`Backup downloaded · ${r.collections} collection${r.collections === 1 ? "" : "s"}, ${r.uploads} upload${r.uploads === 1 ? "" : "s"}`, { tone: "success" });
    } catch {
      toast("Couldn't create the backup.", { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function doImport(f: File) {
    setBusy("import");
    try {
      const r = await importBundle(f);
      toast(`Restored ${r.imported.length} collection${r.imported.length === 1 ? "" : "s"}${r.uploads ? ` and ${r.uploads} upload${r.uploads === 1 ? "" : "s"}` : ""}.`, { tone: "success" });
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't restore this file.", { tone: "error" });
    } finally {
      setBusy(null);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Backup & restore" description={copy.storageNoteLong}>
      <div className="space-y-3 py-2">
        {current && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-2/60 p-4">
            <div>
              <p className="font-medium">This collection</p>
              <p className="text-[13px] text-ink-3">{current.name} with its uploaded images</p>
            </div>
            <Button variant="primary" size="sm" icon={<Download className="size-4" />} loading={busy === "export"} onClick={() => doExport([current.id])}>
              Download
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line p-4">
          <div>
            <p className="font-medium">Everything</p>
            <p className="text-[13px] text-ink-3">All {Object.keys(collections).length} collections in this browser</p>
          </div>
          <Button size="sm" icon={<Archive className="size-4" />} loading={busy === "export"} onClick={() => doExport(Object.keys(collections))} disabled={!Object.keys(collections).length}>
            Download all
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line p-4">
          <div>
            <p className="font-medium">Restore a backup</p>
            <p className="text-[13px] text-ink-3">Adds collections from a .yamica file. Nothing is overwritten.</p>
          </div>
          <Button size="sm" icon={<Upload className="size-4" />} loading={busy === "import"} onClick={() => file.current?.click()}>
            Choose file
          </Button>
          <input ref={file} type="file" accept=".yamica,application/zip" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
        <p className="flex items-start gap-2 pt-1 text-[12px] text-ink-3">
          <HardDrive className="mt-0.5 size-3.5 shrink-0" /> Yamica Studio has no account or cloud storage yet. Clearing your browser data removes saved collections.
        </p>
      </div>
    </Dialog>
  );
}
