# Test plan: calculadora de retorno de construção

Build: `24562ef` e seguintes. Data: 2026-10-19. Ambiente: local, `next build` +
`next start`, modo demonstração (localStorage; os 2 projetos de exemplo são o
seed). Specs em `apps/web/e2e/`, um por fluxo. Em todo teste: falha com erro no
console, falha com resposta 5xx, e varredura de acessibilidade (axe, WCAG 2.2 AA)
em cada tela visitada.

Legenda de `auto`: **e2e** (Playwright), **unit** (Vitest, `packages/calc` ou
`apps/web/test`), **sql** (Postgres local com o `auth` imitado, ver
`backend.md`), **manual** (precisa de serviço real; lista no fim).

## F01 Estudo rápido sem conta

| case | type | steps | expected | auto |
| --- | --- | --- | --- | --- |
| F01-H1 | happy | abrir /calcular, ver resultado com os valores de exemplo, mudar preço de venda | veredito, lucro e TIR mudam ao digitar, sem botão "calcular" | e2e |
| F01-H2 | happy | recarregar a página | os números digitados continuam (rascunho) | e2e |
| F01-E1 | edge: vazio | apagar o preço de venda | "Falta pouco: preencha o preço de venda", campo marcado como obrigatório; nada de "R$ 0" de lucro | e2e |
| F01-E2 | edge: prejuízo | preço de venda abaixo do custo | veredito Inviável com valor negativo e sinal "−", sem quebrar | e2e |
| F01-E3 | edge: número inválido | digitar "abc", "1,2,3" | mensagem "Número inválido", último valor válido mantido | e2e |
| F01-E4 | edge: formatos | "1.234.567", "1234567,89", "R$ 900.000" | lidos corretamente em pt-BR | e2e + unit |
| F01-E5 | edge: valores absurdos | área 0, taxa 500% | aviso de obrigatório ou de máximo; nada de NaN/Infinity na tela | e2e |
| F01-E6 | edge: TIR sem solução | fluxo com mais de uma troca de sinal | "TIR indefinida", veredito pelo VPL | unit |
| F01-E7 | edge: celular | 390 px | sem rolagem horizontal, barra de resultado fixa leva ao resultado | e2e |
| F01-E8 | edge: teclado | só Tab/Enter | chega a todos os campos e ao botão salvar | e2e |
| F01-E9 | edge: sem armazenamento | localStorage bloqueado | calculadora funciona (sem rascunho) | e2e |
| F01-N1 | negative: rascunho corrompido | localStorage com JSON inválido | volta aos valores de exemplo, sem erro | e2e |

## F02 Salvar e detalhar um projeto

| case | type | steps | expected | auto |
| --- | --- | --- | --- | --- |
| F02-H1 | happy | calcular sem conta → Salvar → entrar → volta → nome → Salvar | resultado do projeto salvo com os mesmos números do rascunho | e2e |
| F02-H2 | happy | editar cada aba (terreno, obra, prazo, financiamento, venda, impostos) | "Salvo" aparece; resultado reflete a mudança; recarregar mantém | e2e |
| F02-E1 | edge: nome longo | nome de 60+ caracteres com emoji e acento | salva, aparece inteiro na lista, sem estourar o layout | e2e |
| F02-E2 | edge: nome vazio | salvar sem nome | "Estudo sem nome" | e2e |
| F02-E3 | edge: duplo clique | clicar duas vezes em Salvar no modal | um projeto só | e2e |
| F02-E4 | edge: duas abas | editar o mesmo projeto em duas abas | a segunda a salvar vê "mudou em outro lugar" e escolhe; nada é sobrescrito em silêncio | e2e |
| F02-E5 | edge: voltar / recarregar no meio | editar, recarregar antes do autosave | no máximo a última edição de < 1 s se perde; nada corrompe | e2e |
| F02-E6 | edge: limite do plano | ter 3 projetos ativos, salvar o 4º | mensagem do limite, nenhum projeto criado; arquivar libera | e2e |
| F02-E7 | edge: arquivar e desarquivar | desarquivar com 3 ativos | não pode passar de 3 ativos no plano grátis | e2e |
| F02-E8 | edge: id inválido | /projetos/nao-existe/resultado | "Projeto não encontrado" | e2e |
| F02-E9 | edge: outro usuário | usuário B abre o link do projeto de A | "Projeto não encontrado"; nada de A aparece | e2e (demo) + sql |
| F02-E10 | edge: sessão expirou | sair em outra aba, editar | pede para entrar de novo; nada é salvo em nome de ninguém | e2e |
| F02-E11 | edge: excluir | excluir projeto pelo modal | some da lista; o link direto dá "não encontrado" | e2e |
| F02-E12 | edge: celular e teclado | fluxo inteiro em 390 px e só teclado | completa | e2e |
| F02-N1 | negative: senha errada | entrar com senha errada | "E-mail ou senha incorretos." | manual |
| F02-N2 | negative: link expirado | abrir link de e-mail usado | "/entrar" com "O link expirou" | e2e (rota) |
| F02-N3 | negative: redirecionamento | `/entrar?next=//evil.com` e `/auth/callback?next=//evil.com` | fica no site | e2e |

## F03 Quanto posso pagar no terreno

