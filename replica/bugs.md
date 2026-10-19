# Bugs

Resumo: 10 reproduzidos (1 S1, 1 S2, 7 S3, 1 S4), 10 corrigidos em `3707451`. Nenhum S1 ou S2 aberto.

Build: `24562ef`. Navegador: Chromium 141 (Playwright 1.56.1), 1440×900 e 390×844,
modo demonstração. Só entra aqui o que foi reproduzido; o resto está em "A conferir".

### BUG-001: duas abas no mesmo projeto: a segunda grava por cima sem avisar (modo demonstração)

- Severity: S1 (perda de dados)
- Flow / case: F02 / F02-E4
- Screen: S09 (qualquer aba do projeto)
- Build: 24562ef  Browser / device: Chromium, 1440px

Steps
1. Entrar, salvar um projeto, abrir a aba Venda em duas abas do navegador.
2. Na aba 1, corretagem 4% → "Salvo".
3. Na aba 2, corretagem 7%.

Expected: aba 2 avisa "Este projeto mudou em outro lugar" e deixa escolher.
Actual: aba 2 mostra "Salvo" e grava 7% por cima; a edição da aba 1 some.
Evidence: `replica/bugs/BUG-001.png`; teste `F02-E4`.
Suspected cause: `local-repo.ts` guarda o banco em memória por aba (`memoryDb`) e nunca relê o localStorage; a versão comparada é a da cópia velha. No modo Supabase a versão vem do banco (não afetado).
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-002: desarquivar passa do limite de 3 projetos do plano grátis

- Severity: S2 (regra do plano quebrada, sem contorno)
- Flow / case: F02 / F02-E7
- Screen: S04
- Build: 24562ef  Browser / device: Chromium, 1440px

Steps
1. Conta grátis com 3 projetos ativos e 1 arquivado.
2. Arquivados → Desarquivar.

Expected: recusa com a mensagem do limite.
Actual: fica com 4 ativos.
Evidence: `replica/bugs/BUG-002.png`; teste `F02-E7`.
Suspected cause: o trigger `enforce_project_limit` só roda em INSERT; `saveProjectAction` e o repo local não conferem a troca de status.
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-003: rotas de servidor dão 500 quando o Supabase não está configurado

- Severity: S3
- Flow / case: F02-N2, F02-N3, F07-E3
- Screen: `/auth/callback`, `/api/stripe/checkout`, `/api/stripe/portal`
- Build: 24562ef

Steps
1. Rodar sem `NEXT_PUBLIC_SUPABASE_URL` (demonstração).
2. Abrir `/auth/callback?next=/projetos`, ou `POST /api/stripe/checkout`.

Expected: `/auth/callback` leva a `/entrar`; as APIs respondem 503 "não configurado".
Actual: 500 "Your project's URL and Key are required to create a Supabase client!".
Evidence: testes `F02-N2`, `F02-N3`, `F07-E3`; log do servidor.
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-004: a página fica sem título ao navegar pelas abas do projeto

- Severity: S3 (acessibilidade, WCAG 2.4.2)
- Flow / case: F02-H2, X-7
- Screen: S05–S13
- Build: 24562ef

Steps
1. Abrir um projeto e clicar nas abas.

Expected: cada tela com `<title>` ("Obra · Sobrado · Obra no Azul").
Actual: às vezes `document.title` vazio; axe acusa `document-title` (aparece em abas diferentes a cada rodada).
Evidence: teste `F02-H2` (axe), `X-7`.
Suspected cause: as telas do projeto são componentes de cliente sem `metadata`.
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-005: dois cenários com o mesmo nome no mesmo projeto (modo demonstração)

- Severity: S3
- Flow / case: F04 / F04-E1
- Screen: S13

Steps
1. Cenários → Novo cenário "Igual" → Salvar; repetir.

Expected: "Já existe um cenário com esse nome." (como o Supabase faz, pela `unique (project_id, name)`).
Actual: dois cenários "Igual".
Evidence: teste `F04-E1`.
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-006: prefixo/sufixo de campo somente leitura com contraste 4,34:1

- Severity: S3 (acessibilidade, WCAG 1.4.3)
- Flow / case: X-1
- Screen: S06 (CUB no modo tabela), `/design`

Steps
1. Campo somente leitura (fundo `surface-muted`) com "R$" ou unidade.

Expected: ≥ 4,5:1.
Actual: `text-subtle` sobre `surface-muted` = 4,34:1 (o par não estava na lista do `contrast.py`).
Evidence: teste `X-1/X-2` (axe `color-contrast`).
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-007: tabelas com rolagem lateral não recebem foco pelo teclado

- Severity: S3 (acessibilidade, WCAG 2.1.1)
- Flow / case: F04-H1, F05-H1 (390px)
- Screen: S12, S13, S14

Steps
1. Em 390px, abrir Cenários ou Comparar e usar só o teclado.

Expected: dá para focar a tabela e rolar com as setas.
Actual: a área com rolagem não é focável; quem usa teclado não vê as colunas da direita.
Evidence: `replica/bugs/BUG-007.png`; axe `scrollable-region-focusable`.
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-008: sessão encerrada em outra aba: só "Não salvou", sem pedir para entrar

Correção: na demonstração, a aba aberta percebe a saída na hora (evento `storage`) e mostra "Entre para ver seus projetos"; com Supabase, o indicador mostra "Sua sessão acabou; nada foi salvo. Entre de novo".

- Severity: S4
- Flow / case: F02 / F02-E10
- Screen: S05–S13

Steps
1. Projeto aberto numa aba; sair em outra; editar na primeira.

Expected: "Sua sessão acabou. Entre de novo" com link para entrar (nada é salvo — isso já está certo).
Actual: só "Não salvou".
Evidence: teste `F02-E10`.
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-009: legenda do tooltip do gráfico de caixa com contraste baixo

- Severity: S3 (acessibilidade, WCAG 1.4.3)
- Flow / case: X-1 (aba Fluxo, 390px, tooltip ativo)
- Screen: S12

Steps
1. Abrir Fluxo de caixa no celular e tocar no gráfico.

Expected: texto do tooltip ≥ 4,5:1.
Actual: o nome da série usa a cor da linha (`chart-1` sobre branco, 4,4:1).
Evidence: axe `color-contrast` em `.recharts-tooltip-item-name`.
Status: fixed in 3707451 (teste que falhava agora passa)

### BUG-010: sair da página logo depois de editar perde a edição sem avisar

- Severity: S3
- Flow / case: F02-H2 (achado ao rodar), F02-E5
- Screen: S05–S10

Steps
1. Mudar um campo do projeto e, em menos de 0,7 s, recarregar ou fechar a aba.

Expected: o navegador pergunta antes de sair (ou a edição é salva).
Actual: a edição some sem aviso (o autosave ainda estava esperando).
Evidence: teste `F02-H2` (regime voltou ao anterior depois de `goto`), `F02-E5` (`beforeunload` não era interceptado).
Status: fixed in 3707451 (teste que falhava agora passa)

## A conferir (não reproduzido ou fora do alcance deste ambiente)

- Login, e-mails, Google, Stripe e Storage reais: ver lista manual em `test-plan.md`.
- `/design` em tema escuro: o axe acusa contraste do sufixo dentro de um campo **desabilitado** (opacidade 50%). Campos inativos são isentos na WCAG 1.4.3; tratado como falso positivo (o teste ignora elementos com `aria-disabled`).
