import { describe, expect, it } from "vitest";
import { groupEarlierYears } from "./earlier";

const festivals = [
  { id: "f26", name: "Festival 2026", year: 2026 },
  { id: "f25", name: "Festival 2025", year: 2025 },
  { id: "f24", name: "Festival 2024", year: 2024 },
];
const pay = (o: Partial<{ id: string; festivalId: string; amount: number; status: "VALID" | "VOIDED" }>) => ({
  id: "p1", festivalId: "f25", amount: 50000, status: "VALID" as const, mode: "CASH" as const, imported: false, collectedOn: new Date("2025-01-05"), collector: null, txnId: null, chequeNo: null, ...o,
});

describe("groupEarlierYears", () => {
  it("lists every earlier year newest first, never the current one", () => {
    const g = groupEarlierYears({ currentYear: 2026, festivals, pledges: [], collections: [] });
    expect(g.map((x) => x.year)).toEqual([2025, 2024]);
  });
  it("shows a year with no payments as did-not-give", () => {
    const [y2025] = groupEarlierYears({ currentYear: 2026, festivals, pledges: [], collections: [] });
    expect(y2025).toMatchObject({ paid: 0, payments: [], pledge: null });
  });
  it("totals valid payments and carries the pledge", () => {
    const [y2025] = groupEarlierYears({
      currentYear: 2026, festivals,
      pledges: [{ festivalId: "f25", amount: 100000 }],
      collections: [pay({ id: "a", amount: 30000 }), pay({ id: "b", amount: 20000 })],
    });
    expect(y2025).toMatchObject({ pledge: 100000, paid: 50000 });
    expect(y2025.payments.map((p) => p.id)).toEqual(["a", "b"]);
  });
  it("leaves voided payments out", () => {
    const [y2025] = groupEarlierYears({ currentYear: 2026, festivals, pledges: [], collections: [pay({ id: "a" }), pay({ id: "v", status: "VOIDED" })] });
    expect(y2025.paid).toBe(50000);
    expect(y2025.payments).toHaveLength(1);
  });
  it("puts each payment under its own year", () => {
    const g = groupEarlierYears({ currentYear: 2026, festivals, pledges: [], collections: [pay({ id: "a", festivalId: "f24", amount: 10000 })] });
    expect(g.find((x) => x.year === 2024)?.paid).toBe(10000);
    expect(g.find((x) => x.year === 2025)?.paid).toBe(0);
  });
});
