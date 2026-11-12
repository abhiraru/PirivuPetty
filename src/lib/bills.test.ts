import { describe, expect, it } from "vitest";
import { billKey, parseBillKey, validateBill } from "./bills";

describe("validateBill", () => {
  it("accepts photos and PDFs under the size limit", () => {
    expect(validateBill({ type: "image/jpeg", size: 1_000_000 })).toBeNull();
    expect(validateBill({ type: "image/png", size: 10 })).toBeNull();
    expect(validateBill({ type: "image/webp", size: 10 })).toBeNull();
    expect(validateBill({ type: "application/pdf", size: 3_000_000 })).toBeNull();
  });
  it("rejects other file types", () => {
    expect(validateBill({ type: "text/html", size: 10 })).toMatch(/photo or PDF/);
    expect(validateBill({ type: "image/svg+xml", size: 10 })).toMatch(/photo or PDF/);
  });
  it("rejects empty and oversized files", () => {
    expect(validateBill({ type: "image/jpeg", size: 0 })).toMatch(/empty/);
    expect(validateBill({ type: "image/jpeg", size: 4_000_001 })).toMatch(/too large/);
  });
});

describe("bill keys", () => {
  it("round-trips a local and a blob key", () => {
    expect(parseBillKey(billKey("local", "a1b2.jpg"))).toEqual({ backend: "local", ref: "a1b2.jpg" });
    expect(parseBillKey(billKey("blob", "https://x.public.blob.vercel-storage.com/a.pdf"))).toEqual({ backend: "blob", ref: "https://x.public.blob.vercel-storage.com/a.pdf" });
  });
  it("refuses unknown or path-escaping keys", () => {
    expect(parseBillKey("http://evil.example/x")).toBeNull();
    expect(parseBillKey("local:../../etc/passwd")).toBeNull();
    expect(parseBillKey("local:a/b.jpg")).toBeNull();
    expect(parseBillKey(null)).toBeNull();
  });
});
