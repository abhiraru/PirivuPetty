#!/usr/bin/env bash
# Runs a command with the variables from an env file, without touching .env.
# Example: npm run neon -- npx prisma migrate deploy      (uses .env.neon)
set -euo pipefail
cd "$(dirname "$0")/.."
FILE="${ENV_FILE:-.env.neon}"
[ -f "$FILE" ] || { echo "$FILE not found." >&2; exit 1; }
set -a; . "./$FILE"; set +a
exec "$@"
