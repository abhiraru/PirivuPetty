import { describe, expect, it } from "vitest";
import { donutSegments, linePoints, niceMax } from "./chartMath";

describe("donutSegments", () => {
  it("splits the circle in proportion and chains the offsets", () => {
    const s = donutSegments([50, 30, 20], 100);
    expect(s.map((x) => x.length)).toEqual([50, 30, 20]);
    expect(s.map((x) => x.offset)).toEqual([0, -50, -80]);
  });
  it("returns nothing when there is no money", () => {
    expect(donutSegments([0, 0], 100)).toEqual([]);
    expect(donutSegments([], 100)).toEqual([]);
  });
  it("ignores negative values", () => {
    expect(donutSegments([10, -5], 100).map((x) => x.length)).toEqual([100, 0]);
  });
});

describe("niceMax", () => {
  it("rounds up to a tidy axis maximum", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(120)).toBe(200);
    expect(niceMax(230)).toBe(250);
    expect(niceMax(480)).toBe(500);
    expect(niceMax(1)).toBe(1);
  });
});

describe("linePoints", () => {
  it("spreads points evenly and flips y so larger values sit higher", () => {
    const p = linePoints([0, 50, 100], 200, 100, 100);
    expect(p.map((x) => x.x)).toEqual([0, 100, 200]);
    expect(p.map((x) => x.y)).toEqual([100, 50, 0]);
  });
  it("puts a single point in the middle", () => {
    expect(linePoints([40], 200, 100, 100)).toEqual([{ x: 100, y: 60 }]);
  });
});
