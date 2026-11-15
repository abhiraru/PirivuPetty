import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { assertBalancesValid, getBalances } from "@/modules/treasury/balances";
import { buildDemoPlan, DEMO_PASSWORD, DEMO_PREFIX } from "./plan";

const demo = { startsWith: DEMO_PREFIX };
const demoHousehold = { OR: [{ id: demo }, { areaId: demo }] };
const demoCollection = { OR: [{ festivalId: demo }, { householdId: demo }, { household: { areaId: demo } }, { collectorId: demo }, { recordedById: demo }] };

const DEFAULT_CATEGORIES = ["Decoration", "Food", "Sound and lights", "Rituals", "Stage and tent", "Printing", "Transport", "Other"];

export async function demoStatus() {
  const [festivals, households, collections, users, realFestivals, realHouseholds, realCollections] = await Promise.all([
    db.festival.count({ where: { id: demo } }),
    db.household.count({ where: demoHousehold }),
    db.collection.count({ where: demoCollection }),
    db.user.count({ where: { id: demo } }),
    db.festival.count({ where: { NOT: { id: demo } } }),
    db.household.count({ where: { NOT: demoHousehold } }),
    db.collection.count({ where: { NOT: demoCollection } }),
  ]);
  return { loaded: festivals > 0, festivals, households, collections, users, realFestivals, realHouseholds, realCollections };
}

/**
 * Loads the sample 2023 and 2026 festivals. Refused unless the app has no real festivals, households or payments,
 * so demo and real records can never mix. Everything is saved or nothing is, and the saved balances are checked
 * against what the plan says they should be.
 */
export async function loadDemo(actorId: string) {
  const s = await demoStatus();
  if (s.loaded) throw new Error("Demo data is already loaded. Remove it first to load it again.");
  if (s.realFestivals > 0 || s.realHouseholds > 0 || s.realCollections > 0) {
    throw new Error("Demo data can only be loaded into an empty app (no festivals, households or payments yet), so it never mixes with real records.");
  }
  const plan = buildDemoPlan(new Date());
  const clash = await db.user.findFirst({ where: { username: { in: plan.users.map((u) => u.username) } } });
  if (clash) throw new Error(`A user named "${clash.username}" already exists. Rename or remove it first.`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.$transaction(
    async (tx) => {
      for (const name of DEFAULT_CATEGORIES) await tx.expenseCategory.upsert({ where: { name }, update: {}, create: { name } });
      const categories = new Map((await tx.expenseCategory.findMany()).map((c) => [c.name, c.id]));

      await tx.user.createMany({ data: plan.users.map((u) => ({ id: u.id, name: u.name, username: u.username, phone: u.phone, role: u.role, passwordHash })) });
      await tx.area.createMany({ data: plan.areas });
      await tx.household.createMany({ data: plan.households });
      await tx.festival.createMany({ data: plan.festivals });
      await tx.areaAssignment.createMany({ data: plan.assignments });
      await tx.pledge.createMany({ data: plan.pledges });
      await tx.collection.createMany({ data: plan.collections });
      await tx.handover.createMany({ data: plan.handovers });
      await tx.bankTransaction.createMany({ data: plan.bankTxns });
      await tx.otherIncome.createMany({ data: plan.otherIncome });
      await tx.expense.createMany({
        data: plan.expenses.map(({ categoryName, ...e }) => ({ ...e, categoryId: categories.get(categoryName)! })),
      });

      // Self-check: the app's own balance rules must agree with the plan, or nothing is saved.
      for (const f of plan.festivals) {
        const b = await getBalances(tx, f.id);
        const want = plan.expected[f.id];
        const got = { cash: b.cashInHand, bank: b.bank, collected: b.collectedTotal, otherIncome: b.otherIncome, spent: b.spentTotal, holdings: b.totalWithCollectors, pending: b.totalPendingHandovers };
        for (const k of Object.keys(want) as (keyof typeof want)[]) {
          if (got[k] !== want[k]) throw new Error(`Demo self-check failed for ${f.name}: ${k} is ${got[k]} but should be ${want[k]}. Nothing was saved.`);
        }
        await assertBalancesValid(tx, f.id);
      }
      await writeAudit({ userId: actorId, action: "demo.load", entity: "Demo", after: { households: plan.households.length, collections: plan.collections.length } }, tx);
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  return demoStatus();
}

/** Removes the demo, and anything the demo accounts entered. Real records are never touched. */
export async function removeDemo(actorId: string) {
  return db.$transaction(
    async (tx) => {
      const counts = {
        payments: (await tx.collection.deleteMany({ where: demoCollection })).count,
        promises: (await tx.pledge.deleteMany({ where: { OR: [{ festivalId: demo }, { householdId: demo }, { household: { areaId: demo } }] } })).count,
        handovers: (await tx.handover.deleteMany({ where: { OR: [{ festivalId: demo }, { collectorId: demo }] } })).count,
        bankEntries: (await tx.bankTransaction.deleteMany({ where: { OR: [{ festivalId: demo }, { createdById: demo }] } })).count,
        otherIncome: (await tx.otherIncome.deleteMany({ where: { OR: [{ festivalId: demo }, { createdById: demo }] } })).count,
        expenses: (await tx.expense.deleteMany({ where: { OR: [{ festivalId: demo }, { createdById: demo }] } })).count,
        assignments: (await tx.areaAssignment.deleteMany({ where: { OR: [{ festivalId: demo }, { areaId: demo }, { collectorId: demo }] } })).count,
        households: (await tx.household.deleteMany({ where: demoHousehold })).count,
        areas: (await tx.area.deleteMany({ where: { id: demo } })).count,
        festivals: (await tx.festival.deleteMany({ where: { id: demo } })).count,
        users: 0,
      };
      await tx.auditLog.deleteMany({ where: { userId: demo } });
      counts.users = (await tx.user.deleteMany({ where: { id: demo } })).count;
      await writeAudit({ userId: actorId, action: "demo.remove", entity: "Demo", after: counts }, tx);
      return counts;
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
}
