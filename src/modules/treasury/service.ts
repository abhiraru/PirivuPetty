import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/permissions";
import { assertBalancesValid, getBalances } from "./balances";
import type { z } from "zod";
import type { bankMoveSchema, expenseSchema } from "./schema";

async function activeFestival() {
  const f = await db.festival.findFirst({ where: { status: "ACTIVE" } });
  if (!f) throw new Error("There is no active festival.");
  return f;
}

function treasurerOnly(user: SessionUser) {
  if (user.role !== "TREASURER") throw new Error("Only the treasurer can do that.");
}

// ---- Handovers -------------------------------------------------------------

/** A collector asks to hand cash to the treasurer. Counts only once the treasurer confirms. */
export async function requestHandover(user: SessionUser, input: { amount: number; note?: string }) {
  if (user.role !== "COLLECTOR") throw new Error("Only collectors can request a handover.");
  const f = await activeFestival();
  return db.$transaction(async (tx) => {
    const b = await getBalances(tx, f.id);
    if (input.amount > (b.available[user.id] ?? 0)) throw new Error("That is more cash than you have not yet handed over.");
    const h = await tx.handover.create({ data: { festivalId: f.id, collectorId: user.id, amount: input.amount, note: input.note ?? null } });
    await writeAudit({ userId: user.id, action: "handover.request", entity: "Handover", entityId: h.id, after: { amount: h.amount } }, tx);
    return h;
  });
}

/** The treasurer records cash received from a collector, already confirmed. */
export async function recordHandoverReceived(user: SessionUser, input: { collectorId: string; amount: number; note?: string }) {
  treasurerOnly(user);
  const f = await activeFestival();
  return db.$transaction(async (tx) => {
    const c = await tx.user.findUnique({ where: { id: input.collectorId } });
    if (!c || c.role !== "COLLECTOR") throw new Error("Choose a collector.");
    const b = await getBalances(tx, f.id);
    if (input.amount > (b.available[c.id] ?? 0)) throw new Error(`${c.name} only has ${(b.available[c.id] ?? 0) / 100} rupees not yet handed over.`);
    const h = await tx.handover.create({
      data: { festivalId: f.id, collectorId: c.id, amount: input.amount, status: "CONFIRMED", confirmedBy: user.id, note: input.note ?? null },
    });
    await writeAudit({ userId: user.id, action: "handover.record", entity: "Handover", entityId: h.id, after: { collectorId: c.id, amount: h.amount } }, tx);
    return h;
  });
}

export async function resolveHandover(user: SessionUser, id: string, decision: "CONFIRMED" | "REJECTED", note?: string) {
  treasurerOnly(user);
  await db.$transaction(async (tx) => {
    const h = await tx.handover.findUniqueOrThrow({ where: { id } });
    if (h.status !== "PENDING") throw new Error("That handover was already dealt with.");
    const f = await tx.festival.findUniqueOrThrow({ where: { id: h.festivalId } });
    if (f.status !== "ACTIVE") throw new Error("That festival is not active.");
    await tx.handover.update({ where: { id }, data: { status: decision, confirmedBy: user.id, note: note || h.note } });
    await assertBalancesValid(tx, h.festivalId);
    await writeAudit({ userId: user.id, action: decision === "CONFIRMED" ? "handover.confirm" : "handover.reject", entity: "Handover", entityId: id, after: { amount: h.amount } }, tx);
  });
}

// ---- Cheques ---------------------------------------------------------------

const CHEQUE_FLOW = {
  deposit: { from: ["RECEIVED"], to: "DEPOSITED" },
  clear: { from: ["DEPOSITED"], to: "CLEARED" },
  bounce: { from: ["RECEIVED", "DEPOSITED"], to: "BOUNCED" },
} as const;

