# Design system: calculadora de retorno de construção

Fonte das medidas: `index.html` (calculadora de leilão do próprio usuário,
v12.0). Não há telas de concorrentes (a rede bloqueou; ver `recon.md`). Como o
sistema de origem é do próprio usuário, os valores vieram dele, com quatro
correções de contraste (abaixo). O `/replica-brand` ainda troca a cor de
marca (`accent`) e o que mais quiser, mantendo os nomes dos papéis.

Arquivos:

| arquivo | o que é |
| --- | --- |
| `tokens.json` | fonte da verdade: cores (claro e escuro), tipo, espaço, raio, sombra, layout, gráfico |
| `build_tokens.py` | gera `tokens.css` e `tailwind.tokens.js`; rode depois de mudar `tokens.json` |
| `tokens.css` | custom properties; escuro por `prefers-color-scheme` e por `data-theme` |
| `tailwind.tokens.js` | `theme` do Tailwind: só papéis (`bg-surface`, `text-muted`), sem a paleta padrão |
| `primitives.html` | todos os componentes, isolados, em claro e escuro; prints em `screens/` |

Verificação:

```bash
python3 replica/design/build_tokens.py
python3 .claude/skills/replica-design/contrast.py replica/design/tokens.json   # claro: 31 pares, 0 falhas
# escuro: gerar uma cópia com color = color_dark e rodar o mesmo script (31 pares, 0 falhas)
```

## O que foi medido

- **Cores**: a calc de leilão usa slate (5 cinzas: 50, 100, 200, 400/500, 800/900),
  blue-600 como ação, emerald/rose/amber para status, e um cartão escuro
  (slate-900) para o veredito e os KPIs.
- **Tipo**: Inter (aberta, OFL: pode usar). Escala do Tailwind xs–4xl; muito
  peso 900 (`font-black`, 107 usos) nos números e títulos.
- **Espaço**: base 4 (Tailwind 1–10). **Raio**: lg 8, xl 12, 2xl 16, 3xl 24,
  pill. **Sombra**: `shadow-xl` nos cartões. **Layout**: `max-w-7xl` (1280),
  grade de 12 colunas a partir de `md` (768).

## Correções de contraste em relação à calculadora atual

| uso na calc atual | antes | razão | agora |
| --- | --- | --- | --- |
| rótulos de campo (`text-slate-400`, 17 usos) | `#94a3b8` em branco | 2,56:1 ✗ | `text-muted` `#475569`, 7,58:1 |
| borda de input (`border-slate-300`) | `#cbd5e1` em branco | 1,48:1 ✗ | `border-input` `#64748b`, 4,76:1 |
| texto verde (`text-emerald-600`) | `#059669` | 3,77:1 ✗ | `success` `#047857`, 5,48:1 |
| texto âmbar (`text-amber-600`) | `#d97706` | 3,19:1 ✗ | `warning` `#b45309`, 5,02:1 |

## Regras de uso

- Componentes usam só papéis. Nada de `#hex`, `slate-400` ou `px` soltos.
- Todo número de dinheiro, %, meses: `font-variant-numeric: tabular-nums`,
  alinhado à direita em tabelas.
- Status nunca só por cor: veredito tem ícone + palavra ("Viável",
  "Marginal", "Inviável"); valor negativo tem sinal "−" e não só vermelho.
- Alvo de toque ≥ 44 px. Foco visível: anel 2 px `focus` com 2 px de folga.
- Ícones: Lucide (ISC). Nenhum ícone, logo ou ilustração de terceiros.
- Escuro é um tema próprio (`color_dark`), não inversão automática.

## Componentes

```
Button
  variants  primary, secondary, ghost, danger
  sizes     sm 32px, md 40px, lg 48px (mobile: md e lg, alvo ≥ 44px)
  states    default, hover, active, focus-visible (anel 2px focus, offset 2px), disabled, loading
  tokens    primary: bg accent → accent-hover, text on-accent; secondary: bg surface, borda border-input,
            text text; ghost: text accent, hover accent-soft; danger: bg danger, text on-accent
            radius lg, type sm/700
  a11y      <button> de verdade; loading = aria-busy, spinner + rótulo mantido; disabled com motivo
            em texto perto (ex.: "preencha o preço de venda")
  used on   S01–S17
```

```
MoneyInput (campo R$)
  variants  normal; abreviado na leitura (R$ 1,2 mi) quando não está em foco
  sizes     altura 44px
  states    vazio (placeholder "0,00"), foco, preenchido, inválido, desabilitado, calculado (somente leitura)
  tokens    bg surface, borda border-input (1px), foco anel focus, erro borda danger + texto danger
            prefixo "R$" text-subtle; valor type base/700 tabular-nums
  a11y      <label for> visível (type label); inputmode="decimal"; aceita "1.234,56" e "1234.56";
            erro em aria-describedby; aria-invalid
  used on   S02, S05, S06, S08, S09
```

