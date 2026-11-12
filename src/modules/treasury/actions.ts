"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { saveBill } from "@/lib/storage";
import type { FormState } from "@/modules/users/actions";
import { bankMoveSchema, expenseSchema, handoverReceivedSchema, handoverRequestSchema } from "./schema";
import {
  addExpense, createCategory, moveCheque, recordBankMove, recordHandoverReceived,
  requestHandover, resolveHandover, voidExpense,
} from "./service";

function refresh() {
  for (const p of ["/admin", "/treasurer", "/collector"]) revalidatePath(p, "layout");
}

/** Runs a service call and turns failures into form messages. */
async function run(fn: () => Promise<unknown>): Promise<FormState> {
  try {
    await fn();
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function requestHandoverAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("COLLECTOR");
  const parsed = handoverRequestSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return run(() => requestHandover(user, parsed.data));
}

export async function recordHandoverReceivedAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  const parsed = handoverReceivedSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return run(() => recordHandoverReceived(user, parsed.data));
}

export async function resolveHandoverAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  const decision = fd.get("decision") === "CONFIRMED" ? "CONFIRMED" : "REJECTED";
  return run(() => resolveHandover(user, String(fd.get("id")), decision, String(fd.get("note") ?? "")));
}

export async function moveChequeAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  const step = String(fd.get("step"));
  if (step !== "deposit" && step !== "clear" && step !== "bounce") return { error: "Unknown action." };
  return run(() => moveCheque(user, String(fd.get("id")), step, String(fd.get("reason") ?? "")));
}

export async function bankMoveAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  const parsed = bankMoveSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return run(() => recordBankMove(user, parsed.data));
}

export async function addExpenseAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  const parsed = expenseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const bill = fd.get("bill");
  return run(async () => {
    const key = bill instanceof File && bill.size > 0 ? await saveBill(bill) : null;
    await addExpense(user, parsed.data, key);
  });
}

export async function voidExpenseAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  return run(() => voidExpense(user, String(fd.get("id")), String(fd.get("reason") ?? "")));
}

export async function createCategoryAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  return run(() => createCategory(user, String(fd.get("name") ?? "")));
}
