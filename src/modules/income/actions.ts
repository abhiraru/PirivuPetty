"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/modules/users/actions";
import { incomeSchema } from "./schema";
import { addIncome, voidIncome } from "./service";

function refresh() {
  for (const p of ["/admin", "/treasurer"]) revalidatePath(p, "layout");
}

export async function addIncomeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  const parsed = incomeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await addIncome(user, parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function voidIncomeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  try {
    await voidIncome(user, String(fd.get("id")), String(fd.get("reason") ?? ""));
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}
