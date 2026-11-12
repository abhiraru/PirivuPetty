import { describe, expect, it } from "vitest";
import type { Table } from "./types";
import { applyView, filterOptions, parseView } from "./view";

const table: Table = {
  title: "Unpaid",
  cols: [
    { key: "collector", label: "Collector", kind: "text", filter: true },
    { key: "area", label: "Area", kind: "text", filter: true },
    { key: "household", label: "Household", kind: "text" },
    { key: "balance", label: "Not paid", kind: "money" },
  ],
  dateKey: "iso",
  rows: [
    { collector: "Ravi", area: "North", household: "Anand Kumar", balance: 100, iso: "2026-01-02" },
    { collector: "Ravi", area: "Lake", household: "Meena Devi", balance: 200, iso: "2026-01-05" },
    { collector: "Arun", area: "Market", household: "Suresh Iyer", balance: 300, iso: "2026-02-01" },
    { collector: "Arun", area: "Market", household: "Anand Rao", balance: 400, iso: "2026-02-10" },
  ],
  totalRow: { collector: "Total", balance: 1000 },
};
const view = (sp: Record<string, string>) => parseView(sp);

describe("parseView", () => {
  it("reads search, filters, dates, size and per-table pages", () => {
    const v = view({ q: " anand ", f_collector: "Ravi", from: "2026-01-01", to: "2026-01-31", size: "50", p0: "2", p1: "3" });
    expect(v).toMatchObject({ q: "anand", filters: { collector: "Ravi" }, from: "2026-01-01", to: "2026-01-31", size: 50, pages: { 0: 2, 1: 3 } });
  });
  it("ignores blank filters and malformed dates", () => {
    const v = view({ f_area: "", from: "yesterday" });
    expect(v.filters).toEqual({});
    expect(v.from).toBeUndefined();
  });
});

describe("applyView", () => {
  it("filters by a dropdown column", () => {
    const [t] = applyView([table], view({ f_collector: "Arun" }), true);
    expect(t.rows.map((r) => r.household)).toEqual(["Suresh Iyer", "Anand Rao"]);
  });
  it("combines filters with AND", () => {
    const [t] = applyView([table], view({ f_collector: "Ravi", f_area: "Lake" }), true);
    expect(t.rows).toHaveLength(1);
  });
  it("searches text columns only, ignoring case", () => {
    expect(applyView([table], view({ q: "ANAND" }), true)[0].rows).toHaveLength(2);
    expect(applyView([table], view({ q: "300" }), true)[0].rows).toHaveLength(0); // money columns are not searched
  });
  it("filters by date range, inclusive", () => {
    const [t] = applyView([table], view({ from: "2026-01-05", to: "2026-02-01" }), true);
    expect(t.rows.map((r) => r.household)).toEqual(["Meena Devi", "Suresh Iyer"]);
  });
  it("recomputes the total row over all filtered rows, not just the page", () => {
    const [t] = applyView([table], view({ f_collector: "Arun", size: "25" }), true);
    expect(t.totalRow?.balance).toBe(700);
  });
  it("paginates after filtering and reports the window", () => {
    const big: Table = { ...table, rows: Array.from({ length: 60 }, (_, i) => ({ collector: "Ravi", area: "N", household: `H${i}`, balance: 1, iso: "2026-01-01" })) };
    const [p2] = applyView([big], view({ p0: "2" }), true);
    expect(p2.rows).toHaveLength(25);
    expect(p2).toMatchObject({ total: 60, page: 2, pages: 3, from: 26, to: 50 });
    const [all] = applyView([big], view({ p0: "2" }), false);
    expect(all.rows).toHaveLength(60); // exports are never paged
  });
  it("leaves a table alone when it lacks the filter column", () => {
    const small: Table = { title: "Other", cols: [{ key: "x", label: "X", kind: "text" }], rows: [{ x: "a" }, { x: "b" }] };
    expect(applyView([small], view({ f_collector: "Ravi" }), true)[0].rows).toHaveLength(2);
  });
});

describe("filterOptions", () => {
  it("lists the distinct values per filter column, sorted", () => {
    expect(filterOptions([table])).toEqual([
      { key: "collector", label: "Collector", values: ["Arun", "Ravi"] },
      { key: "area", label: "Area", values: ["Lake", "Market", "North"] },
    ]);
  });
  it("reports whether any table can be filtered by date", () => {
    expect(table.dateKey).toBe("iso");
  });
});
