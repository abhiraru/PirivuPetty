"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/modules/users/actions";
import { collectionSchema, pledgeSchema } from "./schema";
import { recordCollection, savePledge, voidCollection } from "./service";

const ALL = ["ADMIN", "TREASURER", "COLLECTOR"] as const;

function refresh() {
  for (const p of ["/admin", "/treasurer", "/collector"]) revalidatePath(p, "layout");
}

export async function savePledgeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(...ALL);
  const parsed = pledgeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await savePledge(user, parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function recordCollectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole(...ALL);
  const parsed = collectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await recordCollection(user, parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function voidCollectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("ADMIN", "TREASURER");
  try {
    await voidCollection(user, String(formData.get("id")), String(formData.get("reason") ?? ""));
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}
