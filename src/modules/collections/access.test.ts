import { describe, expect, it } from "vitest";
import { canWorkOnArea } from "./access";

const user = (role: "ADMIN" | "TREASURER" | "COLLECTOR") => ({ id: "u", name: "U", role });

describe("canWorkOnArea", () => {
  it("lets admin and treasurer work anywhere", () => {
    expect(canWorkOnArea(user("ADMIN"), "a1", [])).toBe(true);
    expect(canWorkOnArea(user("TREASURER"), "a1", [])).toBe(true);
  });
  it("limits collectors to assigned areas", () => {
    expect(canWorkOnArea(user("COLLECTOR"), "a1", ["a1", "a2"])).toBe(true);
    expect(canWorkOnArea(user("COLLECTOR"), "a3", ["a1", "a2"])).toBe(false);
    expect(canWorkOnArea(user("COLLECTOR"), "a1", [])).toBe(false);
  });
});
