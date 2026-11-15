import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/permissions";
import { assertBalancesValid } from "@/modules/treasury/balances";
import { SOURCE_LABEL, type IncomeInput } from "./schema";

function treasurerOnly(user: SessionUser) {
  if (user.role !== "TREASURER") throw new Error("Only the treasurer can record other income.");
}

async function activeFestival() {
  const f = await db.festival.findFirst({ where: { status: "ACTIVE" } });
  if (!f) throw new Error("There is no active festival.");
  return f;
}

/** Records money that did not come from a household payment: bank interest, sponsorship, a refund. */
export async function addIncome(user: SessionUser, input: IncomeInput) {
  treasurerOnly(user);
  const f = await activeFestival();
  return db.$transaction(async (tx) => {
    const row = await tx.otherIncome.create({
      data: {
        festivalId: f.id,
        source: input.source,
        description: input.description ?? SOURCE_LABEL[input.source],
        amount: input.amount,
        receivedIn: input.receivedIn,
        receivedOn: input.receivedOn,
        reference: input.reference ?? null,
        createdById: user.id,
      },
    });
    await assertBalancesValid(tx, f.id);
    await writeAudit({ userId: user.id, action: "income.create", entity: "OtherIncome", entityId: row.id, after: { source: row.source, amount: row.amount, receivedIn: row.receivedIn } }, tx);
    return row;
  });
}

/** Voiding income removes it from the balances, so it is refused if that money has already been spent. */
export async function voidIncome(user: SessionUser, id: string, reason: string) {
  treasurerOnly(user);
  reason = reason.trim();
  if (reason.length < 3) throw new Error("Give a reason for voiding.");
  await db.$transaction(async (tx) => {
    const row = await tx.otherIncome.findUniqueOrThrow({ where: { id }, include: { festival: true } });
    if (row.status === "VOIDED") throw new Error("Already voided.");
    if (row.festival.status !== "ACTIVE") throw new Error("Only income in the active festival can be voided.");
    await tx.otherIncome.update({ where: { id }, data: { status: "VOIDED", voidReason: reason } });
    await assertBalancesValid(tx, row.festivalId);
    await writeAudit({ userId: user.id, action: "income.void", entity: "OtherIncome", entityId: id, before: { amount: row.amount, source: row.source }, after: { reason } }, tx);
  });
}
