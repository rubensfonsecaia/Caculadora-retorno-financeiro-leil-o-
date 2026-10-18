# Backend

Data: 2026-10-18. Stack do `architecture.md`: Supabase (Postgres + RLS + Auth +
Storage), Stripe, Resend, jobs na Vercel. Sem as chaves do Supabase o app
continua em modo demonstração (localStorage), com as mesmas telas.

## O que foi testado, e o que não

| parte | como foi testado | resultado |
| --- | --- | --- |
| migrations | `scripts/db-migrate.sh` num Postgres 16 local, com um `auth` imitando o do Supabase; rodar duas vezes não repete | ok |
| RLS | segundo usuário: 0 projetos, cenários, links e assinaturas de outro; não altera nada; não grava CUB (não admin), `job_runs`, `rate_limits`; não chama `hit_rate_limit` | ok |
| plano | service role (webhook) muda `plan`; o próprio usuário não consegue | ok |
| limite free | 4º projeto ativo recusado no banco (trigger com trava) | ok (no build anterior) |
| rate limit | 3ª tentativa numa janela de 2 é recusada | ok |
| webhook Stripe | 13 testes: checkout, criado/atualizado/cancelado, past_due, cliente sem metadata, cliente desconhecido, pagamento falhou (1 e-mail), evento repetido, falha no meio não marca o evento | ok |
| assinatura do webhook | biblioteca oficial do Stripe, offline: válida, corpo alterado, outro segredo, replay de 1 h | ok |
| rotas | webhook 400 sem/ com assinatura ruim e 200 com boa; cron 401 sem segredo, 404 job desconhecido | ok |
| segredos | build com chaves falsas marcadas: nenhuma no bundle do navegador | ok |
| modo Supabase (fumaça) | com URL falsa: tela de login completa, erro amigável, páginas pedem login, checkout 401, webhook 400, cron 401, `/auth/callback?next=//evil.com` não redireciona para fora | ok |
| **login, banco e storage de verdade** | **não testado**: a rede deste ambiente bloqueia as imagens Docker do Supabase local (CDN `d2glxqk2uabbnd.cloudfront.net`) | pendente |
| **Stripe de verdade (Checkout, Portal)** | **não testado**: precisa das suas chaves de teste | pendente |
| **envio de e-mail (Resend)** | **não testado**: precisa da sua chave e domínio | pendente |

Para testar de verdade na sua máquina: `supabase start`, `scripts/db-migrate.sh`
(ou `supabase db reset`), `node scripts/seed.mjs`, `stripe listen --forward-to
localhost:3000/api/stripe/webhook`, `pnpm --filter web dev`.

## O que você precisa fazer (contas e chaves são suas)

1. **Supabase**: criar o projeto (região São Paulo), copiar URL, chave anon e
   service role para `apps/web/.env.local` (modelo em `apps/web/.env.example`).
   Rodar `DATABASE_URL=… scripts/db-migrate.sh` ou `supabase db push`.
   - Authentication > URL Configuration: Site URL e `…/auth/callback` nos redirects.
   - Authentication > Emails: colar os 4 modelos de `supabase/templates/` e
     ligar SMTP do Resend (senão o Supabase manda poucos e-mails por hora, do domínio dele).
   - Authentication > Rate limits: conferir os valores de `supabase/config.toml`.
   - Backups: o plano pago do Supabase faz backup diário; no grátis, não. **Confirme
     antes do lançamento.**
2. **Google (login)**: criar o OAuth client no Google Cloud com o redirect
   `https://<projeto>.supabase.co/auth/v1/callback`, colar ID e segredo em
   Authentication > Providers > Google. Escopos: só `openid email profile`, que
   não exigem a verificação demorada do Google (só a tela de consentimento com
   nome, logo e política de privacidade).
3. **Stripe (modo teste)**: produto "Pro" com dois preços (mensal e anual, em
   BRL); Customer Portal com **cancelar ligado**; webhook para
   `/api/stripe/webhook` com os 5 eventos abaixo; chaves no `.env.local`.
   Conferir se Pix/boleto valem para assinatura na sua conta Stripe BR.
4. **Resend**: verificar o domínio (SPF/DKIM, vem no `/replica-deploy`), criar a
   chave, definir `EMAIL_FROM` e `ADMIN_EMAIL`.
5. **Vercel**: `CRON_SECRET` aleatório; os jobs estão em `apps/web/vercel.json`.
6. **Admin do CUB**: `update profiles set is_admin = true where id = '<seu id>';`
   no SQL editor, e importar a tabela em Conta.

## Auth

