import { describe, expect, it } from "vitest";
import { btn, btnIcon } from "./btn";

describe("btn", () => {
  it("defaults to a medium secondary button", () => {
    expect(btn()).toBe("btn btn-secondary");
  });
  it("adds the variant and size classes", () => {
    expect(btn("primary", "sm")).toBe("btn btn-primary btn-sm");
    expect(btn("danger", "lg")).toBe("btn btn-danger btn-lg");
  });
  it("appends extra layout classes", () => {
    expect(btn("ghost", "md", "w-full")).toBe("btn btn-ghost w-full");
  });
  it("makes icon-only buttons square", () => {
    expect(btnIcon("secondary", "sm")).toBe("btn btn-secondary btn-sm btn-icon");
  });
});
