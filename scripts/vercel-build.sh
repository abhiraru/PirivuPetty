#!/usr/bin/env bash
# What Vercel runs to build: update the database, optionally create the first admin, then build the app.
set -euo pipefail
cd "$(dirname "$0")/.."

npx tsx scripts/migrate.ts

# First deploy only: if ADMIN_PASSWORD is set in Vercel, create the admin account (does nothing if it already exists).
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  npx tsx prisma/seed.ts
fi

npx next build
