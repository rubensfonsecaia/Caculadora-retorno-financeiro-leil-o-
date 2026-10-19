"use client";

import {
  applyScenario,
  breakEvenSalePrice,
  compute,
  DEFAULT_SCENARIOS,
  formatBRL,
  formatPct,
  tornado,
  type Inputs,
  type Result,
  type ScenarioDelta,
} from "@calc/core";
import { Plus, Trash2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CashFlowChart, Tornado } from "@/components/charts/charts";
import { SECTIONS, useProjectCtx, type SectionSlug } from "@/components/project/context";
import { ResultView } from "@/components/project/result-view";
import { BenchSection, BuildSection, FinancingSection, LandSection, SaleSection, ScheduleSection, TaxSection } from "@/components/project/sections";
import { Button } from "@/components/ui/button";
import { Card, Label } from "@/components/ui/card";
import { IntField, PercentField, TextField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { missingText, VerdictBadge, VerdictCard } from "@/components/ui/verdict";
import { repo, type Scenario } from "@/lib/data";
import { errorMessage } from "@/lib/errors";
import { useLive, useResult } from "@/lib/hooks";

function FormCard({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-lg">{title}</h2>
      {text && <p className="mb-5 mt-1 text-sm text-text-muted">{text}</p>}
      {!text && <div className="mb-5" />}
      {children}
    </Card>
  );
}

function MonthlyTable({ r }: { r: Result }) {
  const k = (v: number) => (Math.abs(v) < 0.5 ? "0" : formatBRL(v));
  const cols = ["Terreno", "Obra", "Financ.", "Venda", "Imposto", "Saldo do mês", "Acumulado"];
  return (
    <div tabIndex={0} role="region" aria-label="Fluxo de caixa mês a mês, role para os lados" className="overflow-x-auto rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
      <table className="w-full min-w-[48rem] whitespace-nowrap text-sm tabular-nums">
        <caption className="mb-2 text-left font-bold">Fluxo de caixa mês a mês</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-surface-muted px-3 py-2 text-left text-label uppercase text-text-muted">
              Mês
            </th>
            {cols.map((c) => (
              <th key={c} scope="col" className="bg-surface-muted px-3 py-2 text-right text-label uppercase text-text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.months.map((m) => (
            <tr key={m.month} className="border-t border-border">
              <th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left font-bold">
                {m.month}
              </th>
              <td className="px-3 py-2 text-right">{k(m.land)}</td>
              <td className="px-3 py-2 text-right">{k(m.build)}</td>
              <td className="px-3 py-2 text-right">{k(m.financing)}</td>
              <td className="px-3 py-2 text-right">{k(m.sale)}</td>
              <td className="px-3 py-2 text-right">{k(m.tax)}</td>
              <td className={`px-3 py-2 text-right font-bold ${m.net < 0 ? "text-danger" : ""}`}>{k(m.net)}</td>
              <td className={`px-3 py-2 text-right ${m.cumulative < 0 ? "text-danger" : ""}`}>{k(m.cumulative)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-border font-extrabold">
            <th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left">
              Total
            </th>
            {(["land", "build", "financing", "sale", "tax", "net"] as const).map((key) => (
              <td key={key} className="px-3 py-2 text-right">
                {k(r.months.reduce((a, m) => a + m[key], 0))}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function toDelta(s: Scenario | ScenarioDelta): ScenarioDelta {
  return { name: s.name, priceDeltaBps: s.priceDeltaBps, costDeltaBps: s.costDeltaBps, buildDeltaMonths: s.buildDeltaMonths, sellDeltaMonths: s.sellDeltaMonths };
}

function describe(s: ScenarioDelta): string {
  const parts: string[] = [];
  const pct = (b: number) => `${b > 0 ? "+" : "−"}${Math.abs(b / 100).toLocaleString("pt-BR")}%`;
  if (s.priceDeltaBps) parts.push(`preço ${pct(s.priceDeltaBps)}`);
  if (s.costDeltaBps) parts.push(`obra ${pct(s.costDeltaBps)}`);
  if (s.buildDeltaMonths) parts.push(`obra ${s.buildDeltaMonths > 0 ? "+" : "−"}${Math.abs(s.buildDeltaMonths)} meses`);
  if (s.sellDeltaMonths) parts.push(`venda ${s.sellDeltaMonths > 0 ? "+" : "−"}${Math.abs(s.sellDeltaMonths)} meses`);
  return parts.length ? parts.join(", ") : "como está";
}

function ScenarioEditor({ open, onClose, projectId, initial }: { open: boolean; onClose: () => void; projectId: string; initial: Scenario | null }) {
  const [s, setS] = useState<ScenarioDelta>(initial ? toDelta(initial) : { name: "", priceDeltaBps: 0, costDeltaBps: 0, buildDeltaMonths: 0, sellDeltaMonths: 0 });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={initial ? "Editar cenário" : "Novo cenário"} description="Use números negativos para piorar (ex.: preço −5).">
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await repo.upsertScenario({ ...s, name: s.name.trim() || "Meu cenário", projectId, id: initial?.id });
            onClose();
          } catch (err) {
            toast("error", errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextField label="Nome" value={s.name} onChange={(name) => setS({ ...s, name })} maxLength={60} />
        <div className="grid grid-cols-2 gap-4">
          <PercentField label="Preço de venda" bps={s.priceDeltaBps} onBps={(v) => setS({ ...s, priceDeltaBps: v })} min={-90} max={90} />
          <PercentField label="Custo da obra" bps={s.costDeltaBps} onBps={(v) => setS({ ...s, costDeltaBps: v })} min={-90} max={90} />
          <IntField label="Prazo da obra" value={s.buildDeltaMonths} onChange={(n) => setS({ ...s, buildDeltaMonths: n })} min={-24} max={60} suffix="meses" />
          <IntField label="Prazo de venda" value={s.sellDeltaMonths} onChange={(n) => setS({ ...s, sellDeltaMonths: n })} min={-24} max={60} suffix="meses" />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Scenarios({ inputs, base, projectId }: { inputs: Inputs; base: Result; projectId: string }) {
  const { data: saved = [] } = useLive(() => repo.listScenarios(projectId), [projectId]);
  const [editing, setEditing] = useState<Scenario | null | "new">(null);
  const rows = useMemo(
    () =>
      [...DEFAULT_SCENARIOS.map((d) => ({ d, saved: null as Scenario | null })), ...saved.map((s) => ({ d: toDelta(s), saved: s }))].map((x) => ({
        ...x,
        r: compute(applyScenario(inputs, x.d)),
      })),
    [inputs, saved],
  );
  const bars = useMemo(() => tornado(inputs, base), [inputs, base]);
  const be = useMemo(() => breakEvenSalePrice(inputs), [inputs]);
  const listPrice = inputs.sale.mode === "per_m2" ? (inputs.sale.priceM2Cents / 100) * inputs.build.builtAreaM2 : inputs.sale.priceCents / 100;

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">E se der errado?</h2>
          <Button variant="secondary" onClick={() => setEditing("new")}>
            <Plus aria-hidden className="h-4 w-4" />
            Novo cenário
          </Button>
        </div>
        <div tabIndex={0} role="region" aria-label="Tabela de cenários, role para os lados" className="overflow-x-auto rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
          <table className="w-full min-w-[40rem] text-sm tabular-nums [&_td]:whitespace-nowrap">
            <thead>
              <tr>
                {["Cenário", "O que muda", "Lucro", "TIR a.m.", "Veredito", ""].map((h, i) => (
                  <th key={i} scope="col" className={`bg-surface-muted px-3 py-2 text-label uppercase text-text-muted ${i >= 2 && i <= 3 ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ d, r, saved: s }, k) => (
                <tr key={s?.id ?? `d${k}`} className="border-t border-border">
                  <th scope="row" className="px-3 py-2 text-left font-bold">
                    {d.name}
                  </th>
                  <td className="px-3 py-2 text-text-muted">{describe(d)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${r.ok && r.profit < 0 ? "text-danger" : ""}`}>{r.ok ? formatBRL(r.profit) : "—"}</td>
                  <td className="px-3 py-2 text-right">{r.ok && r.irrAm != null ? formatPct(r.irrAm) : "—"}</td>
                  <td className="px-3 py-2">{r.ok ? <VerdictBadge verdict={r.verdict} /> : <VerdictBadge verdict={null} />}</td>
                  <td className="px-3 py-2 text-right">
                    {s && (
                      <span className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => repo.deleteScenario(s.id)} aria-label={`Excluir ${s.name}`}>
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text-muted">Os três primeiros são fixos. Pessimista: preço −5%, obra +5%, 1 mês a mais de obra e 2 de venda.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Label className="mb-3">O que mais mexe no lucro</Label>
          <Tornado bars={bars} base={base.profit} />
        </Card>
        <Card>
          <Label>Preço mínimo de venda</Label>
          <p className="mt-2 text-3xl tabular-nums">{be != null ? formatBRL(be) : "—"}</p>
          <p className="mt-2 text-sm text-text-muted">
            Abaixo disso o projeto dá prejuízo.
            {be != null && listPrice > 0 && ` Seu preço está ${formatPct(listPrice / be - 1, 0)} acima.`}
          </p>
        </Card>
      </div>
      {editing && <ScenarioEditor open onClose={() => setEditing(null)} projectId={projectId} initial={editing === "new" ? null : editing} />}
    </div>
  );
}

export default function SectionPage() {
  const { secao } = useParams<{ secao: string }>();
  const { project, updateInputs } = useProjectCtx();
  const r = useResult(project?.inputs);
  if (!SECTIONS.some((s) => s.slug === secao)) notFound();
  if (!project) return null;
  const inputs = project.inputs;
  const p = { inputs, update: updateInputs };
  const slug = secao as SectionSlug;

  switch (slug) {
    case "terreno":
      return (
        <FormCard title="Terreno" text="O que você paga para ter o terreno no seu nome. Tudo isso sai no mês 0.">
          <LandSection {...p} />
        </FormCard>
      );
    case "obra":
      return (
        <FormCard title="Obra" text="Custo estimado pelo CUB, mais o que o CUB não cobre.">
          <BuildSection {...p} />
        </FormCard>
      );
    case "prazo":
      return (
        <FormCard title="Prazo" text="Quanto tempo o dinheiro fica parado é o que mais pesa na TIR.">
          <ScheduleSection {...p} />
        </FormCard>
      );
    case "financiamento":
      return (
        <FormCard title="Financiamento da obra" text="Parte da obra paga pelo banco, com juros mensais até a venda.">
          <FinancingSection {...p} />
        </FormCard>
      );
    case "venda":
      return (
        <FormCard title="Venda">
          <SaleSection {...p} />
        </FormCard>
      );
    case "impostos":
      return (
        <div className="grid grid-cols-1 gap-6">
          <FormCard title="Imposto sobre a venda">
            <TaxSection {...p} />
          </FormCard>
          <FormCard title="Comparar com" text="Usados no veredito e na comparação de retorno.">
            <BenchSection {...p} />
          </FormCard>
        </div>
      );
    case "resultado":
      return r?.ok ? <ResultView inputs={inputs} r={r} /> : <VerdictCard result={r} />;
    case "fluxo":
      if (!r?.ok) return <Notice tone="info">Preencha {r ? missingText(r.missing) : "os dados"} para ver o fluxo.</Notice>;
      return (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <Label className="mb-3">Caixa acumulado</Label>
            <CashFlowChart r={r} />
          </Card>
          <Card>
            <MonthlyTable r={r} />
          </Card>
        </div>
      );
    case "cenarios":
      if (!r?.ok) return <Notice tone="info">Preencha {r ? missingText(r.missing) : "os dados"} para testar cenários.</Notice>;
      return <Scenarios inputs={inputs} base={r} projectId={project.id} />;
  }
}
