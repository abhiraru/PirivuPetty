import { describe, expect, it } from "vitest";
import { filterByStatus, summarize, WORK_STATUSES, type StatusRow } from "./workList";

const row = (status: string, pledge: number | null, paid: number): StatusRow => ({ status, pledge, paid });
const rows = [row("No promise yet", null, 0), row("Not paid", 1000, 0), row("Partly paid", 1000, 400), row("Paid in full", 500, 500), row("Paid, no promise", null, 200)];

describe("filterByStatus", () => {
  it("returns everything with no filter", () => {
    expect(filterByStatus(rows, undefined)).toHaveLength(5);
    expect(filterByStatus(rows, "")).toHaveLength(5);
  });
  it("keeps only the chosen status", () => {
    expect(filterByStatus(rows, "Not paid")).toHaveLength(1);
    expect(filterByStatus(rows, "Partly paid")[0].paid).toBe(400);
  });
  it("ignores a status it does not know", () => {
    expect(filterByStatus(rows, "bogus")).toHaveLength(5);
  });
  it("offers the statuses a collector acts on", () => {
    expect(WORK_STATUSES).toEqual(["Still owes", "No promise yet", "Not paid", "Partly paid", "Paid in full"]);
  });
  it("'Still owes' covers both unpaid and part-paid households", () => {
    expect(filterByStatus(rows, "Still owes").map((r) => r.status)).toEqual(["Not paid", "Partly paid"]);
  });
});

describe("summarize", () => {
  it("totals promised and paid over every row, not a page", () => {
    expect(summarize(rows)).toEqual({ count: 5, pledged: 2500, paid: 1100 });
  });
  it("handles an empty list", () => {
    expect(summarize([])).toEqual({ count: 0, pledged: 0, paid: 0 });
  });
});
