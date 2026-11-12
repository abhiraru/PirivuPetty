import { describe, expect, it } from "vitest";
import { buildCollectorOverview, type OverviewPayment, type OverviewRow } from "./overview";

const row = (o: Partial<OverviewRow> & { id: string }): OverviewRow => ({
  headName: `H ${o.id}`, areaName: "North", phone: "9000000000", pledge: null, paid: 0, balance: 0, status: "No promise yet", ...o,
});
const rows: OverviewRow[] = [
  row({ id: "a", pledge: 1000, paid: 1000, balance: 0, status: "Paid in full" }),
  row({ id: "b", pledge: 1000, paid: 400, balance: 600, status: "Partly paid", areaName: "Lake" }),
  row({ id: "c", pledge: 500, paid: 0, balance: 500, status: "Not paid" }),
  row({ id: "d", pledge: null, paid: 0, balance: 0, status: "No promise yet", areaName: "Lake" }),
  row({ id: "e", pledge: null, paid: 200, balance: 0, status: "Paid, no promise" }),
];
const at = (d: number, mon = 10) => new Date(2026, mon, d, 10, 0);
const pay = (amount: number, mode: OverviewPayment["mode"], day: number): OverviewPayment => ({ amount, mode, collectedOn: at(day) });
const NOW = at(12);

describe("buildCollectorOverview totals", () => {
  const o = buildCollectorOverview(rows, [], NOW);
  it("adds up promises, payments and what is still owed", () => {
    expect(o).toMatchObject({ households: 5, promisedHouseholds: 3, promised: 2500, collected: 1600, pending: 1100, pendingHouseholds: 2, noPromise: 2 });
  });
  it("reports progress against what was promised, capped at 100", () => {
    expect(o.progressPct).toBe(64);
    expect(buildCollectorOverview([row({ id: "x", pledge: 100, paid: 500, status: "Paid in full" })], [], NOW).progressPct).toBe(100);
  });
  it("has zero progress when nothing is promised", () => {
    expect(buildCollectorOverview([row({ id: "x" })], [], NOW).progressPct).toBe(0);
  });
});

describe("status breakdown", () => {
  it("counts households per status in a fixed order, hiding empty ones", () => {
    const s = buildCollectorOverview(rows, [], NOW).status;
    expect(s.map((x) => [x.label, x.count])).toEqual([["Paid in full", 1], ["Partly paid", 1], ["Not paid", 1], ["No promise yet", 1], ["Paid, no promise", 1]]);
    expect(buildCollectorOverview([rows[0]], [], NOW).status).toHaveLength(1);
  });
});

describe("areas and who owes", () => {
  const o = buildCollectorOverview(rows, [], NOW);
  it("splits paid and pending by area", () => {
    expect(o.byArea).toEqual([
      { area: "Lake", collected: 400, pending: 600 },
      { area: "North", collected: 1200, pending: 500 },
    ]);
  });
  it("lists the largest balances first and only those who owe", () => {
    expect(o.topPending.map((p) => p.id)).toEqual(["b", "c"]);
    expect(o.topPending[0]).toMatchObject({ name: "H b", area: "Lake", pledge: 1000, paid: 400, balance: 600 });
  });
  it("limits the list", () => {
    const many = Array.from({ length: 9 }, (_, i) => row({ id: `m${i}`, pledge: 100 + i, paid: 0, balance: 100 + i, status: "Not paid" }));
    expect(buildCollectorOverview(many, [], NOW, 14, 5).topPending).toHaveLength(5);
    expect(buildCollectorOverview(many, [], NOW, 14, 5).topPending[0].balance).toBe(108);
  });
});

describe("payment modes", () => {
  it("sums each mode and drops empty ones", () => {
    const o = buildCollectorOverview(rows, [pay(300, "CASH", 5), pay(200, "CASH", 6), pay(100, "ONLINE", 7)], NOW);
    expect(o.byMode).toEqual([{ label: "Cash", value: 500 }, { label: "Online", value: 100 }]);
  });
});

describe("14-day trend", () => {
  it("has one running-total point per day ending today", () => {
    const o = buildCollectorOverview(rows, [pay(100, "CASH", 10), pay(50, "CASH", 12)], NOW);
    expect(o.trend).toHaveLength(14);
    expect(o.trend[13]).toEqual({ label: "12 Nov", value: 150 });
    expect(o.trend[11]).toEqual({ label: "10 Nov", value: 100 });
    expect(o.trend[10].value).toBe(0);
  });
  it("starts from what was collected before the window", () => {
    const early: OverviewPayment = { amount: 900, mode: "CASH", collectedOn: at(20, 9) }; // 20 Oct, before the window
    const o = buildCollectorOverview(rows, [early, pay(100, "CASH", 12)], NOW);
    expect(o.trend[0].value).toBe(900);
    expect(o.trend[13].value).toBe(1000);
  });
  it("ignores payments dated after today", () => {
    const o = buildCollectorOverview(rows, [pay(100, "CASH", 12), pay(999, "CASH", 13)], NOW);
    expect(o.trend[13].value).toBe(100);
  });
});
