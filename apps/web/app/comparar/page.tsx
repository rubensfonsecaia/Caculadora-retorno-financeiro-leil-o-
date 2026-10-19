"use client";

import { compute, formatBRL, formatPct, type Result } from "@calc/core";
import { Columns2 } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageTitle, Skeleton } from "@/components/ui/card";
import { VerdictBadge } from "@/components/ui/verdict";
import { repo } from "@/lib/data";
import { useLive } from "@/lib/hooks";

const ROWS: { label: string; get: (r: Result) => number | null; fmt: (n: number) => string; better: "high" | "low" }[] = [
  { label: "Lucro líquido", get: (r) => r.profit, fmt: formatBRL, better: "high" },
  { label: "TIR ao mês", get: (r) => r.irrAm, fmt: (n) => formatPct(n), better: "high" },
  { label: "Margem", get: (r) => r.margin, fmt: (n) => formatPct(n, 1), better: "high" },
  { label: "VPL na TMA", get: (r) => r.npvAtTma, fmt: formatBRL, better: "high" },
  { label: "Caixa necessário", get: (r) => r.maxExposure, fmt: formatBRL, better: "low" },
  { label: "ROI s/ caixa", get: (r) => r.roi, fmt: (n) => formatPct(n, 1), better: "high" },
  { label: "Prazo até vender", get: (r) => r.saleMonth, fmt: (n) => `${n} meses`, better: "low" },
  { label: "Vendido por", get: (r) => r.grossRevenue, fmt: formatBRL, better: "high" },
  { label: "Custo total", get: (r) => r.totalCost, fmt: formatBRL, better: "low" },
];

function Compare() {
  const { data: projects = [], loading } = useLive(() => repo.listProjects(), []);
  const active = projects.filter((p) => p.status !== "arquivado");
  const [picked, setPicked] = useState<string[] | null>(null);
  const ids = picked ?? active.slice(0, 2).map((p) => p.id);
  const chosen = useMemo(
    () => ids.map((id) => projects.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ p, r: compute(p.inputs) })),
    [ids, projects],
  );

  if (loading) return <Skeleton className="h-[20rem] w-full" />;
  if (active.length < 2)
    return (
      <Card>
        <EmptyState icon={<Columns2 />} title="Precisa de pelo menos 2 projetos" text="Salve outro estudo para comparar terrenos ou casas lado a lado." action={<ButtonLink href="/calcular">Fazer outro estudo</ButtonLink>} />
      </Card>
    );

  const toggle = (id: string) => {
    const cur = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-4);
    setPicked(cur);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-label uppercase tracking-[0.04em] text-text-muted">Escolha de 2 a 4 projetos</legend>
        <div className="flex flex-wrap gap-2">
          {active.map((p) => (
            <label key={p.id} className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-pill border border-border bg-surface px-3 py-2 text-sm font-bold has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} className="accent-accent" />
              <span className="min-w-0 truncate">{p.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {chosen.length < 2 ? (
        <p className="text-sm text-text-muted">Marque mais um projeto.</p>
      ) : (
        <Card tabIndex={0} role="region" aria-label="Comparação, role para os lados" className="overflow-x-auto p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
          <table className="w-full min-w-[36rem] text-sm tabular-nums">
            <thead>
              <tr>
                <th scope="col" className="bg-surface-muted px-4 py-3 text-left text-label uppercase text-text-muted">
                  <span className="sr-only">Indicador</span>
                </th>
                {chosen.map(({ p, r }) => (
                  <th key={p.id} scope="col" className="bg-surface-muted px-4 py-3 text-right align-top">
                    <span className="block break-words text-sm font-extrabold">{p.name}</span>
                    <span className="mt-1 inline-block">{r.ok ? <VerdictBadge verdict={r.verdict} /> : <VerdictBadge verdict={null} />}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const vals = chosen.map(({ r }) => (r.ok ? row.get(r) : null));
                const nums = vals.filter((v): v is number => v != null);
                const best = nums.length ? (row.better === "high" ? Math.max(...nums) : Math.min(...nums)) : null;
                return (
                  <tr key={row.label} className="border-t border-border">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-text-muted">
                      {row.label}
                    </th>
                    {vals.map((v, i) => (
                      <td key={i} className={`px-4 py-3 text-right ${v != null && v === best && nums.length > 1 ? "font-extrabold text-success" : ""}`}>
                        {v == null ? "—" : row.fmt(v)}
                        {v != null && v === best && nums.length > 1 && <span className="sr-only"> (melhor)</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-text-muted">Em verde, o melhor de cada linha.</p>
    </div>
  );
}

export default function CompararPage() {
  return (
    <RequireSession>
      <PageTitle title="Comparar projetos" sub="Qual terreno ou casa vale mais a pena." />
      <Compare />
    </RequireSession>
  );
}
