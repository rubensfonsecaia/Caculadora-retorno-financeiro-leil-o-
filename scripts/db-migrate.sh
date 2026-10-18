#!/usr/bin/env bash
# Aplica supabase/migrations/*.sql em ordem, uma vez cada, numa transação por arquivo.
# Uso: DATABASE_URL=postgres://... scripts/db-migrate.sh
# (Com a CLI do Supabase, `supabase db push` faz o mesmo; use um dos dois, não os dois.)
set -euo pipefail

: "${DATABASE_URL:?defina DATABASE_URL (Supabase: Project Settings > Database > Connection string)}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/supabase/migrations"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
  "create table if not exists public.schema_migrations (version text primary key, applied_at timestamptz not null default now())"

for f in "$DIR"/*.sql; do
  v="$(basename "$f" .sql)"
  done_already="$(psql "$DATABASE_URL" -tA -c "select 1 from public.schema_migrations where version = '$v'")"
  if [[ "$done_already" == "1" ]]; then
    echo "ok   $v (já aplicada)"
    continue
  fi
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -1 \
    -f "$f" \
    -c "insert into public.schema_migrations (version) values ('$v')"
  echo "novo $v"
done
