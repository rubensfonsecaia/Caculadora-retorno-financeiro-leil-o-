# Architecture: Calculadora de retorno de construção (construir para vender)

Lê `replica/recon.md` e `replica/features.csv` (2026-10-18). Schema em
`replica/schema.sql`, testado num Postgres 16 local com um `auth` de mentira
igual ao do Supabase. Testes que passaram: profile criado no cadastro; limite
de 3 projetos no free; cliente não muda `plan`/`is_admin`; usuário B não lê
nem escreve nada do A (projetos, cenários, links); link público lê só com
token válido e não revogado.

## Ponto de partida

O repo hoje é um `index.html` único (HTML + JS puro + Chart.js) com a
calculadora de leilão. Ele **continua no ar como está**. O produto novo nasce
num monorepo ao lado, e as funções de cálculo que já funcionam
(`calcularTIR`, `saldoDevedorPrice`, `taxaJurosFinanciamento`, a busca
binária de `lanceTeto`) são portadas para TypeScript com testes, não
reescritas do zero.

## Stack

| layer | choice | why |
| --- | --- | --- |
| repo | pnpm + Turborepo: `apps/web`, `apps/mobile`, `packages/calc` | o motor de cálculo é o produto; um pacote só, usado igual na web, no mobile e no servidor |
| motor de cálculo | `packages/calc`: TypeScript puro, schemas zod, Vitest | roda no navegador (resultado ao digitar, offline) e no servidor (resumo salvo); testes "golden" travam os números |
| web | Next.js (App Router) + TypeScript, PWA | padrão bem documentado; PWA cobre o celular antes do app nas lojas |
| styling | Tailwind com tokens do `/replica-design` | sem hex solto nos componentes |
| gráficos | Recharts (web), Victory Native (mobile) | a calc de leilão usa Chart.js; Recharts encaixa melhor em React |
| mobile | Expo (React Native), **depois** da web | mesmo `packages/calc`; recon marca app nas lojas como `could` |
| database | Postgres no Supabase | um banco, RLS nativo, Auth e Storage no mesmo lugar |
| acesso a dados | supabase-js com o JWT do usuário + tipos gerados; SQL puro nas migrations (Supabase CLI) | as policies RLS valem em toda consulta; sem ORM que contorne a RLS |
| auth | Supabase Auth: e-mail + senha, magic link, Google | já vem com verificação, reset e sessões em cookie (`@supabase/ssr`) |
| payments | Stripe Checkout + Customer Portal, em BRL | sem formulário de cartão próprio; cancelar em 1 clique pelo Portal. Ver se Pix/boleto valem para assinatura na conta Stripe BR do usuário |
| email | Resend, como SMTP do Supabase Auth e para avisos | domínio próprio, templates novos |
| jobs | Vercel Cron | só 2 jobs leves; não precisa de fila |
| files | Supabase Storage, bucket privado `logos` | logo do usuário no PDF; PNG/JPG até 1 MB |
| PDF | página `/projetos/[id]/relatorio` com CSS de impressão (web) e `expo-print` (mobile) | a calc de leilão já exporta assim; sem servidor de PDF |
| hosting | Vercel | preview por PR, cron embutido |
| erros e analytics | Sentry + Plausible | Plausible não usa cookie, então não precisa de banner |

Um banco, sem microsserviços.

## Schema

Tables: 7 (`profiles`, `projects`, `scenarios`, `share_links`, `cub_values`,
`subscriptions`, `stripe_events`). Access rules: **RLS** em todas; só o
webhook do Stripe e os jobs usam a service role.

Decisões:

- **Entradas do estudo em `projects.inputs` (jsonb) + `inputs_version`**,
  validadas pelo mesmo schema zod do `packages/calc` no cliente e no servidor.
  O recon tinha 6 entidades 1-1 (LandCost, BuildCost, Schedule, Financing,
  Sale, Tax). Elas nunca são consultadas separadas, mudam junto com o motor e
  virariam 6 joins por tela. O que a lista S04 filtra ou ordena (nome, status,
  veredito, lucro, TIR, `updated_at`) é coluna de verdade, com índice.
