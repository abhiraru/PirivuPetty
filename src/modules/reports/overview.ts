import { db } from "@/lib/db";
import { getDashboard } from "@/modules/treasury/queries";
import { buildReport } from "./build";

const MODE_LABEL = { CASH: "Cash", CHEQUE: "Cheque", ONLINE: "Online" } as const;

/** Everything the admin Overview charts need, for one festival. */
export async function getOverview(festivalId: string) {
  const [dash, collectorReport, modes, direct, expenseGroups, categories, festivals, collections, openCheques, households] = await Promise.all([
    getDashboard(festivalId),
    buildReport("collectors", festivalId),
    db.collection.groupBy({ by: ["mode"], where: { festivalId, status: "VALID" }, _sum: { amount: true } }),
    db.collection.aggregate({ where: { festivalId, status: "VALID", collectorId: null }, _sum: { amount: true } }),
    db.expense.groupBy({ by: ["categoryId"], where: { festivalId, status: "VALID" }, _sum: { amount: true } }),
    db.expenseCategory.findMany(),
    db.festival.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { year: "asc" }, select: { id: true, name: true, year: true } }),
    db.collection.findMany({ where: { festivalId, status: "VALID" }, select: { collectedOn: true, amount: true }, orderBy: { collectedOn: "asc" } }),
    db.collection.aggregate({ where: { festivalId, mode: "CHEQUE", status: "VALID", chequeStatus: { in: ["RECEIVED", "DEPOSITED"] } }, _sum: { amount: true }, _count: true }),
    db.household.count({ where: { isActive: true } }),
  ]);

  const rows = collectorReport?.tables[0]?.rows.filter((r) => r.collector !== undefined) ?? [];
  const collectors = rows.map((r) => ({ label: String(r.collector), collected: Number(r.takenTotal ?? 0), unpaid: Number(r.outstanding ?? 0), holding: Number(r.holding ?? 0) }));
  const directAmount = direct._sum.amount ?? 0;
  collectors.sort((a, b) => b.collected - a.collected);
  if (directAmount > 0) collectors.push({ label: "Treasurer (direct)", collected: directAmount, unpaid: 0, holding: 0 });

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const expenses = expenseGroups
    .map((g) => ({ label: catName.get(g.categoryId) ?? "Other", value: g._sum.amount ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const perYear = await Promise.all(
    festivals.map(async (f) => {
      const [c, e] = await Promise.all([
        db.collection.aggregate({ where: { festivalId: f.id, status: "VALID" }, _sum: { amount: true } }),
        db.expense.aggregate({ where: { festivalId: f.id, status: "VALID" }, _sum: { amount: true } }),
      ]);
      return { label: String(f.year), values: [c._sum.amount ?? 0, e._sum.amount ?? 0] };
    }),
  );

  // Running total of money collected, one point per day that had payments.
  const byDay = new Map<string, number>();
  for (const c of collections) {
    const day = c.collectedOn.toLocaleDateString("en-CA");
    byDay.set(day, (byDay.get(day) ?? 0) + c.amount);
  }
  let running = 0;
  const timeline = [...byDay.entries()].map(([day, amt]) => {
    running += amt;
    return { label: new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value: running };
  });

  const pendingAmount = dash.balances.totalPendingHandovers;
  return {
    dash,
    collectors,
    modes: modes.map((m) => ({ label: MODE_LABEL[m.mode], value: m._sum.amount ?? 0 })),
    expenses,
    perYear,
    timeline,
    attention: {
      pendingHandovers: pendingAmount,
      chequeCount: openCheques._count,
      chequeAmount: openCheques._sum.amount ?? 0,
      holdingCollectors: dash.holdings.filter((h) => h.holding > 0),
      withoutPromise: Math.max(households - dash.pledgeCount, 0),
    },
  };
}
