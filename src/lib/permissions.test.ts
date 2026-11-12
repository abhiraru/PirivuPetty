import { describe, expect, it } from "vitest";
import { assertRole, ForbiddenError } from "./permissions";

describe("assertRole", () => {
  it("allows a permitted role", () => {
    const u = { id: "1", name: "A", role: "ADMIN" as const };
    expect(assertRole(u, "ADMIN")).toBe(u);
  });
  it("blocks other roles and anonymous users", () => {
    const u = { id: "1", name: "C", role: "COLLECTOR" as const };
    expect(() => assertRole(u, "ADMIN")).toThrow(ForbiddenError);
    expect(() => assertRole(null, "ADMIN")).toThrow(ForbiddenError);
  });
});
