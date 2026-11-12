import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";

/** Whether a user may work on (pledge for, collect from) a household in a festival. Collectors only get their assigned areas. */
export function canWorkOnArea(user: SessionUser, areaId: string, assignedAreaIds: string[]): boolean {
  if (user.role === "ADMIN" || user.role === "TREASURER") return true;
  return user.role === "COLLECTOR" && assignedAreaIds.includes(areaId);
}

export async function assignedAreaIds(festivalId: string, collectorId: string): Promise<string[]> {
  const rows = await db.areaAssignment.findMany({ where: { festivalId, collectorId }, select: { areaId: true } });
  return rows.map((r) => r.areaId);
}

/** Loads the household and active festival, and throws unless the user may work on it. */
export async function loadWorkContext(user: SessionUser, householdId: string) {
  const festival = await db.festival.findFirst({ where: { status: "ACTIVE" } });
  if (!festival) throw new Error("There is no active festival. Ask the admin to activate one.");
  const household = await db.household.findUnique({ where: { id: householdId } });
  if (!household || !household.isActive) throw new Error("Household not found.");
  const areas = user.role === "COLLECTOR" ? await assignedAreaIds(festival.id, user.id) : [];
  if (!canWorkOnArea(user, household.areaId, areas)) throw new Error("This household is not in your area.");
  return { festival, household };
}
