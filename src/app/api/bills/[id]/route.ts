import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { readBill } from "@/lib/storage";

/** Bills are financial records: only the treasurer and admin can open them, and the storage address is never shown to the browser. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("ADMIN", "TREASURER");
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const expense = await db.expense.findUnique({ where: { id }, select: { attachmentUrl: true } });
  const file = await readBill(expense?.attachmentUrl ?? null);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
