import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import { assignedAreaIds } from "./access";
import { buildCollectorOverview } from "./overview";
import { collectorSummary, listWorkHouseholds } from "./queries";

/** Everything the collector home page shows for the active festival. */
export async function getCollectorDashboard(user: SessionUser, festival: { id: string; year: number }) {
  const areaIds = await assignedAreaIds(festival.id, user.id);
  const [rows, summary, payments, areas] = await Promise.all([
    listWorkHouseholds({ festivalId: festival.id, festivalYear: festival.year, areaIds }),
    collectorSummary(festival.id, user.id),
    areaIds.length
      ? db.collection.findMany({
          where: { festivalId: festival.id, status: "VALID", household: { areaId: { in: areaIds } } },
          select: { amount: true, mode: true, collectedOn: true },
        })
      : Promise.resolve([]),
    db.area.findMany({ where: { id: { in: areaIds } }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const overview = buildCollectorOverview(
    rows.map((r) => ({ id: r.id, headName: r.headName, areaName: r.areaName, phone: r.phone, pledge: r.pledge, paid: r.paid, balance: r.balance, status: r.status })),
    payments,
    new Date(),
  );
  return { overview, summary, areaNames: areas.map((a) => a.name), hasAreas: areaIds.length > 0 };
}
