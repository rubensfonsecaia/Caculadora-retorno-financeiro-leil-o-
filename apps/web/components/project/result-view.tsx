"use client";

import { amToAa, formatBRL, formatPct, maxLandPrice, TAX_TABLE_VERSION, type Inputs, type Result } from "@calc/core";
import { useMemo } from "react";
import { BenchmarkBars, CostComposition } from "@/components/charts/charts";
import { Card, Label } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Kpi, VerdictCard } from "@/components/ui/verdict";

export function MaxLand({ inputs, r }: { inputs: Inputs; r: Result }) {
  const atTma = useMemo(() => maxLandPrice(inputs, r.tmaAm), [inputs, r.tmaAm]);
  const atSelic = useMemo(() => maxLandPrice(inputs, r.selicAm), [inputs, r.selicAm]);
  const breakEven = useMemo(() => maxLandPrice(inputs, 0), [inputs]);
  const current = inputs.land.priceCents / 100;
  const rows = [
    { label: `Para render sua TMA (${formatPct(r.tmaAm)} a.m.)`, v: atTma },
    { label: `Para render a Selic (${formatPct(r.selicAm)} a.m.)`, v: atSelic },
    { label: "Para não ter prejuízo", v: breakEven },
  ];
  return (
    <Card>
      <Label>Quanto dá para pagar no terreno</Label>
      <ul className="mt-3 grid gap-3">
        {rows.map((x) => (
          <li key={x.label} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0">
            <span className="text-sm text-text-muted">{x.label}</span>
            <b className="text-lg tabular-nums">{x.v == null ? "nem de graça" : formatBRL(x.v)}</b>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-text-muted">
        Você está pagando <b className="tabular-nums text-text">{formatBRL(current)}</b>
        {atTma != null && (current <= atTma ? ", dentro do teto da sua TMA." : `, ${formatBRL(current - atTma)} acima do teto da sua TMA.`)}
      </p>
    </Card>
  );
}

export function Memorial({ r, buildMonths }: { r: Result; buildMonths: number }) {
  return (
    <details className="rounded-lg bg-surface-muted px-4 py-3 text-sm">
      <summary className="cursor-pointer font-bold">Como cada número é calculado</summary>
      <div className="mt-3 grid gap-3 text-text-muted [&_b]:text-text [&_code]:font-mono [&_code]:text-text">
        <p>
          <b>Linha do tempo.</b> Mês 0: compra do terreno, cartório e projetos. Meses 1 a {buildMonths}: obra, paga no fim de cada mês pela curva escolhida. Mês {r.saleMonth}: venda, imposto e quitação do financiamento.
        </p>
        <p>
          <b>Custo da obra.</b> <code>área × CUB × fator</code> + ligações e extras + projetos; sobre isso o BDI e depois os imprevistos.
        </p>
        <p>
          <b>Lucro líquido.</b> Soma de todos os meses: venda − corretagem − terreno − cartório − obra − juros − imposto.
        </p>
        <p>
          <b>TIR.</b> Taxa mensal que zera o VPL do fluxo: <code>Σ fluxoₜ / (1 + TIR)ᵗ = 0</code>. Anual: <code>(1 + TIR)¹² − 1</code>. Quando o fluxo troca de sinal mais de uma vez pode haver mais de uma taxa; aí mostramos “indefinida” e vale o VPL.
        </p>
        <p>
          <b>VPL.</b> O fluxo trazido a hoje pela sua TMA. Positivo quer dizer que rende mais que a TMA.
        </p>
        <p>
          <b>ROI.</b> Lucro ÷ o máximo de dinheiro que você precisou ter ao mesmo tempo ({formatBRL(r.maxExposure)}). <b>Múltiplo</b>: tudo que entra ÷ tudo que sai do seu bolso.
        </p>
        <p>
          <b>Taxas.</b> Anual para mensal sempre por juros compostos: <code>(1 + a.a.)^(1/12) − 1</code>. CDI estimado como Selic − 0,10 p.p.
        </p>
        <p>
          <b>Imposto.</b> {r.taxBasis === "gain" && "Pessoa física: sobre venda − corretagem − terreno − cartório − obra (custos que você consegue comprovar). "}
          {r.taxBasis === "revenue" && "Sobre a receita bruta da venda. "}
          {r.taxBasis === "none" && "Não calculado. "}
          Tabela de referência {TAX_TABLE_VERSION}, ainda não revisada por contador.
        </p>
        <p>
          <b>Veredito.</b> Viável: TIR ≥ TMA (ou VPL ≥ 0 quando a TIR é indefinida). Marginal: dá lucro mas rende menos que a TMA. Inviável: lucro ≤ 0.
        </p>
      </div>
    </details>
  );
}

export function ResultView({ inputs, r }: { inputs: Inputs; r: Result }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <VerdictCard result={r} />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-3">
          <Kpi label="Vendido por" value={formatBRL(r.grossRevenue)} />
          <Kpi label="Custo total" value={formatBRL(r.totalCost)} />
          <Kpi label="Caixa necessário" value={formatBRL(r.maxExposure)} hint="o pior momento do fluxo" />
          <Kpi label="ROI s/ caixa" value={formatPct(r.roi, 1)} negative={r.roi < 0} />
          <Kpi label="Múltiplo" value={`${r.moic.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`} />
          <Kpi label="VPL na TMA" value={formatBRL(r.npvAtTma)} negative={r.npvAtTma < 0} />
          <Kpi label="TIR ao ano" value={r.irrAa != null ? formatPct(r.irrAa, 1) : "indefinida"} hint={`TMA ao ano: ${formatPct(amToAa(r.tmaAm), 1)}`} />
          <Kpi label="Payback" value={r.payback != null ? `mês ${r.payback}` : "não paga"} hint={r.discountedPayback != null ? `descontado: mês ${r.discountedPayback}` : "descontado: não paga"} />
          <Kpi label="Imposto" value={formatBRL(r.costs.tax)} hint={r.taxEffectiveRate ? `${formatPct(r.taxEffectiveRate, 1)} ${r.taxBasis === "gain" ? "do ganho" : "da receita"}` : undefined} />
        </div>
      </div>
      {r.irrAm == null && r.profit > 0 && <Notice tone="error">A TIR não tem uma resposta única para este fluxo. Use o VPL para decidir.</Notice>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <Label className="mb-3">Retorno ao mês</Label>
          <BenchmarkBars r={r} />
        </Card>
        <Card>
          <Label className="mb-3">De onde vem o custo</Label>
          <CostComposition r={r} />
        </Card>
        <MaxLand inputs={inputs} r={r} />
      </div>
      <Memorial r={r} buildMonths={inputs.schedule.buildMonths} />
    </div>
  );
}
