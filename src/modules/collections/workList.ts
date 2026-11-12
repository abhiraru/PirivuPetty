/** Filtering and totals for the collector and treasurer household lists. Pure, so it can be tested. */

export const WORK_STATUSES = ["Still owes", "No promise yet", "Not paid", "Partly paid", "Paid in full"] as const;

const OWING = ["Not paid", "Partly paid"];

export type StatusRow = { status: string; pledge: number | null; paid: number };

/** Keeps rows with the chosen status. Anything unrecognised means no filter. */
export function filterByStatus<T extends StatusRow>(rows: T[], status: string | undefined): T[] {
  if (!status || !(WORK_STATUSES as readonly string[]).includes(status)) return rows;
  if (status === "Still owes") return rows.filter((r) => OWING.includes(r.status));
  return rows.filter((r) => r.status === status);
}

export function summarize(rows: StatusRow[]) {
  return { count: rows.length, pledged: rows.reduce((s, r) => s + (r.pledge ?? 0), 0), paid: rows.reduce((s, r) => s + r.paid, 0) };
}
