"use client";

import { TAX_LABELS, TAX_REGIMES, type Inputs } from "@calc/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { BenchmarkBars } from "@/components/charts/charts";
import { MobileResultBar } from "@/components/project/result-bar";
import { MaxLand } from "@/components/project/result-view";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Label, PageTitle, Skeleton } from "@/components/ui/card";
import { IntField, MoneyField, NumberField, PercentField, SelectField, TextField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Kpi, VerdictCard } from "@/components/ui/verdict";
import { formatBRL, formatPct } from "@calc/core";
import { PlanLimitError, repo } from "@/lib/data";
import { clearDraft, loadDraft, newInputs, saveDraft } from "@/lib/draft";
import { useResult, useSession } from "@/lib/hooks";

function QuickCalculator() {
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const { session } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    const draft = loadDraft();
    if (draft) setInputs(draft);
    else
      repo
        .getSession()
        .then((s) => (s ? repo.getProfile() : null))
        .catch(() => null)
        .then((profile) => alive && setInputs(newInputs(profile)));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (params.get("salvar") === "1" && session) setSaveOpen(true);
  }, [params, session]);

  const update = useCallback((fn: (i: Inputs) => Inputs) => {
    setInputs((cur) => {
      if (!cur) return cur;
      const next = fn(cur);
      saveDraft(next);
      return next;
    });
  }, []);
  const r = useResult(inputs ?? undefined);

  if (!inputs) {
    return (
      <div aria-busy className="grid gap-4">
        <Skeleton className="h-9 w-[20rem]" />
        <Skeleton className="h-[24rem] w-full" />
      </div>
    );
  }

  const setL = (p: Partial<Inputs["land"]>) => update((i) => ({ ...i, land: { ...i.land, ...p } }));
  const setB = (p: Partial<Inputs["build"]>) => update((i) => ({ ...i, build: { ...i.build, ...p, ...(p.cubM2Cents != null ? { cubMode: "manual" as const, cubRefMonth: null } : {}) } }));
  const setS = (p: Partial<Inputs["schedule"]>) => update((i) => ({ ...i, schedule: { ...i.schedule, ...p, manualCurveBps: [] } }));
  const setV = (p: Partial<Inputs["sale"]>) => update((i) => ({ ...i, sale: { ...i.sale, ...p } }));

  async function save() {
    if (!inputs) return;
    setSaving(true);
    try {
      const p = await repo.createProject({ name: name || "Estudo sem nome", inputs });
      clearDraft();
      toast("success", "Projeto salvo.");
      router.push(`/projetos/${p.id}/resultado`);
    } catch (e) {
      if (e instanceof PlanLimitError) toast("error", "O plano grátis guarda 3 projetos. Arquive um ou veja os planos.");
      else toast("error", "Não deu para salvar. Tente de novo.");
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Vale a pena construir?"
        sub="Mude os números e veja o resultado na hora. Nada é salvo até você pedir."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={async () => {
                clearDraft();
                const profile = session ? await repo.getProfile().catch(() => null) : null;
                update(() => newInputs(profile));
                toast("info", "Valores de exemplo restaurados.");
              }}
            >
              Recomeçar
            </Button>
            <Button onClick={() => (session ? setSaveOpen(true) : router.push(`/entrar?next=${encodeURIComponent("/calcular?salvar=1")}`))}>Salvar projeto</Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <form className="grid grid-cols-1 gap-6" onSubmit={(e) => e.preventDefault()} aria-label="Dados do estudo">
          <Card>
            <h2 className="mb-4 text-lg">Terreno</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MoneyField label="Preço do terreno" cents={inputs.land.priceCents} onCents={(c) => setL({ priceCents: c })} />
              <PercentField label="ITBI + escritura + registro" bps={inputs.land.itbiBps + inputs.land.deedBps + inputs.land.registryBps} onBps={(b) => setL({ itbiBps: b, deedBps: 0, registryBps: 0 })} hint="Em geral 4% a 5% do preço." />
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg">Obra</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField label="Área construída" value={inputs.build.builtAreaM2} onChange={(v) => setB({ builtAreaM2: v })} suffix="m²" srUnit="metros quadrados" digits={0} required />
              <MoneyField label="CUB por m²" cents={inputs.build.cubM2Cents} onCents={(c) => setB({ cubM2Cents: c })} required hint="Do Sinduscon do seu estado." />
              <NumberField
                label="Fator do custo real"
                value={inputs.build.realCostFactorBps / 10_000}
                onChange={(v) => setB({ realCostFactorBps: Math.round(v * 10_000) })}
                suffix="× CUB"
                min={0.5}
                max={3}
                hint="O CUB não cobre tudo; 1,2 a 1,4 é comum."
              />
              <PercentField label="Imprevistos" bps={inputs.build.contingencyBps} onBps={(b) => setB({ contingencyBps: b })} />
              <IntField label="Meses de obra" value={inputs.schedule.buildMonths} onChange={(n) => setS({ buildMonths: n })} min={1} max={120} suffix="meses" />
              <IntField label="Meses para vender" value={inputs.schedule.monthsToSell} onChange={(n) => setS({ monthsToSell: n })} max={120} suffix="meses" />
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg">Venda e imposto</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MoneyField label="Preço de venda" cents={inputs.sale.priceCents} onCents={(c) => setV({ priceCents: c, mode: "total" })} required />
              <PercentField label="Corretagem na venda" bps={inputs.sale.brokerageBps} onBps={(b) => setV({ brokerageBps: b })} />
              <SelectField
                label="Imposto"
                value={inputs.tax.regime}
                onChange={(v) => update((i) => ({ ...i, tax: { regime: v, rateOverrideBps: null } }))}
                options={TAX_REGIMES.map((t) => ({ value: t, label: TAX_LABELS[t] }))}
              />
              <PercentField label="Sua TMA" unit="% a.m." bps={inputs.bench.tmaAmBps} onBps={(b) => update((i) => ({ ...i, bench: { ...i.bench, tmaAmBps: b } }))} hint="Quanto o dinheiro precisa render por mês." />
            </div>
          </Card>
          <p className="text-sm text-text-muted">
            Financiamento, curva de desembolso, cenários e fluxo mês a mês ficam no projeto salvo.
          </p>
        </form>

        <aside id="resultado-calc" className="grid scroll-mt-[var(--layout-header-height)] content-start gap-4 lg:sticky lg:top-[calc(var(--layout-header-height)+var(--space-6))]" aria-label="Resultado">
          <VerdictCard result={r} />
          {r?.ok && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Kpi label="Custo total" value={formatBRL(r.totalCost)} />
                <Kpi label="Caixa necessário" value={formatBRL(r.maxExposure)} />
                <Kpi label="ROI s/ caixa" value={formatPct(r.roi, 1)} negative={r.roi < 0} />
                <Kpi label="VPL na TMA" value={formatBRL(r.npvAtTma)} negative={r.npvAtTma < 0} />
              </div>
              <Card>
                <Label className="mb-3">Retorno ao mês</Label>
                <BenchmarkBars r={r} />
              </Card>
              <MaxLand inputs={inputs} r={r} />
            </>
          )}
        </aside>
      </div>

      <MobileResultBar r={r} href="#resultado-calc" />

      <Modal open={saveOpen} onOpenChange={setSaveOpen} title="Salvar este estudo" description="Dê um nome para achar depois. Dá para mudar quando quiser.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="grid gap-5"
        >
          <TextField label="Nome do projeto" value={name} onChange={setName} hint="Ex.: Sobrado Rua das Flores" />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default function CalcularPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[24rem] w-full" />}>
      <QuickCalculator />
      <p className="mt-6 text-sm text-text-muted">
        Já tem conta? <ButtonLink href="/projetos" variant="ghost" size="sm">Ver meus projetos</ButtonLink>
      </p>
    </Suspense>
  );
}
