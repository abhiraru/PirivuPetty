import { describe, expect, it } from "vitest";
import type { Balances } from "@/modules/treasury/balances";
import { findBlockers } from "./close";

const base: Balances = {
  cashInHand: 0, bank: 0, netFund: 0, chequesNotCleared: 0, collectorHoldings: [], totalWithCollectors: 0,
  totalPendingHandovers: 0, collectedTotal: 0, otherIncome: 0, spentTotal: 0, available: {},
};
const names = new Map([["c1", "Ravi"]]);
const matched = { countedCash: 0, countedBank: 0, note: null };

describe("findBlockers", () => {
  it("is ready when everything is settled", () => {
    expect(findBlockers({ ...base, collectorHoldings: [{ collectorId: "c1", holding: 0, pending: 0 }] }, names, 0, matched)).toEqual([]);
  });
  it("blocks on cash still with a collector", () => {
    const r = findBlockers({ ...base, collectorHoldings: [{ collectorId: "c1", holding: 50000, pending: 0 }] }, names, 0, matched);
    expect(r).toHaveLength(1);
    expect(r[0]).toContain("Ravi");
  });
  it("blocks on pending handovers and open cheques", () => {
    const r = findBlockers({ ...base, collectorHoldings: [{ collectorId: "c1", holding: 0, pending: 100 }] }, names, 2, matched);
    expect(r).toHaveLength(2);
  });

  it("also blocks until the treasurer has done the closing check", () => {
    const r = findBlockers({ ...base, collectorHoldings: [{ collectorId: "c1", holding: 0, pending: 0 }] }, names, 0, null);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatch(/closing check/i);
  });
  it("blocks an unexplained difference between counted money and the app", () => {
    const r = findBlockers({ ...base, cashInHand: 50000 }, names, 0, { countedCash: 40000, countedBank: 0, note: null });
    expect(r).toHaveLength(1);
  });
});
