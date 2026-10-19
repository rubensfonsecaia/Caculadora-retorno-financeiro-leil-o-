"use client";

import { formatBRL, formatBRLShort, formatPct, type Result, type TornadoBar } from "@calc/core";
import { useId, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function TableToggle({ table, children }: { table: React.ReactNode; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div>
      {show ? <div id={id}>{table}</div> : children}
      <button
        type="button"
        aria-expanded={show}
        aria-controls={id}
        onClick={() => setShow((s) => !s)}
        className="mt-3 rounded text-xs font-bold text-accent hover:underline"
      >
        {show ? "Ver gráfico" : "Ver como tabela"}
      </button>
    </div>
  );
}

function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} scope="col" className={`bg-surface-muted px-2 py-1 text-label uppercase text-text-muted ${i ? "text-right" : "text-left"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-border">
            {r.map((c, j) => (
              <td key={j} className={`px-2 py-1 ${j ? "text-right" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** TIR do projeto contra TMA, Selic e CDI, ao mês. Projeto em destaque, referências em neutro. */
export function BenchmarkBars({ r }: { r: Result }) {
  const bars = [
    { label: "Este projeto", value: r.irrAm, main: true },
    { label: "Selic", value: r.selicAm },
    { label: "CDI", value: r.cdiAm },
    { label: "Sua TMA", value: r.tmaAm },
  ];
  const max = Math.max(...bars.map((b) => Math.max(0, b.value ?? 0)), 0.0001);
  return (
    <TableToggle table={<MiniTable head={["", "ao mês"]} rows={bars.map((b) => [b.label, b.value != null ? formatPct(b.value) : "indefinida"])} />}>
      <ul className="grid gap-3" aria-label="Retorno ao mês comparado">
        {bars.map((b) => (
          <li key={b.label} className="grid grid-cols-[minmax(0,6rem)_1fr_auto] items-center gap-3 text-sm" title={`${b.label}: ${b.value != null ? formatPct(b.value) : "indefinida"} ao mês`}>
            <span className={b.main ? "font-bold" : ""}>{b.label}</span>
            <span className="h-5">
              {b.value != null && b.value > 0 && (
                <span
                  className={`block h-full rounded-r ${b.main ? "bg-accent" : "bg-chart-neutral"}`}
                  style={{ width: `${(b.value / max) * 100}%` }}
                />
              )}
            </span>
            <span className="text-right font-bold tabular-nums">{b.value != null ? formatPct(b.value) : "—"}</span>
          </li>
        ))}
      </ul>
      {r.irrAm == null && <p className="mt-2 text-xs text-text-muted">A TIR não tem uma resposta única para este fluxo. Compare pelo VPL.</p>}
    </TableToggle>
  );
}

/** De onde vem o custo total. Ordem fixa das fatias = ordem fixa das cores. */
export function CostComposition({ r }: { r: Result }) {
  const parts = [
    { label: "Terreno", v: r.costs.land, color: "bg-chart-1" },
    { label: "Obra", v: r.costs.build, color: "bg-chart-2" },
    { label: "Cartório e impostos", v: r.costs.acquisition + r.costs.tax, color: "bg-chart-3" },
    { label: "Juros da obra", v: r.costs.interest, color: "bg-chart-4" },
    { label: "Corretagem", v: r.costs.brokerage, color: "bg-chart-5" },
  ];
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  return (
    <div>
      <div className="flex h-7 gap-[2px] overflow-hidden rounded" role="img" aria-label={`Custo total ${formatBRL(total)}, dividido na legenda abaixo`}>
        {parts.map((p) => p.v > 0 && <div key={p.label} className={p.color} style={{ flexGrow: p.v }} title={`${p.label}: ${formatBRL(p.v)}`} />)}
      </div>
      <ul className="mt-3 grid gap-2 text-sm tabular-nums">
        {parts.map((p) => (
          <li key={p.label} className="grid grid-cols-[var(--space-3)_1fr_auto_3rem] items-center gap-2">
            <span aria-hidden className={`h-3 w-3 rounded-sm ${p.color}`} />
            <span>{p.label}</span>
            <span>{formatBRLShort(p.v)}</span>
            <span className="text-right text-text-muted">{formatPct(p.v / total, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Caixa acumulado mês a mês, com a exposição máxima marcada. */
export function CashFlowChart({ r }: { r: Result }) {
  const data = r.months.map((m) => ({ month: m.month, cumulative: Math.round(m.cumulative) }));
  const worst = data.reduce((a, d) => (d.cumulative < a.cumulative ? d : a), data[0]!);
  return (
    <TableToggle table={<MiniTable head={["Mês", "Acumulado"]} rows={data.map((d) => [d.month, formatBRL(d.cumulative)])} />}>
      <figure>
        <div className="h-[16rem] w-full" role="img" aria-label={`Caixa acumulado: pior ponto ${formatBRL(worst.cumulative)} no mês ${worst.month}; termina em ${formatBRL(r.profit)} no mês ${r.saleMonth}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "var(--color-text-subtle)", fontSize: 12 }} stroke="var(--color-border)" tickLine={false} label={{ value: "mês", position: "insideBottomRight", offset: -4, fill: "var(--color-text-subtle)", fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => formatBRLShort(v)} tick={{ fill: "var(--color-text-subtle)", fontSize: 12 }} stroke="var(--color-border)" tickLine={false} width={96} />
              <ReferenceLine y={0} stroke="var(--color-text-subtle)" strokeDasharray="3 3" />
              <Tooltip
                formatter={(v: number) => [formatBRL(v), "Acumulado"]}
                labelFormatter={(m) => `Mês ${m}`}
                contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", color: "var(--color-text)" }}
                // BUG-009: texto usa token de texto, nunca a cor da série (4,4:1 no claro)
                itemStyle={{ color: "var(--color-text)" }}
                labelStyle={{ color: "var(--color-text-muted)" }}
                cursor={{ stroke: "var(--color-text-subtle)" }}
              />
              <Line type="monotone" dataKey="cumulative" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "var(--color-surface)", strokeWidth: 2 }} isAnimationActive={false} />
              <ReferenceDot x={worst.month} y={worst.cumulative} r={5} fill="var(--chart-1)" stroke="var(--color-surface)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-sm text-text-muted">
          Você precisa ter até <b className="text-text">{formatBRL(r.maxExposure)}</b> em caixa (mês {worst.month}). A venda entra no mês {r.saleMonth}.
        </figcaption>
      </figure>
    </TableToggle>
  );
}

/** Quanto o lucro muda com cada variável. Piora em vermelho à esquerda, melhora em azul à direita. */
export function Tornado({ bars, base }: { bars: TornadoBar[]; base: number }) {
  const span = Math.max(...bars.flatMap((b) => [Math.abs(b.low - base), Math.abs(b.high - base)]), 1);
  return (
    <TableToggle table={<MiniTable head={["Variável", "Pior", "Melhor"]} rows={bars.map((b) => [b.label, formatBRL(b.low), formatBRL(b.high)])} />}>
      <ul className="grid gap-4" aria-label={`Sensibilidade do lucro. Lucro base ${formatBRL(base)}.`}>
        {bars.map((b) => {
          const lo = ((base - b.low) / span) * 50;
          const hi = ((b.high - base) / span) * 50;
          return (
            <li key={b.label} className="text-sm">
              <div className="mb-1 font-bold">{b.label}</div>
              <div className="relative h-5" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-[1px] bg-text-subtle" />
                <span className="absolute inset-y-0 rounded-l bg-danger" style={{ right: "50%", width: `${Math.max(0, lo)}%` }} />
                <span className="absolute inset-y-0 rounded-r bg-accent" style={{ left: "50%", width: `${Math.max(0, hi)}%` }} />
              </div>
              <div className="mt-1 flex justify-between tabular-nums text-text-muted">
                <span>{formatBRLShort(b.low)}</span>
                <span>{formatBRLShort(b.high)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </TableToggle>
  );
}
