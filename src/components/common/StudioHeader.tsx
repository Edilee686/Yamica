"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Archive, Menu } from "lucide-react";
import { Logo } from "./Logo";
import { SaveStatus } from "./SaveStatus";
import { BackupDialog } from "./BackupMenu";
import { Sheet } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { copy } from "@/lib/i18n/en";

export const NAV = [
  { href: "/studio", label: copy.nav.studio },
  { href: "/studio/inspiration", label: copy.nav.inspiration },
  { href: "/studio/materials", label: copy.nav.materials },
  { href: "/studio/garments", label: copy.nav.garments },
  { href: "/studio/saved", label: copy.nav.saved },
];

export function StudioHeader() {
  const path = usePathname();
  const [backup, setBackup] = useState(false);
  const [menu, setMenu] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 md:px-8">
        <Logo href="/studio" />
        <nav aria-label="Studio" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = n.href === "/studio" ? path === "/studio" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cx("rounded-full px-3 py-1.5 text-[14px] transition-colors", active ? "bg-surface-2 font-medium text-ink" : "text-ink-3 hover:text-ink")}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex items-center gap-3">
          <SaveStatus />
          <button onClick={() => setBackup(true)} className="tip relative hidden items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:border-ink-3 hover:text-ink sm:inline-flex" data-tip="Download or restore a backup">
            <Archive className="size-4" /> Backup
          </button>
          <button onClick={() => setMenu(true)} className="rounded-md p-2 text-ink-2 hover:bg-surface-2 lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
        </div>
      </div>
      <BackupDialog open={backup} onClose={() => setBackup(false)} />
      <Sheet open={menu} onClose={() => setMenu(false)} title="Menu">
        <nav className="flex flex-col py-2" aria-label="Studio">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className="rounded-md px-2 py-3 text-[17px] hover:bg-surface-2">
              {n.label}
            </Link>
          ))}
          <button onClick={() => (setMenu(false), setBackup(true))} className="flex items-center gap-2 rounded-md px-2 py-3 text-start text-[17px] hover:bg-surface-2">
            <Archive className="size-4" /> Backup & restore
          </button>
        </nav>
      </Sheet>
    </header>
  );
}
