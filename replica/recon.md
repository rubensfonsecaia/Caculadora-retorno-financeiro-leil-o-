# Recon map: Calculadora de retorno de construção (web + mobile)

Scope: viabilidade financeira de **construir para vender** (comprar terreno,
construir casa/sobrado/geminadas e vender). Fora do escopo: incorporação
vertical com vendas na planta, construir para alugar.
For: produto para vender (SaaS web + app mobile) a pequenos construtores,
investidores e engenheiros/arquitetos que fazem estudos para clientes.
Date: 2026-10-18

> **Não há um "original" único.** O usuário pediu a *categoria*. Este mapa
> junta o que as ferramentas e estudos públicos da categoria fazem, mais a
> calculadora de leilão deste repositório (`index.html`, v12.0) como base de
> UX e de cálculo. Na `features.csv`, a coluna `original` = `yes` quer dizer
> "padrão da categoria, visto nas fontes"; `no` = algo que nenhuma fonte
> mostrou e que entra como diferencial.

## Limitações desta recon (honestas)

- A rede deste ambiente bloqueia abrir páginas: só a busca web funcionou. As
  fontes abaixo foram lidas **pelos resumos da busca**, não página a página.
  Nenhuma tela de concorrente foi vista nem capturada; `replica/screens/` está
  vazio. Confiança de UX dos concorrentes: baixa. Confiança das regras de
  negócio (custos, indicadores, impostos): média.
- A busca **não encontrou** um app brasileiro dedicado a "construir para
  vender" que junte terreno + obra + financiamento + venda + impostos + TIR.
  As ferramentas achadas são (a) calculadoras de custo por m² (CUB), (b) ERPs
  de construtora com módulo de viabilidade (Sienge, Totvs, VIABIL), voltados
  a empresas grandes, (c) planilhas e TCCs, (d) app de métricas em inglês
  (metrique, iOS). Isso é um sinal de lacuna de mercado, mas ainda não foi
  validado com usuários: rodar `/replica-entrepreneur` antes de apostar nisso.
- Valores de impostos vêm de fóruns contábeis antigos (2011–2018) e de um
  artigo recente sobre ganho de capital. Precisam de revisão de um contador
  antes de virar regra no produto.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | base: calculadora de leilão (este repo) | `index.html` | UX de uma tela, sliders, veredito, TIR/MoC, TMA vs Selic, PF 15% vs PJ RET 4%, PDF. Confiança alta |
| 2 | calculadora custo m² (CUB) | https://calculacentro.com/ferramenta/custo-construcao | área × CUB × padrão. Página exige JS, não verificada |
| 3 | calculadora custo m² (CUB) | https://sum.money/br/custo-construcao/ | área × CUB/m² do estado × 1,4 (premissa própria) |
| 4 | calculadora custo m² (CUB) | https://hacecuentas.com/pt/custo-obra-por-m2-quanto-custa-construir-casa-cub | faixa sobre o CUB por padrão de acabamento; lista o que o CUB não cobre |
| 5 | tabela CUB oficial | https://sinduscon-mg.org.br/wp-content/uploads/2025/02/tabela_cub_fevereiro_2025.pdf | NBR 12.721; mensal, por estado e padrão (R1, R8, PP…) |
| 6 | ERP com viabilidade | https://sienge.com.br/guia-de-estudo-de-viabilidade/ | estudo na etapa inicial, legislação, dados de mercado |
| 7 | ERP com viabilidade | https://sienge.com.br/blog/viabilidade-economica-da-obra-x-preco-de-venda-como-equilibrar/ | VGV, vários cenários |
| 8 | ERP com viabilidade (2010) | https://www.baguete.com.br/noticias/totvs-calcula-viabilidade-de-construcoes | custo-alvo, payback, VPL, TIR, fluxo de caixa |
| 9 | TCC (cita VIABIL / BDK) | https://repositorio.ufc.br/ri/bitstream/riufc/68796/1/2016_tcc_ecerqueirajunior.pdf | software mais difundido em construtoras grandes |
| 10 | TCC IFSC, 3 casas geminadas | https://repositorio.ifsc.edu.br/handle/1/1836 | cenários esperado / −5% preço / −10% preço +10% custo; 1–6 meses p/ vender; TIR vs TMA |
| 11 | TCC UFRGS, casas populares | https://lume.ufrgs.br/handle/10183/77441 | VPL, TIR, payback simples e descontado |
| 12 | TCC UFPB, casas geminadas | https://repositorio.ufpb.br/jspui/handle/123456789/24740 | BDI com lucro 15%; terreno ≈ metade do preço de venda |
| 13 | guia prático 2026 | https://clickpetroleoegas.com.br/construir-casas-para-vender-em-2026-ainda-vale-a-pena-6-decisoes-criticas-que-separam-lucro-de-prejuizo-no-minha-casa-minha-vida-e-no-mercado-imobiliario-local-flpc96/ | itens da planilha; contingência 30–40% p/ iniciantes |
| 14 | guia QuintoAndar | https://www.quintoandar.com.br/guias/?p=2449995 | "vale a pena construir para vender" |
| 15 | cronograma físico-financeiro | https://www.orcafascio.com/papodeengenheiro/cronograma-fisico-financeiro | desembolso mês a mês |
| 16 | curva S | https://www.udesc.br/arquivos/udesc/id_cpmenu/10352/AULA_08___GEST_O_DE_RECURSOS___CURVA_S_15592521035419_10352.pdf | limites de caixa |
| 17 | impostos PF x PJ | https://www.contabeis.com.br/forum/tributos-federais/139364/pessoa-fisica-construindo-e-vendendo-casas/ | ganho de capital 15%; habitualidade equipara a PJ (antigo) |
| 18 | impostos PJ / RET | https://www.contabeis.com.br/forum/tributos-federais/68288/construcao-e-venda-de-imoveis-impostos/ | RET com afetação; MCMV 1% (antigo, verificar) |
| 19 | ganho de capital (recente) | https://amdjus.com.br/imposto-sobre-venda-de-imovel-como-funciona/ | 15% até R$ 5 mi |
| 20 | app iOS de métricas | https://apps.apple.com/be/app/metrique/id6450452792 | do terreno à análise de rentabilidade; EUR; não aberto |
| 21 | pró-forma EUA (spec home) | https://www.adventuresincre.com/product/proforma-de-construccion-de-viviendas-particulares-para-constructores-residenciales/ | margem, lucro líquido, TIR. Não aberto |

