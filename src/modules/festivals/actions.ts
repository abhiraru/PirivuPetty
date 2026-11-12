"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/modules/users/actions";
import { createFestivalSchema } from "./schema";
import { activateFestival, createFestival } from "./service";

export async function createFestivalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const parsed = createFestivalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await createFestival(admin.id, parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/festivals");
  return { ok: true };
}

export async function activateFestivalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  try {
    await activateFestival(admin.id, String(formData.get("id")));
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/festivals");
  return { ok: true };
}
