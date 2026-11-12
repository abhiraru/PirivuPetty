import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { paginate } from "@/lib/pagination";

export type AuditFilters = { q?: string; user?: string; action?: string; entity?: string; from?: string; to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function auditWhere(f: AuditFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (f.user) and.push({ userId: f.user === "none" ? null : f.user });
  if (f.action) and.push({ action: f.action });
  if (f.entity) and.push({ entity: f.entity });
  if (f.from && ISO.test(f.from)) and.push({ createdAt: { gte: new Date(`${f.from}T00:00:00`) } });
  if (f.to && ISO.test(f.to)) and.push({ createdAt: { lte: new Date(`${f.to}T23:59:59.999`) } });
  const q = f.q?.trim();
  if (q) {
    and.push({
      OR: [
        { action: { contains: q, mode: "insensitive" } },
        { entity: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export async function searchAudit(f: AuditFilters, page: number, size: number) {
  const where = auditWhere(f);
  const total = await db.auditLog.count({ where });
  const w = paginate(total, page, size);
  const rows = await db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: w.skip, take: w.size, include: { user: { select: { name: true } } } });
  return { rows, window: w };
}

/** Choices for the filter dropdowns. */
export async function auditFilterOptions() {
  const [actions, entities, people] = await Promise.all([
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    db.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { actions: actions.map((a) => a.action), entities: entities.map((e) => e.entity), people };
}
