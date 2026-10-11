import Link from "next/link";
import { cx } from "@/components/ui/cx";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("size-7", className)} aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#A893C4" />
      <path d="M9 9 L16 18 L23 9" fill="none" stroke="#2B2826" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 18 V24" stroke="#2B2826" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="23" cy="23" r="2.4" fill="#EFD98F" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cx("flex items-center gap-2 rounded-md", className)} aria-label="Yamica Studio home">
      <LogoMark />
      <span className="flex items-baseline gap-1.5">
        <span className="display text-[24px] leading-none">Yamica</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Studio</span>
      </span>
    </Link>
  );
}
