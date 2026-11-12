import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function createArea(actorId: string, name: string, description?: string) {
  name = name.trim();
  if (name.length < 1) throw new Error("Enter an area name.");
  const exists = await db.area.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (exists) throw new Error("That area already exists.");
  return db.$transaction(async (tx) => {
    const area = await tx.area.create({ data: { name, description: description?.trim() || null } });
    await writeAudit({ userId: actorId, action: "area.create", entity: "Area", entityId: area.id, after: { name } }, tx);
    return area;
  });
}

/** One collector per area per festival: replaces any existing assignment. */
export async function assignCollector(actorId: string, festivalId: string, areaId: string, collectorId: string | null) {
  await db.$transaction(async (tx) => {
    if (collectorId) {
      const c = await tx.user.findUnique({ where: { id: collectorId } });
      if (!c || c.role !== "COLLECTOR" || !c.isActive) throw new Error("Choose an active collector.");
    }
    await tx.areaAssignment.deleteMany({ where: { festivalId, areaId } });
    if (collectorId) await tx.areaAssignment.create({ data: { festivalId, areaId, collectorId } });
    await writeAudit(
      { userId: actorId, action: "area.assign", entity: "Area", entityId: areaId, after: { festivalId, collectorId } },
      tx,
    );
  });
}
