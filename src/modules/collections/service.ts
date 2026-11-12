import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/permissions";
import { assertBalancesValid } from "@/modules/treasury/balances";
import { loadWorkContext } from "./access";
import type { CollectionInput, PledgeInput } from "./schema";

export async function savePledge(user: SessionUser, input: PledgeInput) {
  const { festival, household } = await loadWorkContext(user, input.householdId);
  return db.$transaction(async (tx) => {
    const before = await tx.pledge.findUnique({
      where: { festivalId_householdId: { festivalId: festival.id, householdId: household.id } },
    });
    const pledge = await tx.pledge.upsert({
      where: { festivalId_householdId: { festivalId: festival.id, householdId: household.id } },
      create: { festivalId: festival.id, householdId: household.id, amount: input.amount, note: input.note ?? null, createdById: user.id },
      update: { amount: input.amount, note: input.note ?? null },
    });
    await writeAudit(
      {
        userId: user.id,
        action: before ? "pledge.update" : "pledge.create",
        entity: "Pledge",
        entityId: pledge.id,
        before: before ? { amount: before.amount, note: before.note } : undefined,
        after: { amount: pledge.amount, note: pledge.note },
      },
      tx,
    );
    return pledge;
  });
}

export async function recordCollection(user: SessionUser, input: CollectionInput) {
  const { festival, household } = await loadWorkContext(user, input.householdId);

  // Whose hands hold the cash: the collector who took it. Entries by admin/treasurer go
  // straight to the treasury (null) unless they say a collector took it.
  let collectorId: string | null = null;
  if (user.role === "COLLECTOR") collectorId = user.id;
  else if (input.collectedBy) {
    const c = await db.user.findUnique({ where: { id: input.collectedBy } });
    if (!c || c.role !== "COLLECTOR" || !c.isActive) throw new Error("Choose an active collector.");
    collectorId = c.id;
  }

  if (input.mode === "ONLINE") {
    const dup = await db.collection.findUnique({ where: { txnId: input.txnId! } });
    if (dup) throw new Error("That transaction ID is already recorded.");
  }

  try {
    return await db.$transaction(async (tx) => {
      const c = await tx.collection.create({
        data: {
          festivalId: festival.id,
          householdId: household.id,
          collectorId,
          recordedById: user.id,
          amount: input.amount,
          mode: input.mode,
          collectedOn: input.collectedOn,
          txnId: input.mode === "ONLINE" ? input.txnId : null,
          chequeNo: input.mode === "CHEQUE" ? input.chequeNo : null,
          chequeBank: input.mode === "CHEQUE" ? input.chequeBank ?? null : null,
          chequeDate: input.mode === "CHEQUE" ? input.chequeDate ?? null : null,
          chequeStatus: input.mode === "CHEQUE" ? "RECEIVED" : null,
        },
      });
      await writeAudit(
        { userId: user.id, action: "collection.create", entity: "Collection", entityId: c.id, after: { householdId: household.id, amount: c.amount, mode: c.mode } },
        tx,
      );
      return c;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new Error("That transaction ID is already recorded.");
    throw e;
  }
}

/** Corrects a mistaken entry. The record stays, marked void with a reason. Treasurer/admin only. */
export async function voidCollection(user: SessionUser, collectionId: string, reason: string) {
  if (user.role === "COLLECTOR") throw new Error("Only the treasurer or admin can void a payment.");
  reason = reason.trim();
  if (reason.length < 3) throw new Error("Give a reason for voiding.");
  await db.$transaction(async (tx) => {
    const c = await tx.collection.findUniqueOrThrow({ where: { id: collectionId }, include: { festival: true } });
    if (c.status === "VOIDED") throw new Error("Already voided.");
    if (c.festival.status !== "ACTIVE") throw new Error("Only payments in the active festival can be voided.");
    await tx.collection.update({ where: { id: collectionId }, data: { status: "VOIDED", voidReason: reason } });
    // Refuse if the money has already moved on (handed over, deposited, spent).
    await assertBalancesValid(tx, c.festivalId);
    await writeAudit({ userId: user.id, action: "collection.void", entity: "Collection", entityId: collectionId, before: { amount: c.amount, mode: c.mode }, after: { reason } }, tx);
  });
}
