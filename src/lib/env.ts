/** Startup checks for production settings. Pure so the rules can be tested. */

type Env = Record<string, string | undefined>;

export function envProblems(env: Env): string[] {
  if (env.NODE_ENV !== "production") return [];
  const out: string[] = [];
  if (!env.DATABASE_URL) out.push("DATABASE_URL is not set.");
  const secret = env.AUTH_SECRET ?? "";
  if (secret.length < 32 || /dev-only|change-?me|secret|password/i.test(secret)) {
    out.push("AUTH_SECRET must be a random value of at least 32 characters. Generate one with: openssl rand -base64 32");
  }
  if (env.ADMIN_PASSWORD && /^changeme/i.test(env.ADMIN_PASSWORD)) out.push("ADMIN_PASSWORD is still the well-known default. Choose a strong one.");
  return out;
}

/** Throws at startup when production is misconfigured. Skipped while building, when secrets may not be present yet. */
export function assertEnv() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const problems = envProblems(process.env);
  if (problems.length) throw new Error(`Cannot start:\n- ${problems.join("\n- ")}`);
}