- **Dinheiro em centavos** (`bigint`) + `currency`. Taxas em **basis points**
  (`integer`, 1% = 100) nas colunas; dentro do `inputs` também inteiros.
- **`Result` não é tabela**: é calculado. Só o resumo fica salvo para a lista.
- **Concorrência**: `projects.version`; o autosave manda a versão que leu e o
  update só aplica se bater (`where id = $1 and version = $2`).
- **Limite do plano free** (3 projetos ativos) num trigger que trava a linha
  do profile, então dois inserts simultâneos não furam o limite.
- **`plan` e `is_admin`** só mudam pela service role (trigger bloqueia o cliente).
- **Link público** por função `security definer` `get_shared_project(token)`:
  o `anon` não lê a tabela `projects`, só o projeto do token.
- **CUB** é tabela pública de leitura, única por `(uf, standard, ref_month)`,
  com `source_url` obrigatória; só admin escreve.

Formato do `inputs` (v1), definido em `packages/calc/src/schema.ts`:

```ts
{
  land:      { priceCents, itbiBps, deedBps, registryBps, buyBrokerageBps, areaM2, otherCents },
  build:     { builtAreaM2, uf, cubStandard, cubMode: 'auto'|'manual', cubM2Cents, cubRefMonth,
               realCostFactorBps, permitsCents, utilitiesCents, extrasCents, bdiBps, contingencyBps },
  schedule:  { buildMonths, spendCurve: 'linear'|'s_curve'|'manual', manualCurveBps: number[], monthsToSell },
  financing: { financedBps, rateAaBps, release: 'upfront'|'per_measure', graceMonths, system: 'SAC'|'PRICE' },
  sale:      { mode: 'total'|'per_m2', priceCents, priceM2Cents, brokerageBps, discountBps },
  tax:       { regime: 'pf_ganho_capital'|'pj_presumido'|'pj_ret'|'isento', rateOverrideBps? },
  bench:     { tmaAmBps, selicAaBps }
}
```

## API

A maioria das leituras é supabase-js direto do cliente (a RLS protege). As
escritas que precisam recalcular o resumo ou validar regras passam por
server actions.

### F01 Estudo rápido sem conta

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| GET `/calcular` | calculadora S02, cálculo 100% no cliente, rascunho no localStorage | qualquer um | — | página | F01 |
| GET `/api/cub?uf&standard` | último CUB/m² do estado e padrão | qualquer um (rate limit por IP) | uf, standard | `{valueM2Cents, refMonth, sourceUrl}` | F01, F02 |

### F02 Salvar e detalhar um projeto

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| GET `/auth/callback` | troca o código do OAuth/magic link por sessão | qualquer um | code | redirect | F02 |
| action `createProject` | cria projeto a partir do rascunho do S02 (não perde dados no cadastro) | logado | name, inputs | project | F02 |
| action `saveProject` | autosave: valida zod, recalcula resumo, grava se `version` bate | dono | id, version, inputs, name, status, units | project ou `conflict` | F02 |
| GET `/projetos` | lista S04 (ordem: `updated_at desc`) | dono | filtro status, busca | página | F02 |
| GET `/projetos/[id]/[aba]` | abas S05–S13 | dono | — | página | F02 |
| action `duplicateProject` | cópia com nome "(cópia)" | dono | id | project | F02 |
| action `deleteProject` / `archiveProject` | apaga ou arquiva (arquivado não conta no limite) | dono | id | ok | F02 |

### F03 Preço máximo do terreno · F04 Cenários

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| (cliente) `maxLandPrice()` | busca binária no preço do terreno até TIR = meta | — | inputs, meta | centavos ou `null` | F03 |
| action `upsertScenario` | cria/edita cenário | dono | projectId, deltas | scenario | F04 |
| action `deleteScenario` | — | dono | id | ok | F04 |