## Core loop

Digitar terreno, obra, prazo, financiamento e preço de venda de uma casa e
receber, na hora, **lucro líquido, TIR, margem e um veredito "vale / não vale"**,
mais o **preço máximo que dá para pagar no terreno**. É isso que se paga.

## Screens

Web e mobile têm as mesmas telas; no mobile o formulário vira passos e os
resultados ficam numa barra fixa embaixo.

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Landing | `/` | explicar o produto, levar à calculadora grátis | hero, demo, preços, FAQ | filled |
| S02 | Calculadora rápida (sem conta) | `/calcular` | o core loop em uma tela, como a de leilão | campos moeda/%, sliders, veredito, KPIs | empty (padrões), filled, inválido, prejuízo |
| S03 | Cadastro / login | `/entrar` | criar conta para salvar | e-mail + senha, Google, magic link | empty, error, loading |
| S04 | Meus projetos | `/projetos` | lista de estudos salvos | cards/tabela, busca, filtro, duplicar, excluir | empty, filled, loading |
| S05 | Projeto: Terreno | `/projetos/:id/terreno` | custo de aquisição | valor, ITBI, escritura, registro, corretagem de compra, área do terreno | empty, filled, error |
| S06 | Projeto: Obra | `/projetos/:id/obra` | custo de construção | área construída, estado + padrão CUB, CUB/m² (auto/manual), fator real, projetos/alvará/habite-se, ligações, muro, BDI, contingência | empty, filled, CUB desatualizado |
| S07 | Projeto: Prazo e cronograma | `/projetos/:id/prazo` | quando o dinheiro sai | meses de obra, curva de desembolso (linear / curva S / manual), meses para vender | filled, manual |
| S08 | Projeto: Financiamento | `/projetos/:id/financiamento` | capital próprio x banco | % financiado, taxa a.a., liberação por medição, carência, sistema (SAC/Price) | sem financiamento, com financiamento |
| S09 | Projeto: Venda | `/projetos/:id/venda` | receita | preço alvo (total ou R$/m²), corretagem de venda, desconto de negociação, nº de unidades | filled |
| S10 | Projeto: Tributação | `/projetos/:id/impostos` | imposto sobre o lucro | PF ganho de capital 15%, PJ lucro presumido, PJ RET, isento; aviso de habitualidade | cada opção, aviso |
| S11 | Resultado | `/projetos/:id/resultado` | a resposta | veredito, lucro líquido, margem s/ venda, ROI s/ capital, TIR mensal/anual, VPL, MoC, payback, TMA x Selic x CDI, composição do capital, preço máx. do terreno | viável, marginal, inviável |
| S12 | Fluxo de caixa | `/projetos/:id/fluxo` | mês a mês | tabela por mês, gráfico de caixa acumulado e exposição máxima | filled |
| S13 | Cenários / sensibilidade | `/projetos/:id/cenarios` | e se der errado | esperado/pessimista/muito pessimista, tornado (preço, custo, prazo), ponto de equilíbrio | filled |
| S14 | Comparar projetos | `/comparar` | escolher entre terrenos/projetos | 2–4 colunas lado a lado | <2 projetos, filled |
| S15 | Relatório PDF / compartilhar | botão em S11 | mandar a sócio, banco, cliente | PDF com marca do usuário, link público só leitura | gerando, pronto, erro |
| S16 | Configurações e premissas padrão | `/config` | TMA, Selic, CUB do estado, regime fiscal padrão, logo | formulário | filled |
| S17 | Planos e cobrança | `/planos`, `/conta/assinatura` | assinar, cancelar | tabela de planos, Stripe Checkout/Portal | free, pago, vencido |

