import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "bills-"));
  process.env.UPLOAD_DIR = dir;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("local bill storage", () => {
  it("saves a photo and reads the same bytes back", async () => {
    const { saveBill, readBill } = await import("./storage");
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const key = await saveBill(new File([bytes], "bill.jpg", { type: "image/jpeg" }));
    expect(key).toMatch(/^local:[0-9a-f-]+\.jpg$/);
    const got = await readBill(key);
    expect(got?.contentType).toBe("image/jpeg");
    expect([...got!.data]).toEqual([1, 2, 3, 4, 5]);
  });
  it("refuses files that are not photos or PDFs", async () => {
    const { saveBill } = await import("./storage");
    await expect(saveBill(new File(["<script>"], "x.html", { type: "text/html" }))).rejects.toThrow(/photo or PDF/);
  });
  it("returns nothing for a missing or malicious key", async () => {
    const { readBill } = await import("./storage");
    expect(await readBill("local:nope.jpg")).toBeNull();
    expect(await readBill("local:../../.env")).toBeNull();
    expect(await readBill(null)).toBeNull();
  });
});
