export type Cell = string | number | null;
export type Col = { key: string; label: string; kind?: "money" | "int" | "text"; filter?: boolean };
/** `dateKey` names a hidden ISO-date field on each row that the date-range filter reads. */
export type Table = { title: string; note?: string; cols: Col[]; rows: Record<string, Cell>[]; totalRow?: Record<string, Cell>; dateKey?: string };
export type Report = { id: string; title: string; festivalName: string; tables: Table[] };

/** Adds a totals row summing every money/int column. The first column carries the "Total" label. */
export function withTotals(t: Table): Table {
  if (t.rows.length === 0) return t;
  const totalRow: Record<string, Cell> = { [t.cols[0].key]: "Total" };
  for (const c of t.cols.slice(1)) {
    if (c.kind === "money" || c.kind === "int") totalRow[c.key] = t.rows.reduce((s, r) => s + (typeof r[c.key] === "number" ? (r[c.key] as number) : 0), 0);
  }
  return { ...t, totalRow };
}
