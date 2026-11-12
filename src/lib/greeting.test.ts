import { describe, expect, it } from "vitest";
import { dayPart, firstName, greeting } from "./greeting";

describe("dayPart", () => {
  it("covers the day", () => {
    expect(dayPart(5)).toBe("Good morning");
    expect(dayPart(11)).toBe("Good morning");
    expect(dayPart(12)).toBe("Good afternoon");
    expect(dayPart(16)).toBe("Good afternoon");
    expect(dayPart(17)).toBe("Good evening");
    expect(dayPart(21)).toBe("Good evening");
  });
  it("says hello in the small hours instead of a wrong 'good morning'", () => {
    expect(dayPart(22)).toBe("Hello");
    expect(dayPart(0)).toBe("Hello");
    expect(dayPart(4)).toBe("Hello");
  });
});

describe("firstName", () => {
  it("takes the first word", () => {
    expect(firstName("Ravi Kumar")).toBe("Ravi");
    expect(firstName("  meena   devi ")).toBe("meena");
  });
  it("falls back politely", () => {
    expect(firstName("")).toBe("there");
    expect(firstName("   ")).toBe("there");
  });
});

describe("greeting", () => {
  it("combines them", () => {
    expect(greeting("Ravi Kumar", 19)).toBe("Good evening, Ravi");
    expect(greeting("", 9)).toBe("Good morning, there");
  });
});
