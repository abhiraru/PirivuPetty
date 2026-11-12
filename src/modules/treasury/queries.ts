import { db } from "@/lib/db";
import { getBalances } from "./balances";

/** Everything the fund dashboard shows for one festival. */
export async function getDashboard(festivalId: string) {
  const [balances, pledges, households, collectors, expenseTotals] = await Promise.all([
    getBalances(db, festivalId),
    db.pledge.aggregate({ where: { festivalId }, _sum: { amount: true }, _count: true }),
    db.household.findMany({
      where: { isActive: true, pledges: { some: { festivalId } } },
      select: {
        pledges: { where: { festivalId }, select: { amount: true } },
        collections: { where: { festivalId, status: "VALID" }, select: { amount: true } },
      },
    }),
    db.user.findMany({ where: { role: "COLLECTOR" }, select: { id: true, name: true } }),
    db.expense.groupBy({ by: ["categoryId"], where: { festivalId, status: "VALID" }, _sum: { amount: true } }),
  ]);
  // Still to collect: per household, what is promised but not yet paid (overpayments don't offset others).
  const stillToCollect = households.reduce((s, h) => s + Math.max((h.pledges[0]?.amount ?? 0) - h.collections.reduce((a, c) => a + c.amount, 0), 0), 0);
  const nameOf = new Map(collectors.map((c) => [c.id, c.name]));
  return {
    balances,
    pledged: pledges._sum.amount ?? 0,
    pledgeCount: pledges._count,
    stillToCollect,
    holdings: balances.collectorHoldings
      .map((h) => ({ ...h, name: nameOf.get(h.collectorId) ?? "Unknown" }))
      .filter((h) => h.holding !== 0 || h.pending !== 0)
      .sort((a, b) => b.holding - a.holding),
    expenseTotals,
  };
}

export function pendingHandovers(festivalId: string) {
  return db.handover.findMany({ where: { festivalId, status: "PENDING" }, orderBy: { handedOn: "asc" }, include: { collector: { select: { name: true } } } });
}

export function recentHandovers(festivalId: string, collectorId?: string) {
  return db.handover.findMany({
    where: { festivalId, ...(collectorId ? { collectorId } : {}) },
    orderBy: { handedOn: "desc" },
    take: 30,
    include: { collector: { select: { name: true } } },
  });
}

export function listCheques(festivalId: string) {
  return db.collection.findMany({
    where: { festivalId, mode: "CHEQUE" },
    orderBy: { collectedOn: "desc" },
    include: { household: { select: { headName: true } }, collector: { select: { name: true } } },
  });
}

export function listBankTransactions(festivalId: string) {
  return db.bankTransaction.findMany({ where: { festivalId }, orderBy: { date: "desc" }, take: 50 });
}

export function listExpenses(festivalId: string) {
  return db.expense.findMany({ where: { festivalId }, orderBy: { paidOn: "desc" }, take: 200, include: { category: true } });
}

export function listCategories() {
  return db.expenseCategory.findMany({ orderBy: { name: "asc" } });
}
