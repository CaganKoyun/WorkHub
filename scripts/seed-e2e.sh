#!/usr/bin/env bash
# Apply supabase/seed/e2e-fixtures.sql against $DATABASE_URL.
# Refuses to run against a URL that doesn't smell like a
# branch/preview/staging DB unless ALLOW_PROD_SEED=1 is set.
#
# Usage:
#   DATABASE_URL="postgres://postgres:...@<branch>.supabase.co:6543/postgres" \
#     ./scripts/seed-e2e.sh
#
# Requires: psql on PATH.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

if [[ -z "${ALLOW_PROD_SEED:-}" ]] \
   && ! echo "$DATABASE_URL" | grep -Eiq 'branch|preview|test|staging|localhost|127\.0\.0\.1'; then
  echo "Refusing to seed: URL does not look like a branch/preview/staging DB." >&2
  echo "Re-run with ALLOW_PROD_SEED=1 if you really mean it." >&2
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not on PATH. On macOS: brew install libpq && brew link --force libpq" >&2
  exit 3
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
SQL="$HERE/../supabase/seed/e2e-fixtures.sql"

echo "Applying $SQL against $DATABASE_URL"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"
