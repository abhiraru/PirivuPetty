"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/modules/users/actions";
import { householdSchema } from "./schema";
import { createHousehold, setHouseholdActive, updateHousehold } from "./service";

export async function saveHouseholdAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  // Editing is admin-only; adding is also open to collectors (limited to their areas in the service).
  const user = id ? await requireRole("ADMIN") : await requireRole("ADMIN", "COLLECTOR");
  const parsed = householdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    if (id) await updateHousehold(user.id, id, parsed.data);
    else await createHousehold(user, parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  for (const p of ["/admin", "/collector", "/treasurer"]) revalidatePath(p, "layout");
  return { ok: true };
}

export async function toggleHouseholdAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  await setHouseholdActive(admin.id, String(formData.get("id")), formData.get("active") === "true");
  revalidatePath("/admin/households");
}
