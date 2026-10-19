#!/usr/bin/env bash
# Testes SQL contra um Postgres local descartável:
#   DATABASE_URL=postgres://... supabase/tests/run.sh
set -euo pipefail
: "${DATABASE_URL:?defina DATABASE_URL de um banco DESCARTÁVEL}"
D="$(cd "$(dirname "$0")" && pwd)"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$D/auth-stub.sql"
"$D/../../scripts/db-migrate.sh" >/dev/null
for t in "$D"/*.sql; do
  [[ "$(basename "$t")" == auth-stub.sql ]] && continue
  echo "== $(basename "$t")"
  psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$t"
done
