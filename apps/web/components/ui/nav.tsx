"use client";

import { Calculator, Columns2, FolderOpen, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/hooks";
import { APP_NAME } from "@/lib/brand";

const items = [
  { href: "/calcular", label: "Calcular", Icon: Calculator },
  { href: "/projetos", label: "Projetos", Icon: FolderOpen },
  { href: "/comparar", label: "Comparar", Icon: Columns2 },
  { href: "/config", label: "Conta", Icon: UserRound },
];

function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

export function TopNav() {
  const path = usePathname();
  const { session } = useSession();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex h-[var(--layout-header-height)] max-w-content items-center gap-6 px-4 md:px-6">
        <Link href="/" className="rounded text-base font-black text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
          {APP_NAME}
        </Link>
        <nav aria-label="Principal" className="hidden flex-1 items-center gap-6 md:flex">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={isCurrent(path, i.href) ? "page" : undefined}
              className="rounded text-sm font-bold text-text-muted hover:text-text aria-[current=page]:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto text-sm">
          {session ? (
            <span className="hidden max-w-[16rem] truncate text-text-muted sm:inline">{session.email}</span>
          ) : (
            <Link href="/entrar" className="font-bold text-accent">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Principal (celular)"
      className="fixed inset-x-0 bottom-0 z-30 grid h-[var(--layout-mobile-tab-bar)] grid-cols-4 border-t border-border bg-surface md:hidden print:hidden"
    >
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={isCurrent(path, i.href) ? "page" : undefined}
          className="flex flex-col items-center justify-center gap-1 text-xs font-bold text-text-muted aria-[current=page]:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          <i.Icon aria-hidden className="h-5 w-5" />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
