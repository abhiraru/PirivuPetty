import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/money";

/** Opening balance suggested for a new festival: the closing balance of the latest closed one. */
export async function suggestedOpening() {
  const last = await db.festival.findFirst({
    where: { status: "CLOSED", closingCash: { not: null } },
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

export async function activateFestival(actorId: string, festivalId: string) {
  await db.$transaction(async (tx) => {
    const f = await tx.festival.findUniqueOrThrow({ where: { id: festivalId } });
    if (f.status === "CLOSED") throw new Error("A closed festival cannot be activated.");
    if (f.isHistorical) throw new Error("Imported history festivals cannot be activated.");
    const other = await tx.festival.findFirst({ where: { status: "ACTIVE", id: { not: festivalId } } });
    if (other) throw new Error(`${other.name} is already active. Close it first.`);
    await tx.festival.update({ where: { id: festivalId }, data: { status: "ACTIVE" } });
    await writeAudit({ userId: actorId, action: "festival.activate", entity: "Festival", entityId: festivalId }, tx);
  });
}
