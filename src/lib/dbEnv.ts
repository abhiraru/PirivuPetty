/**
 * Hosts name their connection strings differently. This maps them onto the two names the app uses:
 *   DATABASE_URL = the pooled address the running app queries through
 *   DIRECT_URL   = the direct address used for database changes (migrations)
 *
 *  - Neon (our setup): DATABASE_URL is pooled, DIRECT_URL is direct. Nothing changes.
 *  - Prisma Postgres on Vercel: DATABASE_URL is direct and DATABASE_URL_POOLED is pooled. They are swapped into place.
 *  - One address only: it is used for both.
 */
type Env = Record<string, string | undefined>;

export function resolveDbEnv(env: Env): { DATABASE_URL?: string; DIRECT_URL?: string } {
  const pooled = env.DATABASE_URL_POOLED || env.DATABASE_URL;
  if (!pooled) return {};
  return { DATABASE_URL: pooled, DIRECT_URL: env.DIRECT_URL || env.DATABASE_URL || pooled };
}

/** Writes the resolved names into the environment. Safe to run more than once. */
export function applyDbEnv(env: Env = process.env) {
  const r = resolveDbEnv(env);
  if (r.DATABASE_URL) env.DATABASE_URL = r.DATABASE_URL;
  if (r.DIRECT_URL) env.DIRECT_URL = r.DIRECT_URL;
}
