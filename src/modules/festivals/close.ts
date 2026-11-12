import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { formatINR } from "@/lib/money";
import { getBalances, type Balances } from "@/modules/treasury/balances";

/** Reasons the festival cannot be closed yet. Empty means it is ready. */
export function findBlockers(b: Balances, nameOf: Map<string, string>, openCheques: number): string[] {
  const out: string[] = [];
  for (const h of b.collectorHoldings) {
    const name = nameOf.get(h.collectorId) ?? "A collector";
    if (h.holding !== 0) out.push(`${name} still holds ${formatINR(h.holding)} in cash. Collect it from them and record the handover.`);
    if (h.pending > 0) out.push(`${name} has a handover of ${formatINR(h.pending)} waiting for the treasurer to confirm or reject.`);
  }
  if (openCheques > 0) out.push(`${openCheques} cheque${openCheques === 1 ? " is" : "s are"} not yet cleared or bounced.`);
  return out;
}

export async function closeReadiness(festivalId: string) {
  const [balances, collectors, openCheques, unpaid] = await Promise.all([
    getBalances(db, festivalId),
    db.user.findMany({ where: { role: "COLLECTOR" }, select: { id: true, name: true } }),
    db.collection.count({ where: { festivalId, mode: "CHEQUE", status: "VALID", chequeStatus: { in: ["RECEIVED", "DEPOSITED"] } } }),
    db.pledge.count({ where: { festivalId } }),
  ]);
  const blockers = findBlockers(balances, new Map(collectors.map((c) => [c.id, c.name])), openCheques);
  return { balances, blockers, pledgeCount: unpaid };
}

export async function closeFestival(actorId: string, festivalId: string) {
  return db.$transaction(async (tx) => {
    const f = await tx.festival.findUniqueOrThrow({ where: { id: festivalId } });
    if (f.status !== "ACTIVE") throw new Error("Only the active festival can be closed.");
    const [balances, collectors, openCheques] = await Promise.all([
      getBalances(tx, festivalId),
      tx.user.findMany({ where: { role: "COLLECTOR" }, select: { id: true, name: true } }),
      tx.collection.count({ where: { festivalId, mode: "CHEQUE", status: "VALID", chequeStatus: { in: ["RECEIVED", "DEPOSITED"] } } }),
    ]);
    const blockers = findBlockers(balances, new Map(collectors.map((c) => [c.id, c.name])), openCheques);
    if (blockers.length) throw new Error(`Cannot close yet: ${blockers[0]}`);

    await tx.festival.update({
      where: { id: festivalId },
      data: { status: "CLOSED", closingCash: balances.cashInHand, closingBank: balances.bank, endDate: f.endDate ?? new Date() },
    });
    // A festival already created for next year starts from this year's closing balance.
    const drafts = await tx.festival.updateMany({
      where: { status: "DRAFT", isHistorical: false, year: { gt: f.year } },
      data: { openingCash: balances.cashInHand, openingBank: balances.bank },
    });
    await writeAudit(
      { userId: actorId, action: "festival.close", entity: "Festival", entityId: festivalId, after: { closingCash: balances.cashInHand, closingBank: balances.bank, draftsUpdated: drafts.count } },
      tx,
    );
    return { closingCash: balances.cashInHand, closingBank: balances.bank };
  });
}

/** Admin-only correction. Only the latest closed festival can be reopened, and only if nothing else is active. */
export async function reopenFestival(actorId: string, festivalId: string, reason: string) {
  reason = reason.trim();
  if (reason.length < 3) throw new Error("Give a reason for reopening.");
  await db.$transaction(async (tx) => {
    const f = await tx.festival.findUniqueOrThrow({ where: { id: festivalId } });
    if (f.status !== "CLOSED" || f.isHistorical) throw new Error("Only a closed festival can be reopened.");
    if (await tx.festival.findFirst({ where: { status: "ACTIVE" } })) throw new Error("Another festival is active. Close it first.");
    const later = await tx.festival.findFirst({ where: { isHistorical: false, year: { gt: f.year }, status: { not: "DRAFT" } } });
    if (later) throw new Error("A later festival has already started, so this one can't be reopened.");
    await tx.festival.update({ where: { id: festivalId }, data: { status: "ACTIVE", closingCash: null, closingBank: null } });
    await writeAudit({ userId: actorId, action: "festival.reopen", entity: "Festival", entityId: festivalId, after: { reason } }, tx);
  });
}
