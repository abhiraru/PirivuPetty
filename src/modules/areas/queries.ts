import { db } from "@/lib/db";

export function listAreasWithCounts() {
  return db.area.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { households: true } } },
  });
}

export function listCollectors() {
  return db.user.findMany({
    where: { role: "COLLECTOR", isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function assignmentsForFestival(festivalId: string) {
  return db.areaAssignment.findMany({ where: { festivalId } });
}
