"use client";
import { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cx } from "./cx";

type Variant = "primary" | "brand" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-[background,color,border,box-shadow,transform] duration-150 active:scale-[.98] disabled:opacity-45 disabled:active:scale-100";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-surface hover:bg-[#45403c] shadow-[0_1px_0_rgb(255_255_255/0.08)_inset]",
  brand: "bg-lilac-strong text-white hover:bg-lilac-deep",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-3 hover:bg-white",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-white hover:bg-[#8c3128]",
  soft: "bg-lilac-soft text-lilac-deep hover:bg-[#e1d7ee]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={cx(base, variants[variant], sizes[size], className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; icon?: React.ReactNode; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; size?: "sm" | "md"; tipSide?: "top" | "bottom" | "start" | "end"; shortcut?: string }
>(function IconButton({ label, active, size = "md", className, children, tipSide = "bottom", shortcut, ...rest }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      aria-pressed={active}
      data-tip={shortcut ? `${label} · ${shortcut}` : label}
      data-tip-side={tipSide}
      className={cx(
        "tip relative inline-flex items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent",
        size === "sm" ? "size-8" : "size-9",
        active && "bg-lilac-soft text-lilac-deep hover:bg-lilac-soft hover:text-lilac-deep",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