```
PercentInput (campo %)
  variants  % a.m., % a.a., % sobre valor (sufixo diz qual)
  sizes     altura 44px
  states    iguais ao MoneyInput, mais "auto" (valor vindo do sistema, ex. Selic) com selo
  tokens    iguais ao MoneyInput; sufixo text-subtle
  a11y      sufixo dentro do nome acessível ("Juros, por cento ao ano")
  used on   S02, S05–S10, S16
```

```
SliderField (slider ligado a um campo)
  variants  moeda, %
  states    default, arrastando, foco, desabilitado
  tokens    trilho surface-muted, preenchido accent, polegar surface + borda accent 2px, 24px
  a11y      <input type=range> nativo + campo de texto ao lado; setas mudam 1 passo, PageUp/Down 10;
            aria-valuetext formatado ("R$ 350 mil")
  used on   S02, S08, S13
```

```
QuickPercentButtons (atalhos 10%…100%)
  variants  —
  states    inativo, ativo (aria-pressed), foco
  tokens    inativo bg surface-muted text text-muted; ativo bg accent text on-accent; radius pill; type xs/700
  a11y      grupo com rótulo ("Entrada"); botões toggle com aria-pressed
  used on   S08
```

```
AutoManualToggle (⚡ Estimar / ✎ Manual)
  variants  —
  states    auto, manual, auto indisponível (ex.: CUB sem dado do estado)
  tokens    segmented control: trilho surface-muted, item ativo bg surface + shadow card
  a11y      radiogroup; ao trocar para manual, foco vai para o campo; em auto, o campo vira somente leitura
            e mostra a origem ("CUB SP R1-N, set/2026")
  used on   S06 (CUB), S07 (curva), S08 (Selic)
```

```
CubSelect (estado + padrão CUB)
  variants  UF (27), padrão (R1-B, R1-N, R1-A, PP-4, R8-N…)
  states    carregando, ok, desatualizado (> 2 meses: selo warning), sem dado
  tokens    select nativo estilizado como MoneyInput; selo warning-soft / warning
  a11y      <select> nativo; selo também em texto ("valor de jul/2026")
  used on   S06, S16
```

```
TaxRegimeSelect
  variants  PF ganho de capital 15%, PJ lucro presumido, PJ RET, isento
  states    default, com aviso (habitualidade), alíquota editada
  tokens    radio cards: bg surface, borda border; selecionado borda accent 2px + accent-soft
  a11y      radiogroup; aviso em role="note" ligado por aria-describedby
  used on   S10, S16
```

```
VerdictCard (veredito)
  variants  viável, marginal, inviável
  states    calculado, incompleto ("preencha X para ver o resultado"), TIR indefinida
  tokens    bg surface-inverse, text on-inverse, número type 4xl/900;
            viável success-on-inverse + ícone check-circle; marginal warning-on-inverse + alert-triangle;
            inviável danger-on-inverse + x-circle; radius 2xl, shadow raised
  a11y      região aria-live="polite" (anuncia só ao parar de digitar, debounce 600ms); palavra sempre escrita
  used on   S02, S11
```

```
KpiTile
  variants  moeda, %, múltiplo (1,35x), meses
  states    positivo, negativo (sinal "−"), indisponível ("—" + motivo no title/tooltip)
  tokens    em fundo claro: bg surface, rótulo type label text-muted, valor type 2xl/900 text;
            no cartão escuro: on-inverse / on-inverse-muted; radius xl
  a11y      <dl>: rótulo <dt>, valor <dd>; valor por extenso no nome acessível quando abreviado
  used on   S02, S11, S14
```

```
BenchmarkBars (TIR do projeto x TMA x Selic x CDI, ao mês)
  variants  horizontal (mobile), vertical (desktop)
  states    projeto acima / abaixo da TMA, TIR indefinida (sem barra do projeto, nota)
  tokens    projeto chart accent; benchmarks chart-neutral; linha de referência TMA tracejada text-subtle;
            grade border; rótulos text / text-subtle (nunca na cor da barra)
  a11y      rótulo direto em cada barra; tabela equivalente (toggle "ver tabela"); tooltip por barra
  used on   S11
```

```
CapitalComposition (de onde vem o custo: terreno, obra, docs/impostos, juros, corretagem)
  variants  barra empilhada única (padrão), lista com valores
  states    sem financiamento (sem fatia de juros)
  tokens    slots chart-1…5 em ordem fixa por categoria (terreno 1, obra 2, docs 3, juros 4, corretagem 5);
            2px de folga entre fatias em surface
  a11y      no claro, slots 3–5 < 3:1 no fundo → legenda + valores e % sempre visíveis ao lado; tabela
  used on   S11, S15
```

