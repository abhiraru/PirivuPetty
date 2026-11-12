import { describe, expect, it } from "vitest";
import { validateRows } from "./validate";

const row = (o: Partial<{ line: number; name: string; phone: string; address: string; area: string; amount: string; year: string }> = {}) => ({
  line: 2, name: "Ravi Kumar", phone: "", address: "12 Temple St", area: "North", amount: "500", year: "2025", ...o,
});

describe("validateRows", () => {
  it("accepts a good row and converts to paise", () => {
    const [r] = validateRows([row()], null);
    expect(r.error).toBeUndefined();
    expect(r.clean?.amountPaise).toBe(50000);
  });
  it("uses the default year when the column is empty", () => {
    const [r] = validateRows([row({ year: "" })], 2024);
    expect(r.clean?.year).toBe(2024);
  });
  it("rejects missing year when no default", () => {
    expect(validateRows([row({ year: "" })], null)[0].error).toMatch(/Year/);
  });
  it("rejects bad amounts, missing fields and duplicates", () => {
    expect(validateRows([row({ amount: "abc" })], null)[0].error).toMatch(/Amount/);
    expect(validateRows([row({ name: "" })], null)[0].error).toMatch(/Name/);
    expect(validateRows([row({ area: "" })], null)[0].error).toMatch(/Area/);
    const dup = validateRows([row(), row({ line: 3, name: "ravi  kumar" })], null);
    expect(dup[1].error).toMatch(/twice/);
  });
  it("allows a household with no amount", () => {
    const [r] = validateRows([row({ amount: "", year: "" })], null);
    expect(r.clean?.amountPaise).toBeNull();
  });
});
