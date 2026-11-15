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
  let message: string | undefined;
  try {
    const r = await activateFestival(admin.id, String(formData.get("id")));
    if (r.copied > 0) message = `Activated. ${r.copied} collector area assignment${r.copied === 1 ? " was" : "s were"} copied from ${r.from}. Check them on the Areas page.`;
  } catch (e) {
    return { error: (e as Error).message };
  }
  for (const p of ["/admin", "/treasurer", "/collector"]) revalidatePath(p, "layout");
  return { ok: true, message };
}
