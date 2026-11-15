import { describe, expect, it } from "vitest";
import { reconcile, reconBlockers } from "./reconcile";

const app = { cash: 250000, bank: 1500000 };

describe("reconcile", () => {
  it("is not entered until both counts are given", () => {
    expect(reconcile(app, { countedCash: null, countedBank: null, note: null }).entered).toBe(false);
    expect(reconcile(app, { countedCash: 250000, countedBank: null, note: null }).entered).toBe(false);
  });
  it("matches when both counts equal the app", () => {
    const r = reconcile(app, { countedCash: 250000, countedBank: 1500000, note: null });
    expect(r).toMatchObject({ entered: true, matches: true, cashDiff: 0, bankDiff: 0 });
  });
  it("reports differences as counted minus app", () => {
    const r = reconcile(app, { countedCash: 240000, countedBank: 1503120, note: null });
    expect(r).toMatchObject({ matches: false, cashDiff: -10000, bankDiff: 3120 });
  });
  it("a difference in only one place is still a mismatch", () => {
    expect(reconcile(app, { countedCash: 250000, countedBank: 1499900, note: null }).matches).toBe(false);
  });
});

describe("reconBlockers", () => {
  it("blocks when the check has not been entered", () => {
    expect(reconBlockers(app, { countedCash: null, countedBank: null, note: null })[0]).toMatch(/closing check/i);
    expect(reconBlockers(app, null)[0]).toMatch(/closing check/i);
  });
  it("allows closing when everything matches", () => {
    expect(reconBlockers(app, { countedCash: 250000, countedBank: 1500000, note: null })).toEqual([]);
  });
  it("blocks a mismatch that has no explanation, naming the amounts", () => {
    const r = reconBlockers(app, { countedCash: 240000, countedBank: 1500000, note: null });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatch(/cash/i);
    expect(r[0]).toContain("100.00");
  });
  it("allows a mismatch once it is explained", () => {
    expect(reconBlockers(app, { countedCash: 240000, countedBank: 1503120, note: "Bank charges not yet in the app" })).toEqual([]);
  });
  it("does not accept a one-word note as an explanation", () => {
    expect(reconBlockers(app, { countedCash: 240000, countedBank: 1500000, note: "ok" })).toHaveLength(1);
  });
});
