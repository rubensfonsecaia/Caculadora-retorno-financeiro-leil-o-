"use client";

import { compute, defaultInputs, tornado } from "@calc/core";
import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { BenchmarkBars, CashFlowChart, CostComposition, Tornado } from "@/components/charts/charts";
import { MobileResultBar } from "@/components/project/result-bar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Label, PageTitle, SectionTitle, Skeleton } from "@/components/ui/card";
import { QuickPercent, RadioCards, Segmented, Slider } from "@/components/ui/choice";
import { MoneyField, NumberField, PercentField, SelectField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { Kpi, VerdictBadge, VerdictCard } from "@/components/ui/verdict";

// Primitivos isolados com dados de exemplo (o design system em código).
export default function DesignPage() {
  const base = defaultInputs();
  const r = compute(base);
  const marginal = compute({ ...base, sale: { ...base.sale, priceCents: 90_000_000 } });
  const bad = compute({ ...base, sale: { ...base.sale, priceCents: 70_000_000 } });
  const [money, setMoney] = useState(28_000_000);
  const [pct, setPct] = useState(300);
  const [slider, setSlider] = useState(60);
  const [quick, setQuick] = useState(3000);
  const [seg, setSeg] = useState<"auto" | "manual">("auto");
  const [regime, setRegime] = useState<"a" | "b">("a");
  const [modal, setModal] = useState(false);
  const toast = useToast();
  if (!r.ok) return null;

  return (
    <div>
      <PageTitle title="Design system" sub="Componentes com os tokens de replica/design. Dados de exemplo." />
      <SectionTitle>Botões</SectionTitle>
      <Card className="flex flex-wrap gap-3">
        <Button size="lg">Calcular</Button>
        <Button>Salvar</Button>
        <Button variant="secondary">Duplicar</Button>
        <Button variant="ghost">Ver memorial</Button>
        <Button variant="danger">Excluir</Button>
        <Button size="sm">Pequeno</Button>
        <Button loading>Salvando</Button>
        <Button disabled>Desabilitado</Button>
      </Card>

      <SectionTitle>Campos</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><MoneyField label="Preço do terreno" cents={money} onCents={setMoney} hint="Valor combinado." /></Card>
        <Card><PercentField label="ITBI" bps={pct} onBps={setPct} /></Card>
        <Card><NumberField label="Preço de venda" value={0} onChange={() => {}} prefix="R$" required /></Card>
        <Card><NumberField label="Obra (calculado)" value={512400} onChange={() => {}} prefix="R$" readOnly auto /></Card>
        <Card><SelectField label="Estado" value="SP" onChange={() => {}} options={[{ value: "SP", label: "SP" }]} /></Card>
        <Card><NumberField label="Área" value={140} onChange={() => {}} suffix="m²" digits={0} disabled /></Card>
      </div>

      <SectionTitle>Escolhas</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><Slider label="Parte financiada" value={slider} onChange={setSlider} min={0} max={100} step={5} valueText={`${slider}%`} /></Card>
        <Card><QuickPercent label="Entrada" value={quick} onChange={setQuick} steps={[1000, 2000, 3000, 5000, 10000]} /></Card>
        <Card><Segmented label="Origem do CUB" value={seg} onChange={setSeg} options={[{ value: "auto", label: "Tabela" }, { value: "manual", label: "Digitar" }]} /></Card>
      </div>
      <Card className="mt-4">
        <RadioCards label="Regime" value={regime} onChange={setRegime} options={[{ value: "a", title: "Pessoa física", text: "15% sobre o ganho" }, { value: "b", title: "Empresa: RET", text: "sobre a receita" }]} />
      </Card>

      <SectionTitle>Avisos</SectionTitle>
      <div className="grid gap-3 md:grid-cols-3">
        <Notice tone="info">O CUB não inclui terreno nem projetos.</Notice>
        <Notice tone="warn">O CUB desta tabela tem mais de 2 meses.</Notice>
        <Notice tone="error">A TIR não tem uma resposta única.</Notice>
      </div>

      <SectionTitle>Veredito e KPIs</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <VerdictCard result={r} />
        <VerdictCard result={marginal} />
        <VerdictCard result={bad} />
        <VerdictCard result={{ ok: false, missing: ["salePrice"] }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Lucro" value="R$ 182.300" />
        <Kpi label="ROI" value="34,8%" />
        <Kpi label="VPL" value="−R$ 12.400" negative />
        <Kpi label="Payback" value="mês 14" hint="descontado: mês 14" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <VerdictBadge verdict="viavel" />
        <VerdictBadge verdict="marginal" />
        <VerdictBadge verdict="inviavel" />
        <VerdictBadge verdict={null} />
      </div>

      <SectionTitle>Gráficos</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><Label className="mb-3">Retorno ao mês</Label><BenchmarkBars r={r} /></Card>
        <Card><Label className="mb-3">De onde vem o custo</Label><CostComposition r={r} /></Card>
        <Card><Label className="mb-3">Caixa acumulado</Label><CashFlowChart r={r} /></Card>
        <Card><Label className="mb-3">Sensibilidade</Label><Tornado bars={tornado(base, r)} base={r.profit} /></Card>
      </div>

      <SectionTitle>Vazio, carregando, modal, toast</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><EmptyState icon={<FolderOpen />} title="Nenhum projeto" text="Faça um estudo e salve." action={<Button>Novo estudo</Button>} /></Card>
        <Card aria-busy><Skeleton className="mb-3 h-5 w-[5rem]" /><Skeleton className="mb-2 h-6 w-4/5" /><Skeleton className="h-4 w-3/5" /></Card>
        <Card className="flex flex-wrap content-start gap-3">
          <Button variant="secondary" onClick={() => setModal(true)}>Abrir modal</Button>
          <Button variant="secondary" onClick={() => toast("success", "Projeto salvo.")}>Toast</Button>
          <Button variant="secondary" onClick={() => toast("error", "Sem conexão.")}>Toast de erro</Button>
        </Card>
      </div>
      <Modal open={modal} onOpenChange={setModal} title="Excluir “Sobrado”?" description="Não dá para desfazer.">
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => setModal(false)}>Excluir</Button>
        </div>
      </Modal>
      <MobileResultBar r={r} href="/design" />
    </div>
  );
}
