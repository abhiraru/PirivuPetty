import { describe, expect, it } from "vitest";
import { formatINR, paiseToRupees, rupeesToPaise } from "./money";

describe("money", () => {
  it("converts rupees to paise without float drift", () => {
    expect(rupeesToPaise(10.1)).toBe(1010);
    expect(rupeesToPaise(0.29)).toBe(29);
  });
  it("converts paise to rupees", () => {
    expect(paiseToRupees(1010)).toBe(10.1);
  });
  it("formats as INR", () => {
    expect(formatINR(123456)).toContain("1,234.56");
  });
});
