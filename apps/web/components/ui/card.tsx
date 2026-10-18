import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", ...rest }: ComponentProps<"div">) {
  return <div className={`relative min-w-0 rounded-xl border border-border bg-surface p-5 shadow-card ${className}`} {...rest} />;
}

export function Label({ children, className = "", ...rest }: ComponentProps<"span">) {
  return (
    <span className={`block text-label uppercase tracking-[0.04em] text-text-muted ${className}`} {...rest}>
      {children}
    </span>
  );
}

export function PageTitle({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="break-words text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-4 mt-8 text-xl">
      {children}
    </h2>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-surface-muted motion-reduce:animate-none ${className}`} />;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="mx-auto flex justify-center text-text-subtle [&>svg]:h-7 [&>svg]:w-7" aria-hidden>
        {icon}
      </div>
      <h2 className="mb-1 mt-3 text-lg">{title}</h2>
      <p className="mb-4 text-text-muted">{text}</p>
      {action}
    </div>
  );
}
