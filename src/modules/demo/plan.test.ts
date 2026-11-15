import { describe, expect, it } from "vitest";
import { buildDemoPlan, DEMO_PREFIX } from "./plan";

const NOW = new Date(2026, 10, 13, 12, 0);
const plan = buildDemoPlan(NOW);
const f23 = plan.festivals.find((f) => f.year === 2023)!;
const f26 = plan.festivals.find((f) => f.year === 2026)!;

describe("demo plan shape", () => {
  it("is deterministic for the same day", () => {
    expect(JSON.stringify(buildDemoPlan(NOW))).toBe(JSON.stringify(plan));
  });
  it("has three collectors, a treasurer, four areas and two festivals", () => {
    expect(plan.users.filter((u) => u.role === "COLLECTOR")).toHaveLength(3);
    expect(plan.users.filter((u) => u.role === "TREASURER")).toHaveLength(1);
    expect(plan.areas).toHaveLength(4);
    expect(plan.households).toHaveLength(68);
    expect(plan.festivals.map((f) => f.year).sort()).toEqual([2023, 2026]);
  });
  it("prefixes every id so it can be found and removed later", () => {
    const ids = [
      ...plan.users, ...plan.areas, ...plan.households, ...plan.festivals, ...plan.pledges, ...plan.collections,
      ...plan.handovers, ...plan.bankTxns, ...plan.expenses, ...plan.otherIncome,
    ].map((x) => x.id);
    expect(ids.every((id) => id.startsWith(DEMO_PREFIX))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("makes 2023 a closed year and 2026 the active one", () => {
    expect(f23.status).toBe("CLOSED");
    expect(f26.status).toBe("ACTIVE");
    expect(f23.closingCash).not.toBeNull();
  });
  it("carries the 2023 closing balance into 2026", () => {
    expect(f26.openingCash).toBe(f23.closingCash);
    expect(f26.openingBank).toBe(f23.closingBank);
  });
});

describe("demo money is consistent", () => {
  it("never lets cash or bank go negative", () => {
    for (const f of plan.festivals) {
      expect(plan.expected[f.id].cash).toBeGreaterThanOrEqual(0);
      expect(plan.expected[f.id].bank).toBeGreaterThanOrEqual(0);
    }
  });
  it("settles 2023 fully: nothing left with collectors, every cheque cleared, no request waiting", () => {
    expect(plan.expected[f23.id].holdings).toBe(0);
    expect(plan.collections.filter((c) => c.festivalId === f23.id && c.mode === "CHEQUE").every((c) => c.chequeStatus === "CLEARED")).toBe(true);
    expect(plan.handovers.filter((h) => h.festivalId === f23.id).every((h) => h.status === "CONFIRMED")).toBe(true);
  });
  it("matches the totals recomputed from the raw records", () => {
    for (const f of plan.festivals) {
      const cols = plan.collections.filter((c) => c.festivalId === f.id);
      const hand = plan.handovers.filter((h) => h.festivalId === f.id && h.status === "CONFIRMED").reduce((s, h) => s + h.amount, 0);
      const dep = plan.bankTxns.filter((b) => b.festivalId === f.id && b.type === "DEPOSIT_CASH").reduce((s, b) => s + b.amount, 0);
      const cashExp = plan.expenses.filter((e) => e.festivalId === f.id && e.paidFrom === "CASH").reduce((s, e) => s + e.amount, 0);
      const bankExp = plan.expenses.filter((e) => e.festivalId === f.id && e.paidFrom === "BANK").reduce((s, e) => s + e.amount, 0);
      const incCash = plan.otherIncome.filter((x) => x.festivalId === f.id && x.receivedIn === "CASH").reduce((s, x) => s + x.amount, 0);
      const incBank = plan.otherIncome.filter((x) => x.festivalId === f.id && x.receivedIn === "BANK").reduce((s, x) => s + x.amount, 0);
      const direct = cols.filter((c) => c.mode === "CASH" && !c.collectorId).reduce((s, c) => s + c.amount, 0);
      const online = cols.filter((c) => c.mode === "ONLINE").reduce((s, c) => s + c.amount, 0);
      const cleared = cols.filter((c) => c.mode === "CHEQUE" && c.chequeStatus === "CLEARED").reduce((s, c) => s + c.amount, 0);
      expect(plan.expected[f.id].cash).toBe(f.openingCash + direct + incCash + hand - dep - cashExp);
      expect(plan.expected[f.id].bank).toBe(f.openingBank + online + cleared + incBank + dep - bankExp);
      expect(plan.expected[f.id].otherIncome).toBe(incCash + incBank);
      expect(plan.expected[f.id].collected).toBe(cols.reduce((s, c) => s + c.amount, 0));
      expect(plan.expected[f.id].spent).toBe(cashExp + bankExp);
    }
  });
  it("stores whole rupees only", () => {
    const all = [...plan.pledges, ...plan.collections, ...plan.handovers, ...plan.bankTxns, ...plan.expenses, ...plan.otherIncome];
    expect(all.every((x) => Number.isInteger(x.amount) && x.amount > 0 && x.amount % 100 === 0)).toBe(true);
  });
});

describe("demo tells a workflow story", () => {
  it("collectors only collect in their own areas", () => {
    const areaOf = new Map(plan.households.map((h) => [h.id, h.areaId]));
    for (const c of plan.collections.filter((c) => c.collectorId)) {
      expect(plan.assignments.some((a) => a.festivalId === c.festivalId && a.collectorId === c.collectorId && a.areaId === areaOf.get(c.householdId))).toBe(true);
    }
  });
  it("2026 has things left to do: waiting handovers, open cheques, cash with collectors, direct payments, people who owe", () => {
    expect(plan.handovers.filter((h) => h.festivalId === f26.id && h.status === "PENDING").length).toBeGreaterThanOrEqual(2);
    expect(plan.collections.filter((c) => c.festivalId === f26.id && (c.chequeStatus === "RECEIVED" || c.chequeStatus === "DEPOSITED")).length).toBeGreaterThanOrEqual(3);
    expect(plan.expected[f26.id].holdings).toBeGreaterThan(0);
    expect(plan.collections.filter((c) => c.festivalId === f26.id && !c.collectorId).length).toBeGreaterThanOrEqual(3);
    const paid = new Map<string, number>();
    for (const c of plan.collections.filter((c) => c.festivalId === f26.id)) paid.set(c.householdId, (paid.get(c.householdId) ?? 0) + c.amount);
    const owing = plan.pledges.filter((p) => p.festivalId === f26.id && (paid.get(p.householdId) ?? 0) < p.amount);
    expect(owing.length).toBeGreaterThanOrEqual(10);
    expect(plan.households.length - plan.pledges.filter((p) => p.festivalId === f26.id).length).toBeGreaterThanOrEqual(3);
  });
  it("online payments have unique transaction ids and no payment is dated in the future", () => {
    const t = plan.collections.filter((c) => c.mode === "ONLINE").map((c) => c.txnId);
    expect(t.every(Boolean) && new Set(t).size === t.length).toBe(true);
    expect(plan.collections.every((c) => c.collectedOn.getTime() <= NOW.getTime())).toBe(true);
  });
  it("has history for the 'earlier years' section: 2023 payments by households still active in 2026", () => {
    const h23 = new Set(plan.collections.filter((c) => c.festivalId === f23.id).map((c) => c.householdId));
    expect(h23.size).toBeGreaterThanOrEqual(35);
  });

  it("includes bank interest and sponsorship in both festivals", () => {
    for (const f of plan.festivals) {
      const inc = plan.otherIncome.filter((x) => x.festivalId === f.id);
      expect(inc.some((x) => x.source === "BANK_INTEREST" && x.receivedIn === "BANK")).toBe(true);
      expect(inc.some((x) => x.source === "SPONSORSHIP")).toBe(true);
    }
  });
});