- [x] e-mail + senha com confirmação por e-mail (`/entrar` → Criar conta)
- [x] link de acesso por e-mail (magic link)
- [x] esqueci a senha → `/auth/nova-senha`
- [x] Google (OAuth com o app do usuário)
- [x] sessão em cookies http-only (`@supabase/ssr`), renovada no `middleware.ts`
- [x] sair, e sair de todos os aparelhos (`signOut({ scope: "global" })`)
- [x] `/auth/callback` aceita `code` e `token_hash`, e só redireciona para caminhos internos
- [x] exclusão de conta de verdade: apaga o cliente no Stripe (cancela a assinatura), o logo no Storage e o usuário (cascade: perfil, projetos, cenários, links)
- [ ] Apple: não há app nas lojas ainda; entra com o Expo
- Papéis: um dono por projeto; `is_admin` só para importar CUB (recon não tem times)

## Banco

- [x] migrations em `supabase/migrations/`, aplicadas por `scripts/db-migrate.sh` (ou `supabase db push`)
- [x] RLS em todas as tabelas; `stripe_events`, `rate_limits`, `job_runs` sem policy (só service role)
- [x] testado com segundo usuário (tabela acima)
- [x] seed: `scripts/seed.mjs` (2 usuários `@exemplo.invalid`, 2 projetos cada, CUB **fictício** com fonte `exemplo.invalid`); recusa rodar fora de localhost
- [ ] backups ligados: depende do plano do Supabase (passo 1)

## Pagamentos (Stripe, modo teste)

- [x] Checkout hospedado para assinar (mensal/anual), sem formulário de cartão
- [x] Customer Portal para trocar cartão e **cancelar em um clique**
- [x] webhook: assinatura verificada, idempotente (evento registrado depois do efeito; efeitos são upserts)
- [x] eventos: `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`, `invoice.payment_failed`
- [x] status em `subscriptions` + `profiles.plan`, escritos só pelo webhook; o app lê do banco
- [x] o plano Pro tira o limite de 3 projetos (trigger do banco)
- [ ] os outros itens do Pro listados em /planos (comparar 4, logo, links) **não estão bloqueados no plano grátis**: decidir no `/replica-launch` o que fica pago e aí bloquear no servidor

## E-mail e jobs

- [x] Resend pela API, do domínio do usuário; modelos novos em português com versão texto (`lib/email-templates.ts`); sem chave, não envia e avisa no log
- [x] e-mails do login: `supabase/templates/` (confirmação, link de acesso, nova senha, troca de e-mail)
- [x] jobs (`/api/cron/[job]`, protegidos por `CRON_SECRET`, horários em UTC):
  - `cub-stale`, dia 10, 12:00: avisa o admin de CUB com mais de 2 meses
  - `stripe-reconcile`, diário 06:00: corrige assinaturas se um webhook se perdeu
  - `prune`, diário 06:30: limpa janelas de rate limit
- [x] 3 tentativas com espera crescente; item que falha vai para `job_runs` como `dead_letter`

## Integrações

| integração | API oficial | escopos | revisão | limites |
| --- | --- | --- | --- | --- |
| Google login | Google Identity via Supabase Auth | `openid email profile` | só tela de consentimento (sem escopo sensível, sem verificação longa) | — |
| Stripe | API + Checkout + Portal | — | ativar a conta (dados da empresa) antes do modo live | 100 req/s em live |
| Resend | REST `/emails` | — | verificar domínio | plano grátis: 100 e-mails/dia |
| Sinduscon (CUB) | **não há API**: PDFs mensais por estado | — | — | importação manual com link da fonte |

## Checklist de segurança

- [x] segredos só em variáveis de ambiente; `.env*` no `.gitignore` (menos `.env.example`); `server-only` nos módulos com segredo; build verificado sem segredo no navegador
- [x] entrada validada no servidor com zod em toda escrita e rota (`app/actions.ts`, rotas do Stripe)
- [x] autorização em toda leitura e escrita: RLS + usuário conferido no servidor (`auth.getUser()`), testado com segundo usuário
- [x] rate limit: login/cadastro/e-mails pelo Supabase Auth (`config.toml`); checkout, portal, importar CUB, criar link, logo e excluir conta por `hit_rate_limit`
- [x] webhooks verificam assinatura (e recusam replay)
- [x] uploads: só PNG/JPG (assinatura do arquivo conferida, sem SVG), até 1 MB, bucket privado com URL assinada de 10 min
- [x] sem dados do usuário em URLs ou logs (logs só com códigos; e-mail nunca logado). Exceção conhecida: o token do link compartilhado está na URL, por definição (144 bits, revogável)
- [x] dependências auditadas: produção sem vulnerabilidades conhecidas (postcss do Next forçado para 8.5.28; vitest 3 → 4.1.11). Restam 2 só de build: `braces` (sem versão corrigida) e `postcss-selector-parser` do Tailwind 3 (corrigir exige Tailwind 4); ambos só leem o código do próprio projeto
- [ ] política de privacidade listando Supabase, Vercel, Stripe, Resend, Google, Sentry e Plausible: texto vem no `/replica-launch`, página no `/replica-deploy`
- [ ] desarquivar projeto não confere o limite do plano grátis (o trigger só olha inserção). Baixo risco; corrigir no `/replica-test`
