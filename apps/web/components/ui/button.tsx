import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-bold whitespace-nowrap transition-colors duration-fast " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus " +
  "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-text border border-border-input hover:bg-surface-muted",
  ghost: "bg-transparent text-accent hover:bg-accent-soft",
  danger: "bg-danger text-on-accent hover:opacity-90",
};
const sizes: Record<Size, string> = {
  sm: "h-[var(--space-7)] px-3 text-xs",
  md: "h-[var(--layout-touch-target-min)] px-4 text-sm",
  lg: "h-[var(--space-9)] px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Spinner() {
  return <span aria-hidden className="h-4 w-4 animate-spin rounded-pill border-2 border-current border-r-transparent motion-reduce:animate-none" />;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, className)}
      aria-busy={loading || undefined}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
