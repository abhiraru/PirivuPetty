import { db } from "@/lib/db";

export type HouseholdRow = {
  id: string;
  name: string;
  address: string;
  phone: string;
  areaId: string;
  areaName: string;
  collectorId: string | null; // assigned collector for the festival
  pledge: number | null;
  paid: number;
  balance: number;
  status: string;
};

export function statusOf(pledge: number | null, paid: number): string {
  if (pledge === null) return paid > 0 ? "Paid, no promise" : "No promise yet";
  if (pledge === 0) return "Declined";
  if (paid >= pledge) return "Paid in full";
  return paid > 0 ? "Partly paid" : "Not paid";
}

export async function loadFestivalData(festivalId: string) {
  const festival = await db.festival.findUniqueOrThrow({ where: { id: festivalId } });
  const [households, assignments, users] = await Promise.all([
    db.household.findMany({
      where: { OR: [{ isActive: true }, { collections: { some: { festivalId } } }] },
      select: {
        id: true, headName: true, address: true, phone: true, areaId: true,
        area: { select: { name: true } },
        pledges: { where: { festivalId }, select: { amount: true } },
        collections: { where: { festivalId, status: "VALID" }, select: { amount: true } },
      },
      orderBy: [{ area: { name: "asc" } }, { headName: "asc" }],
    }),
    db.areaAssignment.findMany({ where: { festivalId } }),
    db.user.findMany({ select: { id: true, name: true } }),
  ]);
  const collectorOfArea = new Map(assignments.map((a) => [a.areaId, a.collectorId]));
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const rows: HouseholdRow[] = households.map((h) => {
    const pledge = h.pledges[0]?.amount ?? null;
    const paid = h.collections.reduce((s, c) => s + c.amount, 0);
    return {
      id: h.id, name: h.headName, address: h.address, phone: h.phone ?? "", areaId: h.areaId, areaName: h.area.name,
      collectorId: collectorOfArea.get(h.areaId) ?? null, pledge, paid,
      balance: Math.max((pledge ?? 0) - paid, 0), status: statusOf(pledge, paid),
    };
  });
  return { festival, rows, nameOf, collectorOfArea };
}
