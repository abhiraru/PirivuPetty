import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectionSchema, pledgeSchema } from "./schema";

const base = { householdId: "h1", amount: "500", mode: "CASH", collectedOn: "2026-11-12" };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T10:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("collectionSchema", () => {
  it("converts rupees to paise", () => {
    expect(collectionSchema.parse(base).amount).toBe(50000);
  });
  it("rejects zero or empty amounts", () => {
    expect(collectionSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
    expect(collectionSchema.safeParse({ ...base, amount: "" }).success).toBe(false);
  });
  it("requires a transaction ID for online payments", () => {
    expect(collectionSchema.safeParse({ ...base, mode: "ONLINE" }).success).toBe(false);
    expect(collectionSchema.safeParse({ ...base, mode: "ONLINE", txnId: "UPI123" }).success).toBe(true);
  });
  it("requires a cheque number for cheques", () => {
    expect(collectionSchema.safeParse({ ...base, mode: "CHEQUE" }).success).toBe(false);
    expect(collectionSchema.safeParse({ ...base, mode: "CHEQUE", chequeNo: "001234" }).success).toBe(true);
  });
});

describe("collectionSchema date received", () => {
  it("is required", () => {
    const { collectedOn: _omit, ...noDate } = base;
    void _omit;
    expect(collectionSchema.safeParse(noDate).error?.issues[0].message).toMatch(/date received/i);
    expect(collectionSchema.safeParse({ ...base, collectedOn: "" }).success).toBe(false);
  });
  it("accepts today and earlier days", () => {
    expect(collectionSchema.safeParse({ ...base, collectedOn: "2026-11-12" }).success).toBe(true);
    expect(collectionSchema.safeParse({ ...base, collectedOn: "2026-10-01" }).success).toBe(true);
  });
  it("accepts tomorrow's date to allow for timezone differences", () => {
    expect(collectionSchema.safeParse({ ...base, collectedOn: "2026-11-13" }).success).toBe(true);
  });
  it("rejects dates further in the future", () => {
    expect(collectionSchema.safeParse({ ...base, collectedOn: "2026-11-15" }).error?.issues[0].message).toMatch(/future/);
  });
  it("rejects nonsense and absurdly old dates", () => {
    expect(collectionSchema.safeParse({ ...base, collectedOn: "not-a-date" }).success).toBe(false);
    expect(collectionSchema.safeParse({ ...base, collectedOn: "1990-01-01" }).success).toBe(false);
  });
  it("returns a real Date", () => {
    expect(collectionSchema.parse(base).collectedOn).toBeInstanceOf(Date);
  });
});

describe("pledgeSchema", () => {
  it("allows zero (household declined) but not negatives", () => {
    expect(pledgeSchema.parse({ householdId: "h", amount: "0" }).amount).toBe(0);
    expect(pledgeSchema.safeParse({ householdId: "h", amount: "-5" }).success).toBe(false);
  });
});