export async function moveCheque(user: SessionUser, id: string, step: keyof typeof CHEQUE_FLOW, reason?: string) {
  treasurerOnly(user);
  const rule = CHEQUE_FLOW[step];
  await db.$transaction(async (tx) => {
    const c = await tx.collection.findUniqueOrThrow({ where: { id }, include: { festival: true } });
    if (c.mode !== "CHEQUE" || c.status !== "VALID") throw new Error("That is not an open cheque.");
    if (c.festival.status !== "ACTIVE") throw new Error("That festival is not active.");
    if (!c.chequeStatus || !(rule.from as readonly string[]).includes(c.chequeStatus)) throw new Error(`A ${c.chequeStatus?.toLowerCase()} cheque cannot be moved that way.`);
    // A bounced cheque is voided, so it drops out of the household's paid amount and every total.
    await tx.collection.update({
      where: { id },
      data:
        rule.to === "BOUNCED"
          ? { chequeStatus: "BOUNCED", status: "VOIDED", voidReason: reason?.trim() || "Cheque bounced" }
          : { chequeStatus: rule.to },
    });
    await assertBalancesValid(tx, c.festivalId);
    await writeAudit({ userId: user.id, action: `cheque.${step}`, entity: "Collection", entityId: id, before: { status: c.chequeStatus }, after: { status: rule.to } }, tx);
  });
}

// ---- Bank ------------------------------------------------------------------

export async function recordBankMove(user: SessionUser, input: z.infer<typeof bankMoveSchema>) {
  treasurerOnly(user);
  const f = await activeFestival();
  return db.$transaction(async (tx) => {
    const t = await tx.bankTransaction.create({
      data: { festivalId: f.id, type: input.type, amount: input.amount, date: input.date ?? new Date(), reference: input.reference ?? null, createdById: user.id },
    });
    await assertBalancesValid(tx, f.id);
    await writeAudit({ userId: user.id, action: `bank.${input.type.toLowerCase()}`, entity: "BankTransaction", entityId: t.id, after: { amount: t.amount } }, tx);
    return t;
  });
}

// ---- Expenses --------------------------------------------------------------

export async function createCategory(user: SessionUser, name: string) {
  treasurerOnly(user);
  name = name.trim();
  if (name.length < 2) throw new Error("Enter a category name.");
  const dup = await db.expenseCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (dup) throw new Error("That category already exists.");
  await db.expenseCategory.create({ data: { name } });
}

export async function addExpense(user: SessionUser, input: z.infer<typeof expenseSchema>, attachmentUrl?: string | null) {
  treasurerOnly(user);
  const f = await activeFestival();
  return db.$transaction(async (tx) => {
    const e = await tx.expense.create({
      data: {
        festivalId: f.id,
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        paidFrom: input.paidFrom,
        paidOn: input.paidOn ?? new Date(),
        vendor: input.vendor ?? null,
        billReference: input.billReference ?? null,
        attachmentUrl: attachmentUrl ?? null,
        createdById: user.id,
      },
    });
    await assertBalancesValid(tx, f.id);
    await writeAudit({ userId: user.id, action: "expense.create", entity: "Expense", entityId: e.id, after: { amount: e.amount, paidFrom: e.paidFrom } }, tx);
    return e;
  });
}

export async function voidExpense(user: SessionUser, id: string, reason: string) {
  treasurerOnly(user);
  reason = reason.trim();
  if (reason.length < 3) throw new Error("Give a reason for voiding.");
  await db.$transaction(async (tx) => {
    const e = await tx.expense.findUniqueOrThrow({ where: { id }, include: { festival: true } });
    if (e.status === "VOIDED") throw new Error("Already voided.");
    if (e.festival.status !== "ACTIVE") throw new Error("Only expenses in the active festival can be voided.");
    await tx.expense.update({ where: { id }, data: { status: "VOIDED", voidReason: reason } });
    await assertBalancesValid(tx, e.festivalId);
    await writeAudit({ userId: user.id, action: "expense.void", entity: "Expense", entityId: id, before: { amount: e.amount }, after: { reason } }, tx);
  });
}
