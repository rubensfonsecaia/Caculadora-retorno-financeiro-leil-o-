# Build log

Data: 2026-10-18. Stack do `architecture.md`, com uma troca: pnpm workspaces
sem Turborepo (2 pacotes não pedem orquestrador; entra se o mobile vier).
Dados: camada falsa em `apps/web/lib/data/local-repo.ts` (localStorage), com
as mesmas assinaturas do `Repo` que o Supabase vai implementar.

Como rodar: `pnpm install`, `pnpm --filter web dev` (porta 3000),
`pnpm --filter @calc/core test`.

Verificação feita em todas as telas (Playwright, 1440×900 e 390×844):
sem rolagem horizontal, sem erro no console, prints em `clone-screens/`.
Fluxos testados de ponta a ponta: F01 (recalcula ao digitar), F02 (salvar sem
conta → entrar → volta → salvar → resultado), limite de 3 projetos, e F02 só
com teclado (foco entra no modal, anel de foco visível). Typecheck e lint
limpos. Motor: 37 testes com casos feitos à mão.

| ID | tela | status | o que falta | o que foi mais difícil |
| --- | --- | --- | --- | --- |
| — | `packages/calc` (motor) | done | SAC/Price depois da venda | TIR: a do leilão (Newton) pode achar raiz errada quando o fluxo troca de sinal mais de uma vez; agora varre e devolve "indefinida" se houver mais de uma raiz. Um valor esperado meu no teste estava errado (35,08%, não 30,28%); o motor estava certo |
| S01 | Landing | done | prova social (só com usuários reais, no /replica-launch) | o número de exemplo era inventado; agora é calculado com os valores padrão |
| S02 | Calculadora rápida | done | — | rascunho que sobrevive ao cadastro; premissas da conta só valiam para projetos de exemplo, corrigido |
| S03 | Entrar | partial | senha, magic link, Google, verificação: tudo no /replica-backend | — |
| S04 | Meus projetos | done | — | — |
| S05 | Terreno | done | — | — |
| S06 | Obra | partial | tabela CUB começa vazia; sem dado oficial embutido (de propósito: não invento números do Sinduscon). Import CSV com link da fonte em S16 | — |
| S07 | Prazo | done | — | — |
| S08 | Financiamento | partial | SAC/Price e prazo depois da venda | juros na carência capitalizados vs pagos |
| S09 | Venda | done | — | — |
| S10 | Impostos | done | revisão das alíquotas por contador | — |
| S11 | Resultado | done | — | — |
| S12 | Fluxo de caixa | done | — | tabela larga no celular |
| S13 | Cenários | done | — | — |
| S14 | Comparar | done | — | o `fieldset` e um `sr-only` absoluto alargavam a página no celular |
| S15 | Relatório / link | partial | logo do usuário no PDF; link público só abre no mesmo navegador até ter banco | — |
| S16 | Conta e premissas | done | upload de logo | — |
| S17 | Planos | partial | Stripe e preços | — |
| — | `/design` | done | — | — |

Coisas maiores do que pareciam:

- **Tema só de tokens no Tailwind**: substituir `spacing`, `maxWidth` e
  `colors` inteiros tira utilitários padrão (`max-w-full`, `mt-px`,
  `bg-*/40`). Achados pelo teste de largura; `maxWidth.full` voltou no config.
- **Imposto PF**: a base do ganho de capital inclui a obra comprovada, o que
  muda muito o resultado em relação à calc de leilão (que usava venda −
  lance). Faixas acima de R$ 5 mi incluídas.

Desvio do processo: o skill pede um commit por tela. As telas compartilham
os mesmos componentes (seções do formulário, resultado), então os commits
saíram por grupo: motor, casco + componentes + dados, telas.
