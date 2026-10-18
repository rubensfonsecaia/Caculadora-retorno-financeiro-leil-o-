-- Operação: limite de tentativas por chave e registro dos jobs.

-- rate_limits: janela fixa por chave (ex.: "checkout:<user>", "share:<ip>")
create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table rate_limits enable row level security; -- sem policy: só service role

-- Conta uma tentativa e diz se ainda está dentro do limite. Atômico (upsert).
create or replace function hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, w, 1)
    on conflict (key, window_start) do update set hits = rate_limits.hits + 1
    returning hits into n;
  return n <= p_max;
end $$;
revoke all on function hit_rate_limit(text, integer, integer) from public, anon, authenticated;

-- job_runs: cada execução de job e cada item que falhou (dead-letter)
create table job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (char_length(job) between 1 and 60),
  status text not null check (status in ('ok', 'partial', 'failed', 'dead_letter')),
  detail jsonb not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_runs_job_created on job_runs (job, created_at desc);
create trigger job_runs_updated_at before update on job_runs
  for each row execute function set_updated_at();
alter table job_runs enable row level security; -- sem policy: só service role

-- limpeza: janelas de rate limit com mais de 1 dia
create or replace function prune_rate_limits() returns integer
language sql security definer set search_path = public as $$
  with d as (delete from rate_limits where window_start < now() - interval '1 day' returning 1)
  select count(*)::integer from d;
$$;
revoke all on function prune_rate_limits() from public, anon, authenticated;
