import { describe, expect, it } from "vitest";
import { applyDbEnv, resolveDbEnv } from "./dbEnv";

describe("resolveDbEnv", () => {
  it("leaves a Neon-style setup alone (pooled DATABASE_URL, separate DIRECT_URL)", () => {
    expect(resolveDbEnv({ DATABASE_URL: "pooled", DIRECT_URL: "direct" })).toEqual({ DATABASE_URL: "pooled", DIRECT_URL: "direct" });
  });
  it("understands Prisma Postgres on Vercel (DATABASE_URL is direct, DATABASE_URL_POOLED is pooled)", () => {
    expect(resolveDbEnv({ DATABASE_URL: "direct", DATABASE_URL_POOLED: "pooled" })).toEqual({ DATABASE_URL: "pooled", DIRECT_URL: "direct" });
  });
  it("uses one address for both when a host only gives one", () => {
    expect(resolveDbEnv({ DATABASE_URL: "only" })).toEqual({ DATABASE_URL: "only", DIRECT_URL: "only" });
  });
  it("an explicit DIRECT_URL always wins", () => {
    expect(resolveDbEnv({ DATABASE_URL: "a", DATABASE_URL_POOLED: "b", DIRECT_URL: "mine" })).toEqual({ DATABASE_URL: "b", DIRECT_URL: "mine" });
  });
  it("returns nothing when no database is configured", () => {
    expect(resolveDbEnv({})).toEqual({});
  });
});

describe("applyDbEnv", () => {
  it("writes the resolved names into the environment", () => {
    const env: Record<string, string | undefined> = { DATABASE_URL: "direct", DATABASE_URL_POOLED: "pooled" };
    applyDbEnv(env);
    expect(env.DATABASE_URL).toBe("pooled");
    expect(env.DIRECT_URL).toBe("direct");
  });
  it("is safe to run twice", () => {
    const env: Record<string, string | undefined> = { DATABASE_URL: "direct", DATABASE_URL_POOLED: "pooled" };
    applyDbEnv(env);
    applyDbEnv(env);
    expect(env).toMatchObject({ DATABASE_URL: "pooled", DIRECT_URL: "direct" });
  });
});
