#!/usr/bin/env bash
# Restores a backup made by backup.sh into an EMPTY database. Usage: scripts/restore.sh backups/festival-XXXX.sql.gz
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
FILE="${1:?Give the backup file to restore}"
URL="${DIRECT_URL:-${DATABASE_URL:-}}"
[ -n "$URL" ] || { echo "Set DATABASE_URL (or DIRECT_URL)." >&2; exit 1; }
echo "This loads $FILE into the database named in your .env. It must be empty. Type 'restore' to continue:"
read -r answer; [ "$answer" = "restore" ] || { echo "Cancelled."; exit 1; }
if command -v psql >/dev/null 2>&1; then gunzip -c "$FILE" | psql "$URL"
else gunzip -c "$FILE" | docker exec -i festival-db psql -U festival festival; fi
