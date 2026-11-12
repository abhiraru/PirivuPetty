import { db } from "@/lib/db";
import { DEFAULT_SIZE, paginate } from "@/lib/pagination";

/** The festival year before the one being collected for: what "last year" means on screen. */
export async function lastYearInfo() {
  const active = await db.festival.findFirst({ where: { status: "ACTIVE" } });
  const prev = await db.festival.findFirst({ where: { year: { lt: active?.year ?? 9999 } }, orderBy: { year: "desc" }, select: { year: true } });
  return prev?.year ?? null;
}

export type GaveFilter = "gave" | "none" | undefined;

export async function searchHouseholds(opts: { q?: string; areaId?: string; gave?: GaveFilter; page?: number; size?: number }) {
  const lastYear = await lastYearInfo();
  const gaveLastYear = { collections: { some: { status: "VALID" as const, festival: { year: lastYear ?? -1 } } } };
  const where = {
    ...(opts.areaId ? { areaId: opts.areaId } : {}),
    ...(opts.gave === "gave" ? gaveLastYear : opts.gave === "none" ? { NOT: gaveLastYear } : {}),
    ...(opts.q
      ? {
          OR: [
            { headName: { contains: opts.q, mode: "insensitive" as const } },
            { address: { contains: opts.q, mode: "insensitive" as const } },
            { phone: { contains: opts.q } },
          ],
        }
      : {}),
  };
  const total = await db.household.count({ where });
  const w = paginate(total, opts.page ?? 1, opts.size ?? DEFAULT_SIZE);
  const rows = await db.household.findMany({
    where,
    orderBy: [{ area: { name: "asc" } }, { headName: "asc" }],
    skip: w.skip,
    take: w.size,
    include: {
      area: true,
      collections: { where: { status: "VALID" }, select: { amount: true, festival: { select: { year: true } } } },
    },
  });
  return {
    window: w,
    lastYear,
    rows: rows.map((h) => {
      const history = pastYears(h.collections);
      return {
        ...h,
        history,
        lastYearAmount: lastYear === null ? null : history.find((y) => y.year === lastYear)?.amount ?? 0,
        earlier: history.filter((y) => lastYear !== null && y.year < lastYear).slice(0, 3),
      };
    }),
  };
}

export async function getHousehold(id: string) {
  const h = await db.household.findUnique({
    where: { id },
    include: {
      area: true,
      collections: { where: { status: "VALID" }, select: { amount: true, festival: { select: { year: true } } } },
    },
  });
  return h ? { ...h, history: pastYears(h.collections) } : null;
}

/** Total given per festival year, newest first. */
function pastYears(collections: { amount: number; festival: { year: number } }[]) {
  const byYear = new Map<number, number>();
  for (const c of collections) byYear.set(c.festival.year, (byYear.get(c.festival.year) ?? 0) + c.amount);
  return [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([year, amount]) => ({ year, amount }));
}
