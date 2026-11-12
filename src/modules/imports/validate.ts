import { rupeesToPaise } from "@/lib/money";
import type { RawRow } from "./parse";

export type CleanRow = {
  line: number;
  name: string;
  phone: string;
  address: string;
  area: string;
  amountPaise: number | null;
  year: number | null;
};

export type RowResult = { line: number; row: RawRow; clean?: CleanRow; error?: string };

export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export const householdKey = (name: string, address: string) => `${norm(name)}|${norm(address)}`;

export function validateRows(rows: RawRow[], defaultYear: number | null): RowResult[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const fail = (error: string): RowResult => ({ line: row.line, row, error });
    if (row.name.length < 2) return fail("Name is missing");
    if (row.address.length < 2) return fail("Address is missing");
    if (!row.area) return fail("Area is missing");

    let amountPaise: number | null = null;
    if (row.amount) {
      const n = Number(row.amount.replace(/[,₹\s]|rs\.?/gi, ""));
      if (!Number.isFinite(n) || n < 0) return fail(`Amount "${row.amount}" is not a valid number`);
      amountPaise = rupeesToPaise(n);
    }

    let year: number | null = null;
    if (amountPaise !== null) {
      year = row.year ? Number(row.year) : defaultYear;
      if (!year || !Number.isInteger(year) || year < 2000 || year > 2100) {
        return fail("Year is missing or invalid (add a year column or choose one above)");
      }
    }

    const dupKey = `${householdKey(row.name, row.address)}|${year}`;
    if (amountPaise !== null && seen.has(dupKey)) return fail("Same household and year appears twice in the file");
    seen.add(dupKey);

    const phone = row.phone.replace(/[^\d+]/g, "");
    if (row.phone && phone.replace(/\D/g, "").length < 7) return fail(`Phone "${row.phone}" looks wrong`);

    return {
      line: row.line,
      row,
      clean: { line: row.line, name: row.name, phone, address: row.address, area: row.area, amountPaise, year },
    };
  });
}
