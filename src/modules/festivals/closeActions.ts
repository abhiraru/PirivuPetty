"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/modules/users/actions";
import { closeFestival, reopenFestival } from "./close";
import { closingCheckSchema, openingSchema } from "./schema";
import { saveClosingCheck, updateOpening } from "./service";

function refresh() {
  for (const p of ["/admin", "/treasurer", "/collector"]) revalidatePath(p, "layout");
}

export async function closeFestivalAction(_p: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  try {
    await closeFestival(admin.id, String(fd.get("id")));
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function reopenFestivalAction(_p: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  try {
    await reopenFestival(admin.id, String(fd.get("id")), String(fd.get("reason") ?? ""));
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function saveClosingCheckAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("TREASURER");
  const parsed = closingCheckSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await saveClosingCheck(user, parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function updateOpeningAction(_p: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const parsed = openingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await updateOpening(admin.id, parsed.data.id, parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/festivals");
  return { ok: true };
}
