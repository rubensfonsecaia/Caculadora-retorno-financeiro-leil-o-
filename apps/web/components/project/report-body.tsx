"use client";

import { formatBRL, formatPct, TAX_LABELS, type Inputs, type Result } from "@calc/core";
import { BenchmarkBars, CostComposition } from "@/components/charts/charts";
import { Memorial } from "@/components/project/result-view";
import { Label } from "@/components/ui/card";
import { VerdictCard } from "@/components/ui/verdict";
import { APP_NAME } from "@/lib/brand";

export function ReportBody({ name, address, inputs, r, logoUrl }: { name: string; address: string; inputs: Inputs; r: Result; logoUrl?: string | null }) {
  const rows: [string, string][] = [
    ["Terreno", formatBRL(inputs.land.priceCents / 100)],
    ["Área construída", `${inputs.build.builtAreaM2.toLocaleString("pt-BR")} m²`],
    ["CUB por m²", `${formatBRL(inputs.build.cubM2Cents / 100)} (${inputs.build.uf} ${inputs.build.cubStandard})`],
    ["Obra total", formatBRL(r.build.total)],
    ["Prazo", `${inputs.schedule.buildMonths} meses de obra + ${inputs.schedule.monthsToSell} para vender`],
    ["Financiado", inputs.financing.financedBps ? `${inputs.financing.financedBps / 100}% da obra a ${(inputs.financing.rateAaBps / 100).toLocaleString("pt-BR")}% a.a.` : "não"],
    ["Venda", formatBRL(r.grossRevenue)],
    ["Imposto", TAX_LABELS[inputs.tax.regime]],
  ];
  const kpis: [string, string][] = [
    ["Lucro líquido", formatBRL(r.profit)],
    ["Margem", formatPct(r.margin, 1)],
    ["TIR", r.irrAm != null ? `${formatPct(r.irrAm)} a.m.` : "indefinida"],
    ["VPL na TMA", formatBRL(r.npvAtTma)],
    ["Caixa necessário", formatBRL(r.maxExposure)],
    ["ROI s/ caixa", formatPct(r.roi, 1)],
  ];
  return (
    <article className="grid gap-6">
      <header>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="mb-3 h-9 max-w-[12rem] object-contain" />
        )}
        <p className="text-sm font-bold text-text-muted">{APP_NAME} · estudo de viabilidade</p>
        <h1 className="mt-1 break-words text-3xl">{name}</h1>
        {address && <p className="text-text-muted">{address}</p>}
        <p className="mt-1 text-xs text-text-muted">Gerado em {new Date().toLocaleDateString("pt-BR")}. Estimativa; não substitui orçamento de obra nem parecer contábil.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
        <VerdictCard result={r} />
        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border p-4 text-sm tabular-nums">
          {kpis.map(([k, v]) => (
            <div key={k}>
              <dt className="text-text-muted">{k}</dt>
              <dd className="text-lg font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <section>
        <h2 className="mb-3 text-lg">Premissas</h2>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-border">
                <th scope="row" className="py-2 pr-4 text-left font-medium text-text-muted">
                  {k}
                </th>
                <td className="py-2 text-right font-bold tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
        <section>
          <Label className="mb-3">Retorno ao mês</Label>
          <BenchmarkBars r={r} />
        </section>
        <section>
          <Label className="mb-3">De onde vem o custo</Label>
          <CostComposition r={r} />
        </section>
      </div>
      <div className="print:[&_details]:block">
        <Memorial r={r} buildMonths={inputs.schedule.buildMonths} />
      </div>
    </article>
  );
}
