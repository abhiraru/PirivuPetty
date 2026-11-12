"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/modules/users/actions";
import { closeFestival, reopenFestival } from "./close";

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
