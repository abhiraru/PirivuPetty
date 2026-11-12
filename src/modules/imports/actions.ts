"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { parseSheet } from "./parse";
import { commitImport, planImport, undoImport, type ImportPlan } from "./service";
import { validateRows, type CleanRow, type RowResult } from "./validate";

export type PreviewState = {
  error?: string;
  fileName?: string;
  results?: RowResult[];
  plan?: ImportPlan;
  done?: { createdHouseholds: number; createdCollections: number; skippedCollections: number; batchId: string };
};

export async function previewImportAction(_prev: PreviewState, formData: FormData): Promise<PreviewState> {
  await requireRole("ADMIN");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };
  if (file.size > 4_000_000) return { error: "File is too large (4 MB max)." };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { error: "Use an .xlsx or .csv file." };

  const defaultYear = Number(formData.get("defaultYear")) || null;
  try {
    const rows = await parseSheet(Buffer.from(await file.arrayBuffer()), file.name);
    const results = validateRows(rows, defaultYear);
    const plan = await planImport(results.flatMap((r) => (r.clean ? [r.clean] : [])));
    return { fileName: file.name, results, plan };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const cleanRowSchema = z.object({
  line: z.number(),
  name: z.string().min(2),
  phone: z.string(),
  address: z.string().min(2),
  area: z.string().min(1),
  amountPaise: z.number().int().min(0).nullable(),
  year: z.number().int().min(2000).max(2100).nullable(),
});

/** Re-validates what the browser sends back; only valid rows are imported. */
export async function confirmImportAction(_prev: PreviewState, formData: FormData): Promise<PreviewState> {
  const admin = await requireRole("ADMIN");
  let rows: CleanRow[];
  try {
    rows = z.array(cleanRowSchema).parse(JSON.parse(String(formData.get("rows"))));
  } catch {
    return { error: "Could not read the rows. Upload the file again." };
  }
  if (rows.length === 0) return { error: "There are no valid rows to import." };
  try {
    const done = await commitImport(admin.id, String(formData.get("fileName") ?? "import"), rows);
    revalidatePath("/admin/households");
    revalidatePath("/admin/areas");
    revalidatePath("/admin/festivals");
    return { done };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function undoImportAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  await undoImport(admin.id, String(formData.get("batchId")));
  revalidatePath("/admin/households");
  revalidatePath("/admin/households/import");
}
