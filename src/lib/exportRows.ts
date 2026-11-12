/** Turns database rows into spreadsheet-friendly rows for the full data export. */

const MONEY = /^(amount|opening\w*|closing\w*)$/;
const SECRET = new Set(["passwordHash"]);

export function toCell(key: string, value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return MONEY.test(key) ? value / 100 : value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return value as string | boolean;
}

export function toRow(row: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(row)) if (!SECRET.has(k)) out[k] = toCell(k, v);
  return out;
}
