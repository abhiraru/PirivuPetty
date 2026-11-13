import { envProblems } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Is the live site configured and can it reach its database? Safe to expose: it reports what is wrong,
 * never a value. Open /api/health in a browser after a deploy.
 */
export async function GET() {
  const settings = envProblems(process.env);

  let database = "ok";
  let roundTripMs: number | null = null;
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`select 1`; // opens the connection
    const t0 = performance.now();
    for (let i = 0; i < 3; i++) await db.$queryRaw`select 1`;
    roundTripMs = Math.round((performance.now() - t0) / 3);
  } catch (e) {
    const err = e as { code?: string; name?: string; message?: string };
    database = err.message?.startsWith("Cannot start") ? "not started: a setting is missing or invalid" : err.code ?? err.name ?? "error";
  }

  const ok = settings.length === 0 && database === "ok";
  return Response.json(
    { status: ok ? "ok" : "error", settings: settings.length ? settings : "ok", database, region: process.env.VERCEL_REGION ?? null, databaseRoundTripMs: roundTripMs },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
