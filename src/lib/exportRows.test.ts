import { describe, expect, it } from "vitest";
import { toCell, toRow } from "./exportRows";

describe("toCell", () => {
  it("turns money fields into rupees", () => {
    expect(toCell("amount", 123456)).toBe(1234.56);
    expect(toCell("openingCash", 50000)).toBe(500);
    expect(toCell("closingBank", null)).toBeNull();
  });
  it("leaves other numbers alone", () => {
    expect(toCell("year", 2026)).toBe(2026);
  });
  it("writes dates as ISO text and objects as JSON", () => {
    expect(toCell("createdAt", new Date("2026-11-09T10:00:00Z"))).toBe("2026-11-09T10:00:00.000Z");
    expect(toCell("after", { amount: 5 })).toBe('{"amount":5}');
  });
});

describe("toRow", () => {
  it("never exports password hashes", () => {
    expect(toRow({ id: "u1", username: "a", passwordHash: "secret" })).toEqual({ id: "u1", username: "a" });
  });
});