### F05 Comparar · F06 Compartilhar

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| GET `/comparar?ids=a,b,c` | 2–4 projetos lado a lado | dono de todos | ids | página | F05 |
| GET `/projetos/[id]/relatorio` | página de impressão / PDF com logo | dono | — | página | F06 |
| action `createShareLink` / `revokeShareLink` | link só leitura | dono | projectId / id | token / ok | F06 |
| GET `/p/[token]` | projeto compartilhado via `get_shared_project` | qualquer um (rate limit) | token | página ou 404 | F06 |

### F07 Assinar e cancelar · conta

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| POST `/api/stripe/checkout` | cria sessão do Checkout | logado | priceId | url | F07 |
| POST `/api/stripe/portal` | abre o Customer Portal (trocar, cancelar) | assinante | — | url | F07 |
| POST `/api/stripe/webhook` | atualiza `subscriptions` e `profiles.plan` | Stripe (assinatura verificada) | evento | 200 | F07 |
| action `updateProfile` | premissas padrão S16 | logado | campos do profile | profile | — |
| action `uploadLogo` | PNG/JPG ≤ 1 MB no bucket `logos` | logado | arquivo | path | F06 |
| action `deleteAccount` | cancela assinatura no Stripe, apaga Storage, apaga `auth.users` (cascade) | logado, com confirmação | — | ok | — |
| POST `/api/admin/cub/import` | importa CSV de CUB de um mês | admin | CSV (uf, standard, ref_month, valor, source_url) | linhas inseridas | — |

Webhooks in: Stripe (`checkout.session.completed`,
`customer.subscription.created|updated|deleted`, `invoice.payment_failed`).
Webhooks out: nenhum.

Jobs (Vercel Cron, rota protegida por `CRON_SECRET`):
- `cub-stale`, dia 10 de cada mês, 12:00 UTC: lista UF/padrão sem CUB dos
  últimos 2 meses e manda e-mail ao admin para importar.
- `stripe-reconcile`, diário 06:00 UTC: compara `subscriptions` com o Stripe
  e corrige diferenças (webhook perdido).

## The parts that bite

- **números e centavos**: o motor calcula em `number` (reais) e arredonda só
  na saída; o banco guarda centavos inteiros. Nunca somar valores já
  arredondados. Teste golden: os mesmos inputs dão os mesmos centavos na web,
  no mobile e no servidor.
- **TIR**: o Newton da calc de leilão pode não convergir ou achar uma raiz
  errada quando o fluxo troca de sinal mais de uma vez (obra com
  financiamento + venda + quitação). Usar Newton com fallback de bisseção num
  intervalo, e devolver `null` ("TIR indefinida") em vez de um número errado.
  Mostrar VPL, que sempre existe.
- **taxas a.a. ↔ a.m.**: sempre composta, `(1 + aa)^(1/12) − 1`. Nunca dividir por 12.
- **convenção de tempo**: mês 0 = compra do terreno; desembolso da obra no
  fim de cada mês; venda no fim do mês `buildMonths + monthsToSell`. Escrito
  no memorial de cálculo.
- **financiamento por medição**: juros sobre o saldo liberado durante a obra
  (juros de obra), carência, quitação do saldo devedor na venda. É a parte
  mais fácil de errar; tem que ter testes com casos feitos à mão numa planilha.
- **impostos**: na calc de leilão, PF = 15% sobre (venda − lance) e PJ RET =
  4% sobre a venda. Para obra, a base do ganho de capital PF inclui o custo da
  construção documentado, o que muda bastante o resultado. Alíquotas do
  presumido, RET e MCMV vêm de fontes antigas: ficam numa tabela versionada em
  `packages/calc/src/tax.ts` e só viram "oficiais" depois de um contador
  revisar. Mostrar o aviso de habitualidade (PF que vende sempre é equiparada
  a PJ).