| case | type | steps | expected | auto |
| --- | --- | --- | --- | --- |
| F03-H1 | happy | ver "Quanto dá para pagar no terreno" | teto pela TMA ≤ teto pela Selic ≤ teto sem prejuízo (quando TMA ≥ Selic) | e2e + unit |
| F03-E1 | edge: nem de graça | preço de venda muito baixo | "nem de graça" | e2e |
| F03-E2 | edge: conferência | pôr o terreno no valor do teto | VPL na TMA ≈ 0 | unit |

## F04 Testar cenários

| case | type | steps | expected | auto |
| --- | --- | --- | --- | --- |
| F04-H1 | happy | abrir Cenários | 3 cenários fixos, lucro piora em ordem; tornado; preço mínimo | e2e |
| F04-H2 | happy | criar, editar e excluir um cenário próprio | aparece, muda, some | e2e |
| F04-E1 | edge: nome repetido | dois cenários com o mesmo nome | mensagem clara | e2e |
| F04-E2 | edge: valores negativos | preço −90% | prejuízo, sem quebrar | e2e |

## F05 Comparar projetos

| case | type | steps | expected | auto |
| --- | --- | --- | --- | --- |
| F05-H1 | happy | /comparar com 2 projetos | tabela lado a lado, melhor de cada linha marcado (cor + texto para leitor de tela) | e2e |
| F05-E1 | edge: menos de 2 | 1 projeto ativo | estado vazio com chamada para fazer outro | e2e |
| F05-E2 | edge: 5º projeto | marcar 5 | fica com no máximo 4 | e2e |

## F06 Mandar o estudo para alguém

| case | type | steps | expected | auto |
| --- | --- | --- | --- | --- |
| F06-H1 | happy | Relatório → criar link → abrir | relatório só leitura igual ao do dono | e2e (demo) / manual (Supabase) |
| F06-H2 | happy | Imprimir | botão chama a impressão; layout de impressão sem navegação | e2e |
| F06-E1 | edge: revogar | desativar o link e abrir de novo | "Link indisponível" | e2e |
| F06-E2 | edge: token inventado | /p/abc | "Link indisponível" | e2e |
| F06-E3 | edge: incompleto | projeto sem preço de venda | relatório pede o dado em vez de gerar zeros | e2e |

## F07 Assinar e cancelar

| case | type | steps | expected | auto |
| --- | --- | --- | --- | --- |
| F07-H1 | happy | /planos → Assinar mensal → Checkout (cartão 4242…) → volta | plano Pro, limite some | manual |
| F07-H2 | happy | Gerenciar ou cancelar → Portal → cancelar | volta a grátis no fim do período | manual |
| F07-E1 | edge: webhook repetido / fora de ordem | reenviar evento | sem efeito duplicado | unit |
| F07-E2 | edge: assinatura inválida | POST no webhook sem/ com assinatura errada | 400, nada processado | unit (rota) |
| F07-E3 | edge: sem login | POST /api/stripe/checkout sem sessão | 401 | e2e |
| F07-N1 | negative: cartão recusado | `4000 0000 0000 0002` | Checkout mostra erro; plano não muda | manual |
| F07-N2 | negative: pagamento falhou depois | `4000 0000 0000 0341` na renovação | e-mail de pagamento falhou; plano cai ao virar past_due | manual + unit |

## Transversais (todas as telas)

| case | expected | auto |
| --- | --- | --- |
| X-1 | axe sem violações WCAG 2.2 AA em todas as telas, claro | e2e |
| X-2 | idem no tema escuro | e2e |
| X-3 | 390 e 1440 px sem rolagem horizontal | e2e |
| X-4 | nenhum erro no console, nenhuma resposta 5xx | e2e |
| X-5 | rotas protegidas: cron 401 sem segredo, checkout 401 sem sessão | e2e |
| X-6 | fuso: datas "Editado em" no fuso do navegador; meses do fluxo não dependem de fuso | e2e |

## Manual (precisa de serviço real; checklist para você)

Com Supabase, Stripe (teste) e Resend configurados (`replica/backend.md`):

1. Criar conta com e-mail e senha → chega o e-mail de confirmação (modelo novo, em português) → o link entra no app.
2. Senha errada → "E-mail ou senha incorretos." (F02-N1).
3. Link de acesso por e-mail → entra; usar o mesmo link de novo → "O link expirou".
4. Esqueci a senha → e-mail → nova senha → entra com ela.
5. Entrar com Google.
6. Sair de todos os aparelhos num navegador → o outro navegador é deslogado na próxima ação.
7. Dois usuários: B abre a URL de um projeto de A → "não encontrado" (F02-E9 em banco real).
8. Link compartilhado aberto numa janela anônima (F06-H1 real).
9. Logo: enviar PNG, ver no relatório; tentar um SVG renomeado para .png → recusado.
10. F07-H1, F07-H2, F07-N1, F07-N2 com os cartões de teste do Stripe; conferir `subscriptions` e `profiles.plan`.
11. Excluir conta → some o cliente no Stripe e o usuário no Supabase.
12. Jobs: chamar `/api/cron/stripe-reconcile` com o `CRON_SECRET` e ver a linha em `job_runs`.
