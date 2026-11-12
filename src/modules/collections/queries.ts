import { db } from "@/lib/db";
import { statusOf } from "@/modules/reports/data";
import { groupEarlierYears } from "./earlier";

export type WorkRow = {
  id: string;
  headName: string;
  address: string;
  phone: string | null;
  areaName: string;
  pledge: number | null;
  paid: number;
  balance: number; // pledged minus paid, never negative
  status: string;
  lastYear: { year: number; amount: number } | null;
};

/** Households with this festival's pledge and payments, optionally limited to some areas. */
export async function listWorkHouseholds(opts: {
  festivalId: string;
  festivalYear: number;
  areaIds?: string[];
  areaId?: string;
  q?: string;
  limit?: number;
}): Promise<WorkRow[]> {
  if (opts.areaIds && opts.areaIds.length === 0) return [];
  const areaFilter = opts.areaId ? { areaId: opts.areaId } : {};
  const scope = opts.areaIds ? { areaId: { in: opts.areaIds } } : {};
  const households = await db.household.findMany({
    where: {
      isActive: true,
      ...scope,
      ...areaFilter,
      ...(opts.q
        ? { OR: [{ headName: { contains: opts.q, mode: "insensitive" } }, { address: { contains: opts.q, mode: "insensitive" } }, { phone: { contains: opts.q } }] }
        : {}),
    },
    orderBy: [{ area: { name: "asc" } }, { headName: "asc" }],
    ...(opts.limit ? { take: opts.limit } : {}),
    include: {
      area: true,
      pledges: { where: { festivalId: opts.festivalId } },
      collections: { where: { status: "VALID" }, select: { amount: true, festival: { select: { id: true, year: true } } } },
    },
  });
  return households.map((h) => {
    const paid = h.collections.filter((c) => c.festival.id === opts.festivalId).reduce((s, c) => s + c.amount, 0);
    const pledge = h.pledges[0]?.amount ?? null;
    const prev = new Map<number, number>();
    for (const c of h.collections) if (c.festival.year < opts.festivalYear) prev.set(c.festival.year, (prev.get(c.festival.year) ?? 0) + c.amount);
    const last = [...prev.entries()].sort((a, b) => b[0] - a[0])[0];
    return {
      id: h.id,
      headName: h.headName,
      address: h.address,
      phone: h.phone,
      areaName: h.area.name,
      pledge,
      paid,
      balance: Math.max((pledge ?? 0) - paid, 0),
      status: statusOf(pledge, paid),
      lastYear: last ? { year: last[0], amount: last[1] } : null,
    };
  });
}

export async function getLedger(householdId: string, festivalId: string, festivalYear: number) {
  const [household, festivals] = await Promise.all([
    db.household.findUnique({
      where: { id: householdId },
      include: {
        area: true,
        pledges: true,
        collections: {
          orderBy: { collectedOn: "desc" },
          include: { festival: { select: { id: true, year: true } }, collector: { select: { name: true } } },
        },
      },
    }),
    db.festival.findMany({ where: { year: { lt: festivalYear } }, select: { id: true, name: true, year: true } }),
  ]);
  if (!household) return null;
  const thisYear = household.collections.filter((c) => c.festival.id === festivalId);
  const paid = thisYear.filter((c) => c.status === "VALID").reduce((s, c) => s + c.amount, 0);
  const pledge = household.pledges.find((p) => p.festivalId === festivalId) ?? null;
  return {
    household,
    pledge,
    paid,
    balance: Math.max((pledge?.amount ?? 0) - paid, 0),
    payments: thisYear,
    earlier: groupEarlierYears({ currentYear: festivalYear, festivals, pledges: household.pledges, collections: household.collections }),
  };
}

/** What a collector has taken this festival and how much cash is still in their hands. */
export async function collectorSummary(festivalId: string, collectorId: string) {
  const [byMode, handedOver] = await Promise.all([
    db.collection.groupBy({
      by: ["mode"],
      where: { festivalId, collectorId, status: "VALID" },
      _sum: { amount: true },
    }),
    db.handover.aggregate({ where: { festivalId, collectorId, status: "CONFIRMED" }, _sum: { amount: true } }),
  ]);
  const sum = (m: string) => byMode.find((b) => b.mode === m)?._sum.amount ?? 0;
  const cash = sum("CASH");
  return {
    cash,
    cheque: sum("CHEQUE"),
    online: sum("ONLINE"),
    total: cash + sum("CHEQUE") + sum("ONLINE"),
    handedOver: handedOver._sum.amount ?? 0,
    holding: cash - (handedOver._sum.amount ?? 0),
  };
}