- **CUB**: muda todo mês e por estado. Mostrar o mês de referência ao lado do
  valor e avisar quando tem mais de 2 meses.
- **formato pt-BR**: vírgula decimal, ponto de milhar, `R$`. Uma função de
  parse e uma de format no `packages/calc`, usadas em todo campo.
- **fuso**: só importa para "mês de referência" e datas de assinatura;
  exibir em `America/Sao_Paulo`, guardar em UTC.
- **idempotência**: o webhook grava `event.id` em `stripe_events` na mesma
  transação do efeito; evento repetido é ignorado.
- **corridas**: autosave de duas abas ou celular + computador → `version`
  otimista; no conflito, a tela pergunta qual manter. Limite do free tratado
  no banco.
- **rate limits**: Supabase Auth já limita login/cadastro; `/api/cub` e
  `/p/[token]` com limite por IP (Upstash ou middleware da Vercel).
- **uploads**: só PNG/JPG (SVG pode ter script), 1 MB, bucket privado,
  servido por URL assinada.
- **offline (mobile)**: a calculadora e o rascunho funcionam offline
  (cálculo local). Sincronização de projetos salvos é `could`; até lá, editar
  projeto salvo exige rede.
- **multi-tenancy**: v1 é um dono por projeto. Times entram depois trocando
  `user_id` por `org_id` nas policies.
- **LGPD**: exclusão de conta apaga tudo (cascade + Storage + cliente no
  Stripe), exportar dados em JSON, política de privacidade lista Supabase,
  Vercel, Stripe, Resend, Sentry, Plausible.

## Build order

1. **Vertical slice**: S02 com o mínimo (terreno, área × CUB manual, prazo,
   preço de venda, PF 15%) → veredito, lucro, TIR, VPL; S03 cadastro; salvar;
   S04 lista.
   Tables: `profiles`, `projects`. Routes: `/calcular`, `/auth/callback`,
   `createProject`, `saveProject`, `/projetos`.
   Antes de tudo: `packages/calc` com a TIR portada e testes golden contra a
   calc de leilão atual.
2. **Must-haves** (20):
   - terreno e obra completos (S05, S06), CUB automático (`cub_values`,
     `/api/cub`, import admin), custos fora do CUB, contingência;
   - venda e impostos (S09, S10: PF/RET/isento);
   - resultado completo (S11: margem, ROI, MoC, memorial);
   - PDF (`/relatorio`), duplicar/excluir, responsivo.
3. **Should-haves** (14):
   - curva de desembolso e financiamento por medição (S07, S08), fluxo mês a
     mês e exposição máxima (S12), payback;
   - TIR × TMA × Selic × CDI;
   - cenários (S13, `scenarios`), preço máximo do terreno (F03);
   - aviso de habitualidade, lucro presumido, BDI, várias unidades;
   - premissas padrão (S16);
   - planos e Stripe (S17, `subscriptions`, `stripe_events`, webhook,
     `stripe-reconcile`).
   Depois os **could** (9): comparar (S14), tornado, ponto de equilíbrio, link
   público (`share_links`, `/p/[token]`), logo no PDF, status do projeto,
   offline, app Expo nas lojas, custo real × previsto.
4. **Fixes from replica-entrepreneur**: ainda não rodou. Os diferenciais que o
   recon já viu (preço máximo do terreno, aviso de habitualidade, comparar)
   esperam a confirmação dele.

## Summary

- Stack: Next.js PWA + Expo depois, motor `packages/calc` em TS compartilhado,
  Supabase (Postgres + RLS + Auth + Storage), Stripe, Resend, Vercel.
- 7 tabelas, 23 rotas/actions (incluindo o webhook do Stripe), 2 jobs.
- Mais arriscado: (1) fluxo mensal com financiamento por medição e uma TIR
  que não erre; (2) regras de imposto PF × PJ × RET corretas; (3) manter o CUB
  em dia.
- Next: `/replica-design`.