```
CashFlowChart (caixa acumulado mês a mês)
  variants  com e sem financiamento (2 séries: chart-1 e chart-2)
  states    exposição máxima marcada (ponto + rótulo "−R$ 412 mil, mês 7")
  tokens    linha 2px; área abaixo de zero sem preenchimento colorido; zero em text-subtle
  a11y      crosshair + tooltip; legenda com 2 séries + rótulo direto no fim de cada linha; tabela S12
  used on   S12
```

```
MonthlyTable (fluxo mês a mês)
  variants  —
  states    filled, rolagem horizontal no mobile (1ª coluna fixa)
  tokens    cabeçalho bg surface-muted type label; linhas border; negativos com "−"; total type sm/800
  a11y      <table> com <th scope>; legenda <caption>
  used on   S12, S15
```

```
TornadoChart (sensibilidade: preço, custo, prazo)
  variants  —
  states    filled
  tokens    divergente: piora diverging.low, melhora diverging.high, centro diverging.mid
  a11y      rótulo de valor em cada ponta; tabela equivalente
  used on   S13
```

```
ProjectTabs / Stepper
  variants  abas (≥ md), stepper com "próximo" (mobile)
  states    atual, completo (check), incompleto, com erro (ponto danger + texto)
  tokens    aba atual borda inferior 2px accent text text; outras text-muted; stepper barra accent
  a11y      tablist com setas; no mobile, "Passo 2 de 6: Obra" anunciado
  used on   S05–S13
```

```
ProjectCard
  variants  grade (desktop), lista (mobile)
  states    viável / marginal / inviável (selo com ícone), arquivado, carregando (skeleton)
  tokens    bg surface, borda border, radius xl, shadow card; nome type lg/700; resumo type sm text-muted
  a11y      cartão é um link único; ações (duplicar, excluir) em menu com rótulo
  used on   S04
```

```
MemorialPanel (como cada número foi calculado)
  variants  —
  states    fechado, aberto
  tokens    bg surface-muted, radius lg, type sm; fórmulas em mono
  a11y      <details>/<summary>
  used on   S11, S15
```

```
Modal
  variants  confirmação (excluir), sair sem salvar, conflito de versão
  states    aberto, enviando
  tokens    bg surface, radius 2xl, shadow raised; fundo rgba do text a 40%
  a11y      Radix Dialog: foco preso, Esc fecha, foco volta ao gatilho; título e descrição ligados
  used on   S04, S05–S10
```

```
Toast
  variants  sucesso, erro, info
  states    entrando, visível (5s; erro fica até fechar), saindo
  tokens    bg surface-inverse, text on-inverse, ícone na cor *-on-inverse; radius lg
  a11y      role="status" (sucesso/info) ou "alert" (erro); botão fechar
  used on   todas
```

```
EmptyState
  variants  sem projetos, comparar com < 2 projetos, sem cenários
  tokens    ícone Lucide 32px text-subtle, título type lg/700, texto text-muted, um Button primary
  a11y      título é heading
  used on   S04, S13, S14
```

```
Skeleton
  tokens    bg surface-muted, pulso de opacidade (motion base); sem animação com prefers-reduced-motion
  a11y      aria-hidden; o contêiner tem aria-busy
  used on   S04, S11, S12
```

```
Nav
  variants  barra superior (≥ md, 56px), barra inferior com 4 itens (mobile, 64px)
  states    logado, deslogado, item atual
  tokens    bg surface, borda border; atual text accent + indicador accent
  a11y      <nav aria-label>; aria-current="page"
  used on   todas
```

```
MobileResultBar (resultado fixo embaixo no mobile)
  variants  —
  states    incompleto, viável, marginal, inviável
  tokens    72px, bg surface-inverse, text on-inverse; veredito + lucro + TIR; toque abre S11
  a11y      botão com nome completo ("Viável, lucro R$ 182 mil, TIR 2,1% ao mês, ver detalhes")
  used on   S02, S05–S10 (mobile)
```

```
Notice (aviso em linha)
  variants  info (accent-soft/accent), aviso (warning-soft/warning), erro (danger-soft/danger)
  tokens    radius lg, borda esquerda 4px da cor, ícone + texto
  a11y      role="note"; erro de formulário vai também no campo
  used on   S06 (CUB velho), S10 (habitualidade), S11 (TIR indefinida)
```

## Primitivos em código

`primitives.html` mostra todos os componentes acima com os tokens reais, em
claro e escuro, a 1440 e 390 px. Prints em `replica/design/screens/`.
É a referência visual e o teste dos tokens. No `/replica-build`, cada
componente vira um componente React em `apps/web/components/ui/` sobre
Radix/shadcn (Dialog, Tabs, RadioGroup, Slider, Toggle), com estes mesmos
tokens, numa rota `/design`.
