"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createUserSchema } from "./schema";
import { changeOwnPassword, createUser, resetPassword, setUserActive } from "./service";

export type FormState = { error?: string; ok?: boolean; message?: string };

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await createUser(admin.id, parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  await setUserActive(admin.id, String(formData.get("id")), formData.get("active") === "true");
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  try {
    await resetPassword(admin.id, String(formData.get("id")), String(formData.get("password") ?? ""));
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { ok: true };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("ADMIN", "TREASURER", "COLLECTOR");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { error: "The two new passwords do not match." };
  try {
    await changeOwnPassword(user.id, String(formData.get("current") ?? ""), next);
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { ok: true };
}
