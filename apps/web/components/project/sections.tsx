"use client";

import {
  buildCost,
  CUB_STANDARDS,
  formatBRL,
  grossSale,
  REVENUE_RATES,
  TAX_LABELS,
  TAX_REGIMES,
  UFS,
  type Inputs,
  type TaxRegime,
} from "@calc/core";
import { Pencil, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { RadioCards, Segmented, Slider } from "@/components/ui/choice";
import { IntField, MoneyField, NumberField, PercentField, SelectField } from "@/components/ui/fields";
import { Notice } from "@/components/ui/notice";
import { repo, type CubValue } from "@/lib/data";

export type Update = (fn: (i: Inputs) => Inputs) => void;
interface P {
  inputs: Inputs;
  update: Update;
}

const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

export function LandSection({ inputs: { land }, update }: P) {
  const set = (p: Partial<Inputs["land"]>) => update((i) => ({ ...i, land: { ...i.land, ...p } }));
  const fees = (land.priceCents / 100) * ((land.itbiBps + land.deedBps + land.registryBps + land.buyBrokerageBps) / 10_000) + land.otherCents / 100;
  return (
    <div className={grid}>
      <MoneyField label="Preço do terreno" cents={land.priceCents} onCents={(c) => set({ priceCents: c })} hint="O valor combinado com o vendedor." />
      <NumberField label="Área do terreno" value={land.areaM2} onChange={(v) => set({ areaM2: v })} suffix="m²" srUnit="metros quadrados" digits={0} />
      <PercentField label="ITBI" bps={land.itbiBps} onBps={(b) => set({ itbiBps: b })} hint="Imposto da prefeitura, em geral de 2% a 3%." />
      <PercentField label="Escritura" bps={land.deedBps} onBps={(b) => set({ deedBps: b })} />
      <PercentField label="Registro" bps={land.registryBps} onBps={(b) => set({ registryBps: b })} />
      <PercentField label="Corretagem na compra" bps={land.buyBrokerageBps} onBps={(b) => set({ buyBrokerageBps: b })} />
      <MoneyField label="Outros custos de compra" cents={land.otherCents} onCents={(c) => set({ otherCents: c })} hint="Certidões, taxas, levantamento topográfico." />
      <div className="self-end rounded-lg bg-surface-muted p-4 text-sm sm:col-span-2 lg:col-span-2">
        Cartório e taxas somam <b className="tabular-nums">{formatBRL(fees)}</b>. O terreno sai por{" "}
        <b className="tabular-nums">{formatBRL(land.priceCents / 100 + fees)}</b> no mês 0.
      </div>
    </div>
  );
}

function useCub(uf: string, standard: string) {
  const [cub, setCub] = useState<CubValue | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setCub(undefined);
    repo.latestCub(uf, standard).then((c) => alive && setCub(c));
    return () => {
      alive = false;
    };
  }, [uf, standard]);
  return cub;
}

function monthsOld(refMonth: string): number {
  const [y, m] = refMonth.split("-").map(Number) as [number, number];
  const d = new Date();
  return (d.getFullYear() - y) * 12 + (d.getMonth() + 1 - m);
}

