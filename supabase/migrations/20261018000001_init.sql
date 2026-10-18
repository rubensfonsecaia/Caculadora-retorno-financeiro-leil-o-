-- Calculadora de retorno de construção: schema inicial (Supabase / Postgres 15+).
-- Fonte da verdade do banco. replica/schema.sql é o plano que originou este arquivo.
-- Dinheiro em centavos (bigint) + currency. Datas em timestamptz (UTC).
-- Acesso: Row Level Security em todas as tabelas. O app usa supabase-js com o
-- JWT do usuário; só webhooks e jobs usam a service role (que ignora RLS).

create extension if not exists pgcrypto;

-- updated_at automático ------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- profiles: 1-1 com auth.users ------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text check (char_length(name) <= 120),
  plan text not null default 'free' check (plan in ('free','pro')),
  -- premissas padrão (S16), copiadas para cada projeto novo
  default_tma_am_bps integer not null default 100      -- 1,00% a.m. em basis points
    check (default_tma_am_bps between 0 and 10000),
  default_selic_aa_bps integer not null default 1500   -- 15,00% a.a.
    check (default_selic_aa_bps between 0 and 10000),
  default_uf char(2) check (default_uf ~ '^[A-Z]{2}$'),
  default_tax_regime text not null default 'pf_ganho_capital'
    check (default_tax_regime in ('pf_ganho_capital','pj_presumido','pj_ret','isento')),
  logo_path text,                                       -- Supabase Storage, bucket "logos"
  is_admin boolean not null default false,              -- importa a tabela CUB
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- cria o profile quando o usuário se cadastra
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name) values (new.id, new.raw_user_meta_data->>'name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- o usuário não pode se promover a pro/admin pelo cliente
create or replace function protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.plan := old.plan;
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on profiles
  for each row execute function protect_profile_columns();

-- projects --------------------------------------------------------------------
-- As entradas do estudo (terreno, obra, prazo, financiamento, venda, impostos)
-- ficam em `inputs` (jsonb) validado pelo schema zod de packages/calc, com
-- `inputs_version` para migrar formatos. Motivo: as 6 seções nunca são lidas
-- separadas, mudam junto com o motor de cálculo e seriam 6 joins por tela.
-- O que é filtrado/ordenado na lista (S04) vira coluna: nome, status, resumo.
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  address text check (char_length(address) <= 300),
  status text not null default 'estudo'
    check (status in ('rascunho','estudo','em_obra','vendido','arquivado')),
  units smallint not null default 1 check (units between 1 and 50),
  currency char(3) not null default 'BRL',
  inputs jsonb not null default '{}',
  inputs_version smallint not null default 1,
  -- resumo do resultado, recalculado no servidor a cada save (mesmo motor)
  verdict text check (verdict in ('viavel','marginal','inviavel')),
  profit_cents bigint,
  total_cost_cents bigint,
  irr_am_bps integer,                                   -- TIR mensal em basis points
  version integer not null default 1,                   -- concorrência otimista (autosave)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_updated on projects (user_id, updated_at desc);
create index projects_user_status on projects (user_id, status);
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

-- limite do plano free (3 projetos não arquivados). Trava a linha do profile
-- para que dois inserts simultâneos não passem do limite.
create or replace function enforce_project_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p text;
  n integer;
begin
  select plan into p from profiles where id = new.user_id for update;
  if p = 'free' then
    select count(*) into n from projects
      where user_id = new.user_id and status <> 'arquivado';
    if n >= 3 then
      raise exception 'plan_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger projects_limit before insert on projects
  for each row execute function enforce_project_limit();

-- scenarios (S13) -------------------------------------------------------------
create table scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  price_delta_bps integer not null default 0 check (price_delta_bps between -9000 and 9000),
  cost_delta_bps integer not null default 0 check (cost_delta_bps between -9000 and 9000),
  build_delta_months smallint not null default 0 check (build_delta_months between -24 and 60),
  sell_delta_months smallint not null default 0 check (sell_delta_months between -24 and 60),
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);
create index scenarios_project on scenarios (project_id, sort);
create index scenarios_user on scenarios (user_id);
create trigger scenarios_updated_at before update on scenarios
  for each row execute function set_updated_at();

-- share_links (F06): link público só leitura ---------------------------------
create table share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index share_links_project on share_links (project_id);
create index share_links_user on share_links (user_id);
create trigger share_links_updated_at before update on share_links
  for each row execute function set_updated_at();

-- leitura pública por token, sem expor a tabela inteira ao anon
create or replace function get_shared_project(p_token text)
returns table (name text, address text, units smallint, inputs jsonb,
               inputs_version smallint, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.name, p.address, p.units, p.inputs, p.inputs_version, p.updated_at
  from share_links s join projects p on p.id = s.project_id
  where s.token = p_token and s.revoked_at is null;
$$;
revoke all on function get_shared_project(text) from public;
grant execute on function get_shared_project(text) to anon, authenticated;

-- cub_values: tabela CUB por UF, padrão e mês (pública para leitura) ----------
create table cub_values (
  id uuid primary key default gen_random_uuid(),
  uf char(2) not null check (uf ~ '^[A-Z]{2}$'),
  standard text not null check (char_length(standard) between 2 and 12), -- R1-B, R1-N, R1-A, PP-4, R8-N...
  ref_month date not null check (extract(day from ref_month) = 1),
  value_m2_cents bigint not null check (value_m2_cents > 0),
  currency char(3) not null default 'BRL',
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (uf, standard, ref_month)
);
create index cub_latest on cub_values (uf, standard, ref_month desc);
create trigger cub_values_updated_at before update on cub_values
  for each row execute function set_updated_at();

-- subscriptions: espelho do Stripe, escrito só pelo webhook -------------------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  price_id text,
  status text not null
    check (status in ('incomplete','incomplete_expired','trialing','active',
                      'past_due','canceled','unpaid','paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();

-- stripe_events: idempotência do webhook (o Stripe reenvia eventos) -----------
create table stripe_events (
  id text primary key,                                  -- evt_...
  type text not null,
  processed_at timestamptz not null default now()
);

-- Row Level Security ------------------------------------------------------------
alter table profiles      enable row level security;
alter table projects      enable row level security;
alter table scenarios     enable row level security;
alter table share_links   enable row level security;
alter table cub_values    enable row level security;
alter table subscriptions enable row level security;
alter table stripe_events enable row level security;  -- sem policy: só service role

create policy "own profile read"   on profiles for select using (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "own projects" on projects for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own scenarios" on scenarios for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));

create policy "own share links" on share_links for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));

create policy "cub public read" on cub_values for select using (true);
create policy "cub admin write" on cub_values for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "own subscription read" on subscriptions for select using (user_id = auth.uid());

-- Storage: bucket "logos" privado, caminho {user_id}/logo.{png|jpg}, até 1 MB.
-- Só roda onde existe o schema storage (Supabase); num Postgres puro é ignorado.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('logos', 'logos', false, 1048576, array['image/png','image/jpeg'])
      on conflict (id) do update set public = false, file_size_limit = 1048576,
        allowed_mime_types = array['image/png','image/jpeg'];
    execute $p$
      create policy "own logo" on storage.objects for all to authenticated
        using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
        with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
  end if;
end $$;
