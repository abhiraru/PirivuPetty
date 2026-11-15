import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { toRow } from "@/lib/exportRows";

/** Every record in one Excel file, one sheet per table. Admin only. Password hashes are never included. */
export async function GET() {
  let admin;
  try {
    admin = await requireRole("ADMIN");
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const tables: [string, Promise<Record<string, unknown>[]>][] = [
    ["Users", db.user.findMany({ orderBy: { createdAt: "asc" } })],
    ["Festivals", db.festival.findMany({ orderBy: { year: "asc" } })],
    ["Areas", db.area.findMany({ orderBy: { name: "asc" } })],
    ["Area assignments", db.areaAssignment.findMany()],
    ["Households", db.household.findMany({ orderBy: { createdAt: "asc" } })],
    ["Pledges", db.pledge.findMany({ orderBy: { createdAt: "asc" } })],
    ["Collections", db.collection.findMany({ orderBy: { collectedOn: "asc" } })],
    ["Handovers", db.handover.findMany({ orderBy: { handedOn: "asc" } })],
    ["Bank transactions", db.bankTransaction.findMany({ orderBy: { date: "asc" } })],
    ["Expense categories", db.expenseCategory.findMany()],
    ["Other income", db.otherIncome.findMany({ orderBy: { receivedOn: "asc" } })],
    ["Expenses", db.expense.findMany({ orderBy: { paidOn: "asc" } })],
    ["Audit log", db.auditLog.findMany({ orderBy: { createdAt: "asc" } })],
  ];

  const wb = new ExcelJS.Workbook();
  for (const [name, query] of tables) {
    const rows = (await query).map(toRow);
    const ws = wb.addWorksheet(name);
    const cols = rows.length ? Object.keys(rows[0]) : ["(no records)"];
    ws.addRow(cols).font = { bold: true };
    for (const r of rows) ws.addRow(cols.map((c) => r[c] ?? null));
    cols.forEach((_, i) => (ws.getColumn(i + 1).width = 18));
  }
  await writeAudit({ userId: admin.id, action: "backup.export", entity: "System" });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response((await wb.xlsx.writeBuffer()) as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="festival-funds-backup-${stamp}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
