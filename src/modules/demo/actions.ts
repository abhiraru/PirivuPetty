"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { FormState } from "@/modules/users/actions";
import { loadDemo, removeDemo } from "./service";

function refresh() {
  for (const p of ["/admin", "/treasurer", "/collector"]) revalidatePath(p, "layout");
}

export async function loadDemoAction(): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  try {
    await loadDemo(admin.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function removeDemoAction(): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  try {
    await removeDemo(admin.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}