function monthLabel(refMonth: string) {
  const [y, m] = refMonth.split("-").map(Number) as [number, number];
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export function BuildSection({ inputs, update }: P) {
  const b = inputs.build;
  const set = (p: Partial<Inputs["build"]>) => update((i) => ({ ...i, build: { ...i.build, ...p } }));
  const cub = useCub(b.uf, b.cubStandard);
  const detail = buildCost(b);

  // modo automático: copia o CUB da tabela para o estudo
  useEffect(() => {
    if (b.cubMode === "auto" && cub && (cub.valueM2Cents !== b.cubM2Cents || cub.refMonth !== b.cubRefMonth))
      set({ cubM2Cents: cub.valueM2Cents, cubRefMonth: cub.refMonth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.cubMode, cub]);

  const autoUnavailable = cub === null;
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className={grid}>
        <NumberField label="Área construída" value={b.builtAreaM2} onChange={(v) => set({ builtAreaM2: v })} suffix="m²" srUnit="metros quadrados" digits={0} required />
        <SelectField label="Estado" value={b.uf} onChange={(v) => set({ uf: v })} options={UFS.map((u) => ({ value: u, label: u }))} />
        <SelectField
          label="Padrão CUB"
          value={b.cubStandard}
          onChange={(v) => set({ cubStandard: v })}
          options={CUB_STANDARDS.map((s) => ({ value: s, label: s }))}
          hint="R1 = casa térrea ou sobrado; B, N, A = baixo, normal, alto."
        />
      </div>

      <div className="grid gap-3">
        <Segmented
          label="Origem do CUB"
          value={b.cubMode}
          onChange={(m) => set({ cubMode: m })}
          options={[
            { value: "auto", label: "Tabela", icon: <Zap aria-hidden className="h-4 w-4" />, disabled: autoUnavailable && b.cubMode !== "auto" },
            { value: "manual", label: "Digitar", icon: <Pencil aria-hidden className="h-4 w-4" /> },
          ]}
        />
        {autoUnavailable && (
          <Notice tone="info">
            Ainda não há CUB de {b.uf} {b.cubStandard} na tabela. Digite o valor do Sinduscon do seu estado, ou importe a tabela em Conta.
          </Notice>
        )}
        {b.cubMode === "auto" && cub && monthsOld(cub.refMonth) > 2 && (
          <Notice tone="warn">O CUB desta tabela é de {monthLabel(cub.refMonth)}. Confira se já saiu um mais novo.</Notice>
        )}
      </div>

      <div className={grid}>
        <MoneyField
          label="CUB por m²"
          cents={b.cubM2Cents}
          onCents={(c) => set({ cubM2Cents: c, cubMode: "manual", cubRefMonth: null })}
          readOnly={b.cubMode === "auto" && !!cub}
          auto={b.cubMode === "auto" && !!cub}
          required
          hint={b.cubMode === "auto" && cub ? `${b.uf} ${b.cubStandard}, ${monthLabel(cub.refMonth)}.` : "Custo unitário básico do Sinduscon do seu estado."}
        />
        <NumberField
          label="Fator do custo real"
          value={b.realCostFactorBps / 10_000}
          onChange={(v) => set({ realCostFactorBps: Math.round(v * 10_000) })}
          suffix="× CUB"
          min={0.5}
          max={3}
          hint="O CUB não cobre tudo; 1,2 a 1,4 é comum."
        />
        <PercentField label="Imprevistos" bps={b.contingencyBps} onBps={(v) => set({ contingencyBps: v })} hint="Folga para o que der errado. Quem está começando costuma usar mais." />
        <MoneyField label="Projetos, alvará, habite-se" cents={b.permitsCents} onCents={(c) => set({ permitsCents: c })} hint="Pagos antes da obra (mês 0)." />
        <MoneyField label="Ligações de água, luz, esgoto" cents={b.utilitiesCents} onCents={(c) => set({ utilitiesCents: c })} />
        <MoneyField label="Muro, piscina, paisagismo" cents={b.extrasCents} onCents={(c) => set({ extrasCents: c })} />
        <PercentField label="BDI" bps={b.bdiBps} onBps={(v) => set({ bdiBps: v })} hint="Só se uma construtora cobra administração e lucro." />
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-surface-muted p-4 text-sm tabular-nums sm:grid-cols-3">
        <div>
          <dt className="text-text-muted">Área × CUB × fator</dt>
          <dd className="font-bold">{formatBRL(detail.direct)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Projetos e extras</dt>
          <dd className="font-bold">{formatBRL(detail.permits + detail.indirect)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">BDI e imprevistos</dt>
          <dd className="font-bold">{formatBRL(detail.bdi + detail.contingency)}</dd>
        </div>
        <div className="col-span-2 border-t border-border pt-3 sm:col-span-3">
          <dt className="text-text-muted">Obra total</dt>
          <dd className="text-xl">
            {formatBRL(detail.total)}
            {b.builtAreaM2 > 0 && <span className="ml-2 text-sm font-normal text-text-muted">({formatBRL(detail.total / b.builtAreaM2)}/m²)</span>}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ScheduleSection({ inputs, update }: P) {
  const s = inputs.schedule;
  const set = (p: Partial<Inputs["schedule"]>) => update((i) => ({ ...i, schedule: { ...i.schedule, ...p } }));
  const manual = s.manualCurveBps.length === s.buildMonths ? s.manualCurveBps : Array.from({ length: s.buildMonths }, () => Math.round(10_000 / s.buildMonths));
  const manualSum = manual.reduce((a, b) => a + b, 0);
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className={grid}>
        <IntField label="Meses de obra" value={s.buildMonths} onChange={(n) => set({ buildMonths: n, manualCurveBps: [] })} min={1} max={120} suffix="meses" />
        <IntField label="Meses para vender" value={s.monthsToSell} onChange={(n) => set({ monthsToSell: n })} min={0} max={120} suffix="meses" hint="Depois de pronta. Contando escritura do comprador." />
      </div>
      <div className="grid gap-3">
        <Segmented
          label="Como o dinheiro da obra sai"
          value={s.spendCurve}
          onChange={(c) => set({ spendCurve: c, manualCurveBps: c === "manual" ? manual : s.manualCurveBps })}
          options={[
            { value: "s_curve", label: "Curva S" },
            { value: "linear", label: "Igual todo mês" },
            { value: "manual", label: "Manual" },
          ]}
        />
        <p className="text-sm text-text-muted">
          {s.spendCurve === "s_curve" && "Começa devagar (fundação), acelera na estrutura e alvenaria, e desacelera no acabamento."}
          {s.spendCurve === "linear" && "O mesmo valor em todos os meses de obra."}
          {s.spendCurve === "manual" && `Digite a % de cada mês. Soma atual: ${(manualSum / 100).toLocaleString("pt-BR")}% (o cálculo ajusta para 100%).`}
        </p>
      </div>
      {s.spendCurve === "manual" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {manual.map((bps, k) => (
            <PercentField
              key={k}
              label={`Mês ${k + 1}`}
              bps={bps}
              onBps={(v) => set({ manualCurveBps: manual.map((x, j) => (j === k ? v : x)) })}
              max={100}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FinancingSection({ inputs, update }: P) {
  const f = inputs.financing;
  const set = (p: Partial<Inputs["financing"]>) => update((i) => ({ ...i, financing: { ...i.financing, ...p } }));
  return (
    <div className="grid grid-cols-1 gap-6">
      <Slider
        label="Parte da obra financiada"
        value={f.financedBps / 100}
        onChange={(v) => set({ financedBps: Math.round(v * 100) })}
        min={0}
        max={100}
        step={5}
        valueText={f.financedBps === 0 ? "sem financiamento" : `${f.financedBps / 100}% da obra`}
      />
      {f.financedBps > 0 && (
        <div className={grid}>
          <PercentField label="Juros" unit="% a.a." bps={f.rateAaBps} onBps={(v) => set({ rateAaBps: v })} hint="Taxa anual; o cálculo converte para mensal por juros compostos." />
          <IntField label="Carência" value={f.graceMonths} onChange={(n) => set({ graceMonths: n })} suffix="meses" max={120} hint="Meses em que os juros somam ao saldo em vez de serem pagos." />
          <div className="grid content-start gap-2">
            <span className="text-label uppercase tracking-[0.04em] text-text-muted">Liberação do dinheiro</span>
            <Segmented
              label="Liberação do dinheiro"
              value={f.release}
              onChange={(r) => set({ release: r })}
              options={[
                { value: "per_measure", label: "Por etapa" },
                { value: "upfront", label: "Tudo no início" },
              ]}
            />
          </div>
        </div>
      )}
      <Notice tone="info">O saldo do financiamento é quitado com o dinheiro da venda. Prazo e sistema de amortização (SAC/Price) depois da venda ainda não entram no cálculo.</Notice>
    </div>
  );
}

export function SaleSection({ inputs, update }: P) {
  const s = inputs.sale;
  const set = (p: Partial<Inputs["sale"]>) => update((i) => ({ ...i, sale: { ...i.sale, ...p } }));
  const area = inputs.build.builtAreaM2;
  return (
    <div className="grid grid-cols-1 gap-6">
      <Segmented
        label="Como informar o preço"
        value={s.mode}
        onChange={(m) => set({ mode: m })}
        options={[
          { value: "total", label: "Valor total" },
          { value: "per_m2", label: "Por m²" },
        ]}
      />
      <div className={grid}>
        {s.mode === "total" ? (
          <MoneyField label="Preço de venda" cents={s.priceCents} onCents={(c) => set({ priceCents: c })} required hint={area > 0 && s.priceCents > 0 ? `${formatBRL(s.priceCents / 100 / area)} por m² construído.` : undefined} />
        ) : (
          <MoneyField label="Preço de venda por m²" cents={s.priceM2Cents} onCents={(c) => set({ priceM2Cents: c })} required hint={`× ${area.toLocaleString("pt-BR")} m² = ${formatBRL((s.priceM2Cents / 100) * area)}`} />
        )}
        <PercentField label="Desconto na negociação" bps={s.discountBps} onBps={(v) => set({ discountBps: v })} max={90} />
        <PercentField label="Corretagem na venda" bps={s.brokerageBps} onBps={(v) => set({ brokerageBps: v })} hint="Em geral 5% a 6%." />
      </div>
      <p className="text-sm text-text-muted">
        Entra na venda: <b className="tabular-nums text-text">{formatBRL(grossSale(inputs))}</b>, menos corretagem de{" "}
        <b className="tabular-nums text-text">{formatBRL(grossSale(inputs) * (s.brokerageBps / 10_000))}</b>.
      </p>
    </div>
  );
}

const TAX_TEXT: Record<TaxRegime, string> = {
  pf_ganho_capital: "15% sobre o lucro da venda (faixas maiores acima de R$ 5 mi).",
  pj_presumido: `${(REVENUE_RATES.pj_presumido * 100).toLocaleString("pt-BR")}% sobre a receita, sem o adicional de IR.`,
  pj_ret: `${(REVENUE_RATES.pj_ret * 100).toLocaleString("pt-BR")}% sobre a receita, com patrimônio de afetação.`,
  isento: "Não calcula imposto.",
};

export function TaxSection({ inputs, update }: P) {
  const t = inputs.tax;
  const set = (p: Partial<Inputs["tax"]>) => update((i) => ({ ...i, tax: { ...i.tax, ...p } }));
  return (
    <div className="grid grid-cols-1 gap-6">
      <RadioCards
        label="Regime de imposto"
        value={t.regime}
        onChange={(r) => set({ regime: r, rateOverrideBps: null })}
        options={TAX_REGIMES.map((r) => ({ value: r, title: TAX_LABELS[r], text: TAX_TEXT[r] }))}
        describedBy="aviso-habitualidade"
      />
      {t.regime === "pf_ganho_capital" && (
        <Notice tone="warn" id="aviso-habitualidade">
          Quem constrói e vende com frequência como pessoa física pode ser tratado como empresa pela Receita, e aí o imposto muda. Converse com seu contador antes de decidir o regime.
        </Notice>
      )}
      {t.regime !== "isento" && (
        <div className={grid}>
          <PercentField
            label="Alíquota própria (opcional)"
            bps={t.rateOverrideBps ?? 0}
            onBps={(v) => set({ rateOverrideBps: v > 0 ? v : null })}
            max={100}
            hint={t.rateOverrideBps == null ? "Vazio usa a alíquota de referência acima." : "Usando a alíquota que você digitou."}
          />
        </div>
      )}
      <Notice tone="info">As alíquotas de referência ainda não foram revisadas por um contador. Use como estimativa.</Notice>
    </div>
  );
}

export function BenchSection({ inputs, update }: P) {
  const b = inputs.bench;
  const set = (p: Partial<Inputs["bench"]>) => update((i) => ({ ...i, bench: { ...i.bench, ...p } }));
  return (
    <div className={grid}>
      <PercentField label="Sua TMA" unit="% a.m." bps={b.tmaAmBps} onBps={(v) => set({ tmaAmBps: v })} hint="O mínimo que o dinheiro precisa render para valer o risco." />
      <PercentField label="Selic" unit="% a.a." bps={b.selicAaBps} onBps={(v) => set({ selicAaBps: v })} hint="Para comparar com deixar o dinheiro aplicado." />
    </div>
  );
}
