import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { incomeSchema, SOURCE_LABEL, SOURCES } from "./schema";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T10:00:00Z")); });
afterEach(() => vi.useRealTimers());

const base = { source: "BANK_INTEREST", amount: "312.50", receivedIn: "BANK", receivedOn: "2026-11-10" };

describe("incomeSchema", () => {
  it("accepts a bank interest entry and converts to paise", () => {
    const r = incomeSchema.parse(base);
    expect(r.amount).toBe(31250);
    expect(r.source).toBe("BANK_INTEREST");
    expect(r.receivedOn).toBeInstanceOf(Date);
  });
  it("the description is optional", () => {
    expect(incomeSchema.parse(base).description).toBeUndefined();
    expect(incomeSchema.parse({ ...base, description: "  Quarter to Sep  " }).description).toBe("Quarter to Sep");
  });
  it("needs a positive amount", () => {
    expect(incomeSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
    expect(incomeSchema.safeParse({ ...base, amount: "-5" }).success).toBe(false);
    expect(incomeSchema.safeParse({ ...base, amount: "" }).success).toBe(false);
  });
  it("only accepts the listed sources and places", () => {
    expect(incomeSchema.safeParse({ ...base, source: "LOTTERY" }).success).toBe(false);
    expect(incomeSchema.safeParse({ ...base, receivedIn: "POCKET" }).success).toBe(false);
  });
  it("needs a date that is not in the future", () => {
    expect(incomeSchema.safeParse({ ...base, receivedOn: "" }).success).toBe(false);
    expect(incomeSchema.safeParse({ ...base, receivedOn: "2026-12-30" }).error?.issues[0].message).toMatch(/future/);
  });
  it("has a plain-English label for every source", () => {
    expect(SOURCES).toHaveLength(5);
    for (const s of SOURCES) expect(SOURCE_LABEL[s].length).toBeGreaterThan(3);
    expect(SOURCE_LABEL.BANK_INTEREST).toBe("Bank interest");
  });
});
