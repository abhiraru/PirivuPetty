import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/money";
import { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/permissions";
import { getBalances } from "@/modules/treasury/balances";

/** Opening balance suggested for a new festival: the closing balance of the latest closed one. */
export async function suggestedOpening(forYear?: number) {
  const last = await db.festival.findFirst({
    where: { status: "CLOSED", closingCash: { not: null }, ...(forYear ? { year: { lt: forYear } } : {}) },
    orderBy: { year: "desc" },
  });
  return { openingCash: last?.closingCash ?? 0, openingBank: last?.closingBank ?? 0, fromYear: last?.year ?? null };
}

export async function createFestival(
  actorId: string,
  input: { name: string; year: number; openingCash: number; openingBank: number },
) {
  const exists = await db.festival.findUnique({ where: { year: input.year } });
  if (exists) throw new Error(`A festival for ${input.year} already exists.`);
  return db.$transaction(async (tx) => {
    const f = await tx.festival.create({
      data: {
        name: input.name,
        year: input.year,
        openingCash: rupeesToPaise(input.openingCash),
        openingBank: rupeesToPaise(input.openingBank),
      },
    });
    await writeAudit({ userId: actorId, action: "festival.create", entity: "Festival", entityId: f.id, after: { year: f.year } }, tx);
    return f;
  });
}

/** The closing balance of the closest earlier closed festival, which a festival of this year should open with. */
export async function previousClosing(year: number) {
  const prev = await db.festival.findFirst({ where: { status: "CLOSED", closingCash: { not: null }, year: { lt: year } }, orderBy: { year: "desc" } });
  return prev ? { year: prev.year, cash: prev.closingCash!, bank: prev.closingBank ?? 0 } : null;
}

/**
 * Activates a draft festival. Only one festival can be active: the app checks, and the database refuses a second one as a backstop.
 * If the new festival has no collector assignments yet, last festival's are copied across (the admin can change them on the Areas page).
 */
export async function activateFestival(actorId: string, festivalId: string) {
  try {
    return await db.$transaction(async (tx) => {
      const f = await tx.festival.findUniqueOrThrow({ where: { id: festivalId } });
      if (f.status === "CLOSED") throw new Error("A closed festival cannot be activated.");
      if (f.isHistorical) throw new Error("Imported history festivals cannot be activated.");
      const other = await tx.festival.findFirst({ where: { status: "ACTIVE", id: { not: festivalId } } });
      if (other) throw new Error(`${other.name} is already active. Close it first.`);
      await tx.festival.update({ where: { id: festivalId }, data: { status: "ACTIVE" } });

      let copied = 0;
      let from: string | null = null;
      if ((await tx.areaAssignment.count({ where: { festivalId } })) === 0) {
        const prev = await tx.festival.findFirst({
          where: { isHistorical: false, year: { lt: f.year }, areaAssignments: { some: {} } },
          orderBy: { year: "desc" },
        });
        if (prev) {
          const rows = await tx.areaAssignment.findMany({ where: { festivalId: prev.id, collector: { isActive: true } } });
          if (rows.length) {
            await tx.areaAssignment.createMany({ data: rows.map((r) => ({ festivalId, areaId: r.areaId, collectorId: r.collectorId })), skipDuplicates: true });
            copied = rows.length;
            from = prev.name;
          }
        }
      }
      await writeAudit({ userId: actorId, action: "festival.activate", entity: "Festival", entityId: festivalId, after: { assignmentsCopied: copied, from } }, tx);
      return { copied, from };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new Error("Another festival is already active. Close it first.");
    throw e;
  }
}

/** Fixes the opening balances of a festival that has not started. Once it is active or closed they are locked. */
export async function updateOpening(actorId: string, festivalId: string, input: { openingCash: number; openingBank: number }) {
  await db.$transaction(async (tx) => {
    const f = await tx.festival.findUniqueOrThrow({ where: { id: festivalId } });
    if (f.status !== "DRAFT" || f.isHistorical) throw new Error("Opening balances can only be changed before the festival starts.");
    const data = { openingCash: rupeesToPaise(input.openingCash), openingBank: rupeesToPaise(input.openingBank) };
    await tx.festival.update({ where: { id: festivalId }, data });
    await writeAudit(
      { userId: actorId, action: "festival.opening", entity: "Festival", entityId: festivalId, before: { openingCash: f.openingCash, openingBank: f.openingBank }, after: data },
      tx,
    );
  });
}

/** The treasurer records what was really counted. It is saved on the active festival and checked when the admin closes it. */
export async function saveClosingCheck(user: SessionUser, input: { countedCash: number; countedBank: number; note?: string }) {
  if (user.role !== "TREASURER") throw new Error("Only the treasurer can do the closing check.");
  return db.$transaction(async (tx) => {
    const f = await tx.festival.findFirst({ where: { status: "ACTIVE" } });
    if (!f) throw new Error("There is no active festival.");
    const b = await getBalances(tx, f.id);
    const countedCash = rupeesToPaise(input.countedCash);
    const countedBank = rupeesToPaise(input.countedBank);
    await tx.festival.update({ where: { id: f.id }, data: { countedCash, countedBank, reconNote: input.note ?? null, reconAt: new Date(), reconById: user.id } });
    await writeAudit(
      { userId: user.id, action: "festival.closing_check", entity: "Festival", entityId: f.id, after: { countedCash, countedBank, appCash: b.cashInHand, appBank: b.bank, note: input.note ?? null } },
      tx,
    );
    return { appCash: b.cashInHand, appBank: b.bank };
  });
}
