/** Numbers for the collector dashboard, built from the collector's own households and the payments made in their areas. Pure, so it can be tested. */

export type OverviewRow = {
  id: string;
  headName: string;
  areaName: string;
  phone: string | null;
  pledge: number | null;
  paid: number;
  balance: number;
  status: string;
};
export type OverviewPayment = { amount: number; mode: "CASH" | "CHEQUE" | "ONLINE"; collectedOn: Date };

const STATUS_ORDER = ["Paid in full", "Partly paid", "Not paid", "No promise yet", "Paid, no promise", "Declined"];
const MODE_LABEL = { CASH: "Cash", ONLINE: "Online", CHEQUE: "Cheque" } as const;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const dayKey = (d: Date) => d.toLocaleDateString("en-CA");

export function buildCollectorOverview(rows: OverviewRow[], payments: OverviewPayment[], now: Date, days = 14, topN = 5) {
  const promised = sum(rows.map((r) => r.pledge ?? 0));
  const collected = sum(rows.map((r) => r.paid));
  const owing = rows.filter((r) => r.balance > 0);

  const status = STATUS_ORDER.map((label) => ({ label, count: rows.filter((r) => r.status === label).length })).filter((s) => s.count > 0);

  const areas = new Map<string, { collected: number; pending: number }>();
  for (const r of rows) {
    const a = areas.get(r.areaName) ?? { collected: 0, pending: 0 };
    a.collected += r.paid;
    a.pending += r.balance;
    areas.set(r.areaName, a);
  }

  const modeTotals = new Map<string, number>();
  for (const p of payments) modeTotals.set(p.mode, (modeTotals.get(p.mode) ?? 0) + p.amount);

  // One running-total point per day, ending today. Payments before the window count towards the starting level.
  const trend: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const end = dayKey(day);
    trend.push({
      label: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      value: sum(payments.filter((p) => dayKey(p.collectedOn) <= end).map((p) => p.amount)),
    });
  }

  return {
    households: rows.length,
    promisedHouseholds: rows.filter((r) => r.pledge !== null).length,
    promised,
    collected,
    pending: sum(rows.map((r) => r.balance)),
    pendingHouseholds: owing.length,
    noPromise: rows.filter((r) => r.pledge === null).length,
    progressPct: promised > 0 ? Math.min(100, Math.round((collected / promised) * 100)) : 0,
    status,
    byArea: [...areas.entries()].map(([area, v]) => ({ area, ...v })).sort((a, b) => a.area.localeCompare(b.area)),
    topPending: [...owing]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, topN)
      .map((r) => ({ id: r.id, name: r.headName, area: r.areaName, phone: r.phone, pledge: r.pledge, paid: r.paid, balance: r.balance })),
    byMode: (["CASH", "ONLINE", "CHEQUE"] as const).map((m) => ({ label: MODE_LABEL[m], value: modeTotals.get(m) ?? 0 })).filter((m) => m.value > 0),
    trend,
  };
}
