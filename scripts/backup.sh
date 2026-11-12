#!/usr/bin/env bash
# Dumps the database to ./backups/festival-<timestamp>.sql.gz and keeps the newest 30.
# Uses DATABASE_URL (or DIRECT_URL if set) with pg_dump; falls back to the local Docker container.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
URL="${DIRECT_URL:-${DATABASE_URL:-}}"
[ -n "$URL" ] || { echo "Set DATABASE_URL (or DIRECT_URL)." >&2; exit 1; }
mkdir -p backups
OUT="backups/festival-$(date +%Y%m%d-%H%M%S).sql.gz"
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump --no-owner --no-privileges "$URL" | gzip > "$OUT"
elif docker ps --format '{{.Names}}' | grep -q '^festival-db$'; then
  docker exec festival-db pg_dump -U festival --no-owner --no-privileges festival | gzip > "$OUT"
else
  echo "pg_dump not found and the festival-db container is not running." >&2; exit 1
fi
[ -s "$OUT" ] || { rm -f "$OUT"; echo "Backup came out empty; nothing saved." >&2; exit 1; }
ls -1t backups/festival-*.sql.gz | tail -n +31 | xargs -r rm -f
echo "Saved $OUT ($(du -h "$OUT" | cut -f1))"
