/** Rules for expense bill uploads. Pure, so they can run in the browser and on the server. */

export const MAX_BILL_BYTES = 4_000_000;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function validateBill(file: { type: string; size: number }): string | null {
  if (!ALLOWED.includes(file.type)) return "Attach a photo or PDF of the bill.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_BILL_BYTES) return "That file is too large (4 MB maximum).";
  return null;
}

export type BillBackend = "local" | "blob";

export const billKey = (backend: BillBackend, ref: string) => `${backend}:${ref}`;

/** Reads a stored key back into a backend and reference. Anything unexpected is refused so a stored value can never point elsewhere. */
export function parseBillKey(key: string | null | undefined): { backend: BillBackend; ref: string } | null {
  if (!key) return null;
  const i = key.indexOf(":");
  const backend = key.slice(0, i);
  const ref = key.slice(i + 1);
  if (backend === "local" && /^[A-Za-z0-9._-]+$/.test(ref) && !ref.includes("..")) return { backend, ref };
  if (backend === "blob" && ref.startsWith("https://")) return { backend, ref };
  return null;
}
