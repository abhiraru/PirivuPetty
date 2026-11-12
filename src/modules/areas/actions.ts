"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/modules/users/actions";
import { assignCollector, createArea } from "./service";

export async function createAreaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  try {
    await createArea(admin.id, String(formData.get("name") ?? ""), String(formData.get("description") ?? ""));
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/areas");
  return { ok: true };
}

export async function assignCollectorAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const collectorId = String(formData.get("collectorId") ?? "");
  await assignCollector(admin.id, String(formData.get("festivalId")), String(formData.get("areaId")), collectorId || null);
  revalidatePath("/admin/areas");
}
