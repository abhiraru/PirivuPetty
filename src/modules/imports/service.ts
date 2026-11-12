import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { householdKey, norm, type CleanRow } from "./validate";

export type ImportPlan = {
  newHouseholds: number;
  existingHouseholds: number;
  newAreas: string[];
  newFestivalYears: number[];
  collectionsToCreate: number;
  collectionsSkipped: number; // household already has an amount recorded for that year
};

/** Works out what an import would do without writing anything. */
export async function planImport(rows: CleanRow[]): Promise<ImportPlan> {
  const [areas, households, festivals] = await Promise.all([
    db.area.findMany(),
    db.household.findMany({ select: { id: true, headName: true, address: true } }),
    db.festival.findMany({ select: { id: true, year: true } }),
  ]);
  const areaNames = new Set(areas.map((a) => norm(a.name)));
  const hhByKey = new Map(households.map((h) => [householdKey(h.headName, h.address), h.id]));
  const yearToFestival = new Map(festivals.map((f) => [f.year, f.id]));

  const newAreas = new Map<string, string>();
  const newHouseholdKeys = new Set<string>();
  const existingKeys = new Set<string>();
  const newYears = new Set<number>();
  let toCreate = 0;
  let skipped = 0;

  const existingCollections = new Set(
    (
      await db.collection.findMany({
        where: { status: "VALID" },
        select: { householdId: true, festival: { select: { year: true } } },
      })
    ).map((c) => `${c.householdId}|${c.festival.year}`),
  );

  for (const r of rows) {
    if (!areaNames.has(norm(r.area))) newAreas.set(norm(r.area), r.area);
    const key = householdKey(r.name, r.address);
    const hhId = hhByKey.get(key);
    if (hhId) existingKeys.add(key);
    else newHouseholdKeys.add(key);
    if (r.amountPaise !== null && r.year !== null) {
      if (!yearToFestival.has(r.year)) newYears.add(r.year);
      if (hhId && existingCollections.has(`${hhId}|${r.year}`)) skipped++;
      else toCreate++;
    }
  }
  return {
    newHouseholds: newHouseholdKeys.size,
    existingHouseholds: existingKeys.size,
    newAreas: [...newAreas.values()],
    newFestivalYears: [...newYears].sort(),
    collectionsToCreate: toCreate,
    collectionsSkipped: skipped,
  };
}

export async function commitImport(actorId: string, fileName: string, rows: CleanRow[]) {
  return db.$transaction(
    async (tx) => {
      const batch = await tx.importBatch.create({ data: { fileName, createdBy: actorId } });

      const areaByName = new Map((await tx.area.findMany()).map((a) => [norm(a.name), a.id]));
      const hhByKey = new Map(
        (await tx.household.findMany({ select: { id: true, headName: true, address: true, phone: true } })).map((h) => [
          householdKey(h.headName, h.address),
          h,
        ]),
      );
      const festivalByYear = new Map((await tx.festival.findMany()).map((f) => [f.year, f.id]));
      const existing = new Set(
        (
          await tx.collection.findMany({
            where: { status: "VALID" },
            select: { householdId: true, festival: { select: { year: true } } },
          })
        ).map((c) => `${c.householdId}|${c.festival.year}`),
      );

      let createdHouseholds = 0;
      let createdCollections = 0;
      let skippedCollections = 0;

      for (const r of rows) {
        let areaId = areaByName.get(norm(r.area));
        if (!areaId) {
          areaId = (await tx.area.create({ data: { name: r.area, importBatchId: batch.id } })).id;
          areaByName.set(norm(r.area), areaId);
        }

        const key = householdKey(r.name, r.address);
        let hh = hhByKey.get(key);
        if (!hh) {
          const created = await tx.household.create({
            data: { headName: r.name, address: r.address, phone: r.phone || null, areaId, importBatchId: batch.id },
          });
          hh = { id: created.id, headName: created.headName, address: created.address, phone: created.phone };
          hhByKey.set(key, hh);
          createdHouseholds++;
        } else if (!hh.phone && r.phone) {
          await tx.household.update({ where: { id: hh.id }, data: { phone: r.phone } });
          hh.phone = r.phone;
        }

        if (r.amountPaise === null || r.year === null) continue;
        if (existing.has(`${hh.id}|${r.year}`)) {
          skippedCollections++;
          continue;
        }

        let festivalId = festivalByYear.get(r.year);
        if (!festivalId) {
          festivalId = (
            await tx.festival.create({
              data: {
                name: `Festival ${r.year}`,
                year: r.year,
                status: "CLOSED",
                isHistorical: true,
                importBatchId: batch.id,
              },
            })
          ).id;
          festivalByYear.set(r.year, festivalId);
        }

        await tx.collection.create({
          data: {
            festivalId,
            householdId: hh.id,
            amount: r.amountPaise,
            mode: "CASH",
            imported: true,
            importBatchId: batch.id,
            collectedOn: new Date(r.year, 0, 1),
          },
        });
        existing.add(`${hh.id}|${r.year}`);
        createdCollections++;
      }

      const summary = { createdHouseholds, createdCollections, skippedCollections };
      await tx.importBatch.update({ where: { id: batch.id }, data: { summary } });
      await writeAudit({ userId: actorId, action: "import.commit", entity: "ImportBatch", entityId: batch.id, after: { fileName, ...summary } }, tx);
      return { batchId: batch.id, ...summary };
    },
    { timeout: 60000 },
  );
}

/** Removes everything a batch created. Refuses if any of it has since been used by live data. */
export async function undoImport(actorId: string, batchId: string) {
  await db.$transaction(async (tx) => {
    const batch = await tx.importBatch.findUniqueOrThrow({ where: { id: batchId } });
    if (batch.undoneAt) throw new Error("This import was already undone.");

    const usedHouseholds = await tx.household.count({
      where: {
        importBatchId: batchId,
        OR: [{ pledges: { some: {} } }, { collections: { some: { importBatchId: null } } }],
      },
    });
    if (usedHouseholds > 0) throw new Error("Some imported households already have pledges or payments, so this import can't be undone.");
    const usedFestivals = await tx.festival.count({
      where: { importBatchId: batchId, OR: [{ collections: { some: { importBatchId: null } } }, { pledges: { some: {} } }] },
    });
    if (usedFestivals > 0) throw new Error("A festival created by this import is now in use, so it can't be undone.");

    await tx.collection.deleteMany({ where: { importBatchId: batchId } });
    await tx.household.deleteMany({ where: { importBatchId: batchId } });
    await tx.festival.deleteMany({ where: { importBatchId: batchId } });
    await tx.area.deleteMany({ where: { importBatchId: batchId, households: { none: {} }, assignments: { none: {} } } });
    await tx.importBatch.update({ where: { id: batchId }, data: { undoneAt: new Date() } });
    await writeAudit({ userId: actorId, action: "import.undo", entity: "ImportBatch", entityId: batchId }, tx);
  });
}