## Flows

```
F01 Estudo rápido sem conta (o core loop)
    S01 -> S02 (preenche ~8 campos) -> veredito na mesma tela
    happy path clicks: 2 + digitação (alvo a bater: resultado sem apertar "calcular")
    edge: campos vazios, preço de venda < custo (prejuízo), TIR sem solução,
          valores absurdos (área 0, taxa 500%), vírgula x ponto decimal

F02 Salvar e detalhar um projeto
    S02 -> "salvar" -> S03 (cadastro) -> S04 -> S05..S10 -> S11
    happy path clicks: ~10
    edge: sessão expira no meio, dados do S02 não podem se perder no cadastro,
          offline no mobile, voltar/avançar entre abas sem perder dados

F03 Quanto posso pagar no terreno?
    S11 -> "preço máximo do terreno" (meta de TIR = TMA ou margem alvo)
    happy path clicks: 1
    edge: nenhuma meta atingível (mesmo terreno grátis não dá)

F04 Testar cenários
    S11 -> S13 -> ajusta % de preço/custo/prazo
    happy path clicks: 2
    edge: cenário que zera ou inverte o lucro, prazo de venda muito longo

F05 Comparar dois terrenos
    S04 -> seleciona 2 -> S14
    happy path clicks: 3
    edge: projetos com regimes fiscais diferentes, só 1 projeto

F06 Mandar o estudo para alguém
    S11 -> S15 -> PDF ou link
    happy path clicks: 2
    edge: link público aberto por quem não tem conta, revogar link

F07 Assinar e cancelar
    S17 -> Stripe Checkout -> volta -> S17 -> Portal -> cancelar
    happy path clicks: 4 / cancelar em 2
    edge: pagamento recusado, limite do plano free (nº de projetos)
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Campo moeda (R$) | normal, abreviado (R$ 1,2 mi) | vazio, foco, inválido, desabilitado | S02, S05–S10 |
| Campo % | a.m., a.a., sobre valor | idem | S02, S05–S10 |
| Slider + campo ligado | moeda, % | arrastando, foco | S02, S08, S13 |
| Botões de % rápida | 10%…100% | ativo, inativo | S08 (entrada) |
| Toggle Auto / Manual | ⚡ estimar, ✎ manual | auto, manual | S06 (CUB), S07 |
| Seletor de estado + padrão CUB | lista UF, R1-B/N/A, PP, R8… | carregando, desatualizado | S06, S16 |
| Seletor de regime fiscal | PF 15%, PJ presumido, RET, isento | com aviso | S10, S16 |
| Card de veredito | viável, marginal, inviável | — | S02, S11 |
| KPI tile | moeda, %, múltiplo | positivo, negativo | S02, S11, S14 |
| Gráfico de barras comparativo | TIR x TMA x Selic x CDI | — | S11 |
| Gráfico de composição do capital | pizza/barra empilhada | — | S11 |
| Gráfico de caixa acumulado | linha | com/sem financiamento | S12 |
| Tabela mês a mês | — | rolagem horizontal no mobile | S12 |
| Tornado de sensibilidade | — | — | S13 |
| Abas/passos do projeto | abas (web), stepper (mobile) | completo, incompleto, erro | S05–S13 |
| Card de projeto | — | viável/inviável, arquivado | S04 |
| Memorial de cálculo | colapsável | aberto, fechado | S11, S15 |
| Modal de confirmação | excluir, sair sem salvar | — | S04, S05–S10 |
| Toast | sucesso, erro | — | todas |
| Nav | topo (web), barra inferior (mobile) | logado, deslogado | todas |

## Inferred data model

```
User         id, email, name, plan, default_tma_am, default_selic_aa,
             default_uf, default_tax_regime, logo_url
             evidence: S16, S17; padrões da calc de leilão (TMA, Selic)
             confidence: high

