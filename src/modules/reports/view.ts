import { paginate, parsePage, parseSize } from "@/lib/pagination";
import { withTotals, type Table } from "./types";

export type ViewOptions = {
  q: string;
  filters: Record<string, string>;
  from?: string;
  to?: string;
  size: number;
  pages: Record<number, number>;
};

export type ViewTable = Table & { total: number; page: number; pages: number; from: number; to: number; index: number };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Reads the report's filters from the address-bar query. Unknown or blank values are ignored. */
export function parseView(sp: Record<string, string | undefined>): ViewOptions {
  const filters: Record<string, string> = {};
  const pages: Record<number, number> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k.startsWith("f_") && v) filters[k.slice(2)] = v;
    const m = /^p(\d+)$/.exec(k);
    if (m) pages[Number(m[1])] = parsePage(v);
  }
  return {
    q: (sp.q ?? "").trim(),
    filters,
    from: sp.from && ISO.test(sp.from) ? sp.from : undefined,
    to: sp.to && ISO.test(sp.to) ? sp.to : undefined,
    size: parseSize(sp.size),
    pages,
  };
}

/** Dropdown choices for every filterable column, taken from the unfiltered rows. */
export function filterOptions(tables: Table[]): { key: string; label: string; values: string[] }[] {
  const out = new Map<string, { key: string; label: string; values: Set<string> }>();
  for (const t of tables)
    for (const c of t.cols) {
      if (!c.filter) continue;
      const entry = out.get(c.key) ?? { key: c.key, label: c.label, values: new Set<string>() };
      for (const r of t.rows) if (r[c.key] !== null && r[c.key] !== undefined && r[c.key] !== "") entry.values.add(String(r[c.key]));
      out.set(c.key, entry);
    }
  return [...out.values()].map((e) => ({ key: e.key, label: e.label, values: [...e.values].sort((a, b) => a.localeCompare(b)) }));
}

export const hasDateFilter = (tables: Table[]) => tables.some((t) => t.dateKey);

/** Filters, searches and (optionally) pages each table. Totals are recomputed over every matching row. */
export function applyView(tables: Table[], v: ViewOptions, paginateRows: boolean): ViewTable[] {
  const needle = v.q.toLowerCase();
  return tables.map((t, index) => {
    const textKeys = t.cols.filter((c) => c.kind === "text" || !c.kind).map((c) => c.key);
    const keys = new Set(t.cols.map((c) => c.key));
    const rows = t.rows.filter((r) => {
      if (needle && !textKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(needle))) return false;
      for (const [k, val] of Object.entries(v.filters)) if (keys.has(k) && String(r[k] ?? "") !== val) return false;
      if (t.dateKey && (v.from || v.to)) {
        const d = String(r[t.dateKey] ?? "");
        if (!d || (v.from && d < v.from) || (v.to && d > v.to)) return false;
      }
      return true;
    });
    const base: Table = t.totalRow ? withTotals({ ...t, rows, totalRow: undefined }) : { ...t, rows };
    const w = paginate(rows.length, v.pages[index] ?? 1, paginateRows ? v.size : Math.max(rows.length, 1));
    return { ...base, rows: paginateRows ? rows.slice(w.skip, w.skip + w.size) : rows, total: w.total, page: w.page, pages: w.pages, from: w.from, to: w.to, index };
  });
}
