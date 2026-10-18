import { Check } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ProActions } from "@/components/billing/plan-actions";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Planos" };

// Preços e nomes saem do /replica-launch. Aqui só a estrutura.
const PLANS = [
  {
    name: "Grátis",
    price: "R$ 0",
    for: "Para testar uma ideia",
    items: ["Calculadora completa", "3 projetos salvos", "Cenários e fluxo de caixa", "Relatório para imprimir"],
    cta: <ButtonLink href="/calcular" variant="secondary" className="w-full">Começar</ButtonLink>,
  },
  {
    name: "Pro",
    price: "a definir",
    for: "Para quem constrói sempre",
    items: ["Projetos ilimitados", "Comparar até 4 projetos", "Relatório com a sua marca", "Links para sócio, banco ou cliente"],
    cta: (
      <Suspense>
        <ProActions />
      </Suspense>
    ),
  },
];

export default function PlanosPage() {
  return (
    <>
      <PageTitle title="Planos" sub="Cancele quando quiser, em um clique." />
      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((p) => (
          <Card key={p.name} className="flex flex-col">
            <h2 className="text-xl">{p.name}</h2>
            <p className="text-sm text-text-muted">{p.for}</p>
            <p className="my-4 text-3xl">{p.price}</p>
            <ul className="mb-6 grid flex-1 gap-2 text-sm">
              {p.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <Check aria-hidden className="h-5 w-5 flex-none text-success" />
                  {i}
                </li>
              ))}
            </ul>
            {p.cta}
          </Card>
        ))}
      </div>
      <Notice tone="info" className="mt-6">
        O pagamento é feito na página segura do Stripe; nenhum dado de cartão passa por aqui. Cancelar é um clique em “Gerenciar ou cancelar”. O preço final sai no lançamento.
      </Notice>
    </>
  );
}