Project      id, user_id, name, address, status (rascunho|estudo|em obra|vendido),
             units (int), created_at, updated_at
             evidence: S04, F02, F05
             confidence: high

LandCost     project_id, price, itbi_pct, deed_pct, registry_pct,
             buy_brokerage_pct, land_area_m2, other_costs
             evidence: S05; ITBI/escritura/registro da calc de leilão; fontes 12, 13
             confidence: high

BuildCost    project_id, built_area_m2, uf, cub_standard, cub_value_m2,
             cub_mode (auto|manual), cub_ref_month, real_cost_factor,
             projects_permits, utilities, extras, bdi_pct, contingency_pct
             evidence: S06; fontes 2–5, 12, 13
             confidence: high

Schedule     project_id, build_months, spend_curve (linear|s_curve|manual),
             manual_curve (json: % por mês), months_to_sell
             evidence: S07; fontes 10, 15, 16
             confidence: medium

Financing    project_id, financed_pct, rate_aa, release (upfront|per_measure),
             grace_months, amortization (SAC|PRICE)
             evidence: S08; calc de leilão (SBPE, Price); "juros de obra" fonte 13
             confidence: medium (plano empresário/apoio à produção: guess)

Sale         project_id, price_total, price_m2, sell_brokerage_pct,
             negotiation_discount_pct
             evidence: S09; fontes 10, 12
             confidence: high

Tax          project_id, regime (pf_ganho_capital|pj_presumido|pj_ret|isento),
             rate_override_pct
             evidence: S10; calc de leilão (PF 15%, RET 4%); fontes 17–19
             confidence: medium (alíquotas precisam de contador)

Scenario     id, project_id, name, price_delta_pct, cost_delta_pct,
             build_delta_months, sell_delta_months
             evidence: S13; fonte 10 (−5% / −10% +10%)
             confidence: high

Result       calculado, não salvo (ou cache): total_cost, profit, margin_pct,
             roi_pct, irr_am, irr_aa, npv, moic, payback_months,
             max_exposure, max_land_price, verdict
             evidence: S11; calc de leilão (TIR, MoC, ROI, veredito, lance teto)
             confidence: high

ShareLink    id, project_id, token, created_at, revoked_at
             evidence: F06
             confidence: guess

CubTable     uf, standard, ref_month, value_m2, source_url
             evidence: fonte 5 (mensal, por estado)
             confidence: high
```

Relationships: User 1-n Project; Project 1-1 LandCost, BuildCost, Schedule,
Financing, Sale, Tax; Project 1-n Scenario; Project 1-n ShareLink;
BuildCost n-1 CubTable (por uf + padrão + mês).

## Feature matrix

See `features.csv`. Must: 20, should: 14, could: 9, skip: 3.

## Out of scope (cannot or should not be cloned)

- Dados de mercado proprietários dos ERPs (preço de venda por bairro, base de
  legislação urbana em 3D do Sienge): são dados que eles têm, não funções.
  Alternativa: o usuário digita o preço por m² da pesquisa dele.
- Tabelas CUB de todos os estados em tempo real: cada Sinduscon publica a sua,
  em PDF, todo mês. Dá para manter uma tabela própria atualizada à mão ou por
  importação, mas sem integração "oficial".
- Orçamento detalhado de obra (SINAPI item a item, quantitativos): é outro
  produto (orçamento), não viabilidade. Fica como estimativa por m².
- Parecer fiscal: o app calcula com a alíquota escolhida e avisa sobre
  habitualidade; não substitui contador.
- Incorporação vertical e aluguel: fora do slice escolhido.

## Size

Screens 17, flows 7, entities 12. Hard parts: (1) fluxo de caixa mensal com
curva de desembolso + liberação do financiamento por medição, e TIR/VPL
robustos sobre ele; (2) regras fiscais PF x PJ x RET corretas e atualizadas;
(3) manter o CUB por estado/padrão/mês; (4) web + mobile com dados
sincronizados e uso offline. Payments (Stripe) é padrão.
Size: **M** (algumas semanas) para web + PWA. App nativo nas lojas soma ~uma
semana se feito com Expo reaproveitando a lógica de cálculo.
