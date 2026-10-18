import { compute, defaultInputs, formatBRLShort, formatPct } from "@calc/core";
import { BarChart3, Calculator, LineChart, Scale } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const STEPS = [
  { Icon: Calculator, title: "Digite o básico", text: "Terreno, metragem, custo por m², prazo e preço de venda." },
  { Icon: BarChart3, title: "Veja se vale", text: "Lucro depois do imposto, TIR, margem e quanto caixa você precisa." },
  { Icon: Scale, title: "Teste o pior caso", text: "Preço menor, obra mais cara, venda demorando: o projeto aguenta?" },
];

const FAQ = [
  {
    q: "De onde vem o custo da obra?",
    a: "Do CUB do Sinduscon do seu estado, multiplicado por um fator para o que o CUB não cobre, mais projetos, ligações e imprevistos. Você ajusta cada parte.",
  },
  {
    q: "O imposto está certo para o meu caso?",
    a: "O cálculo usa alíquotas de referência para pessoa física e empresa. Elas servem para estimar; a decisão do regime é com o seu contador.",
  },
  {
    q: "Preciso criar conta?",
    a: "Não para calcular. Só para salvar estudos e comparar.",
  },
];

export default function Home() {
  const ex = compute(defaultInputs());
  return (
    <div className="grid gap-9">
      <section className="grid items-center gap-8 py-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-accent">{APP_NAME}</p>
          <h1 className="text-3xl sm:text-4xl">{APP_TAGLINE}</h1>
          <p className="mt-4 text-lg font-normal text-text-muted">
            Uma calculadora para quem compra terreno, constrói e vende: lucro líquido, TIR, preço máximo do terreno e o que acontece se der errado.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/calcular" size="lg">
              Fazer um estudo grátis
            </ButtonLink>
            <ButtonLink href="/planos" size="lg" variant="secondary">
              Planos
            </ButtonLink>
          </div>
        </div>
        <Card className="grid gap-3" aria-hidden>
          <LineChart className="h-7 w-7 text-accent" />
          <p className="text-sm text-text-muted">Com os valores de exemplo da calculadora</p>
          {ex.ok && (
            <>
              <p className="text-4xl tabular-nums">{formatBRLShort(ex.profit)}</p>
              <p className="text-sm text-text-muted">
                de lucro em {ex.saleMonth} meses{ex.irrAm != null && `, TIR de ${formatPct(ex.irrAm, 1)} ao mês`}
              </p>
            </>
          )}
        </Card>
      </section>

      <section aria-labelledby="como">
        <h2 id="como" className="mb-4 text-2xl">
          Como funciona
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ Icon, title, text }, k) => (
            <li key={title}>
              <Card className="h-full">
                <Icon aria-hidden className="mb-3 h-6 w-6 text-accent" />
                <h3 className="text-lg">
                  {k + 1}. {title}
                </h3>
                <p className="mt-1 text-text-muted">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="mb-4 text-2xl">
          Perguntas
        </h2>
        <div className="grid gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-xl border border-border bg-surface p-4">
              <summary className="cursor-pointer font-bold">{f.q}</summary>
              <p className="mt-2 text-text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-surface-inverse p-8 text-on-inverse">
        <h2 className="text-2xl">Antes de comprar o terreno, faça a conta.</h2>
        <ButtonLink href="/calcular" size="lg" className="mt-4">
          Abrir a calculadora
        </ButtonLink>
      </section>
    </div>
  );
}
