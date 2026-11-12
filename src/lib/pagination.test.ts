import { describe, expect, it } from "vitest";
import { paginate, PAGE_SIZES, parsePage, parseSize } from "./pagination";

describe("paginate", () => {
  it("computes the window for a middle page", () => {
    expect(paginate(140, 2, 25)).toEqual({ page: 2, pages: 6, size: 25, total: 140, from: 26, to: 50, skip: 25 });
  });
  it("handles the short last page", () => {
    expect(paginate(140, 6, 25)).toMatchObject({ from: 126, to: 140, skip: 125 });
  });
  it("clamps out-of-range pages", () => {
    expect(paginate(140, 99, 25).page).toBe(6);
    expect(paginate(140, 0, 25).page).toBe(1);
    expect(paginate(140, -3, 25).page).toBe(1);
  });
  it("copes with no rows", () => {
    expect(paginate(0, 1, 25)).toEqual({ page: 1, pages: 1, size: 25, total: 0, from: 0, to: 0, skip: 0 });
  });
});

describe("query parsing", () => {
  it("reads a page number and defaults to 1", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("2.7")).toBe(2);
  });
  it("only allows the offered page sizes", () => {
    expect(PAGE_SIZES).toEqual([25, 50, 100]);
    expect(parseSize("50")).toBe(50);
    expect(parseSize("7")).toBe(25);
    expect(parseSize(undefined)).toBe(25);
  });
});
