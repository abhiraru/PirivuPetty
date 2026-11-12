import { describe, expect, it } from "vitest";
import { envProblems } from "./env";

const good = { NODE_ENV: "production", DATABASE_URL: "postgresql://u:p@host/db", AUTH_SECRET: "k3Jx9mQ2vL8nR5tY7wZ1aB4cD6eF0gH2iJ3" };

describe("envProblems", () => {
  it("passes a proper production setup", () => {
    expect(envProblems(good)).toEqual([]);
  });
  it("is relaxed outside production", () => {
    expect(envProblems({ NODE_ENV: "development" })).toEqual([]);
  });
  it("requires a database in production", () => {
    expect(envProblems({ ...good, DATABASE_URL: "" })).toEqual([expect.stringMatching(/DATABASE_URL/)]);
  });
  it("rejects a missing, short or development secret", () => {
    expect(envProblems({ ...good, AUTH_SECRET: "" })[0]).toMatch(/AUTH_SECRET/);
    expect(envProblems({ ...good, AUTH_SECRET: "short" })[0]).toMatch(/AUTH_SECRET/);
    expect(envProblems({ ...good, AUTH_SECRET: "dev-only-change-me-in-production-0123456789abcdef" })[0]).toMatch(/AUTH_SECRET/);
  });
  it("flags the well-known default admin password", () => {
    expect(envProblems({ ...good, ADMIN_PASSWORD: "ChangeMe123!" }).join()).toMatch(/ADMIN_PASSWORD/);
  });
});
