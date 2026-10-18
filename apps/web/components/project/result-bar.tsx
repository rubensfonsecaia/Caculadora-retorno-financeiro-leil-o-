"use client";

import { formatBRLShort, formatPct, type Incomplete, type Result } from "@calc/core";
import Link from "next/link";
import { VERDICT, missingText } from "@/components/ui/verdict";

/** Resultado fixo acima da barra de navegação, só no celular. */
export function MobileResultBar({ r, href }: { r: Result | Incomplete | null; href: string }) {
  if (!r) return null;
  const cls =
    "fixed inset-x-0 bottom-[var(--layout-mobile-tab-bar)] z-30 flex h-[var(--layout-mobile-result-bar)] items-center gap-4 bg-surface-inverse px-4 text-left text-on-inverse md:hidden print:hidden " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-focus";
  if (!r.ok)
    return (
      <div className={cls} role="status">
        <span className="text-sm">Preencha {missingText(r.missing)} para ver o resultado.</span>
      </div>
    );
  const v = VERDICT[r.verdict];
  const irr = r.irrAm != null ? `${formatPct(r.irrAm, 1)} a.m.` : "indefinida";
  return (
    <Link href={href} className={cls} aria-label={`${v.label}, lucro ${formatBRLShort(r.profit)}, TIR ${irr}. Ver detalhes.`}>
      <span className={`inline-flex items-center gap-1 font-extrabold ${v.inverse}`}>
        <v.Icon aria-hidden className="h-5 w-5" />
        {v.label}
      </span>
      <span>
        <small className="block text-xs text-on-inverse-muted">Lucro</small>
        <b className="text-lg tabular-nums">{formatBRLShort(r.profit)}</b>
      </span>
      <span>
        <small className="block text-xs text-on-inverse-muted">TIR</small>
        <b className="text-lg tabular-nums">{irr}</b>
      </span>
    </Link>
  );
}
