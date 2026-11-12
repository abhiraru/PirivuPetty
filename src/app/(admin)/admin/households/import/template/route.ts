import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { TEMPLATE_COLUMNS } from "@/modules/imports/parse";

export async function GET() {
  try {
    await requireRole("ADMIN");
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Households");
  ws.addRow([...TEMPLATE_COLUMNS]);
  ws.getRow(1).font = { bold: true };
  ws.addRow(["Ravi Kumar", "9876543210", "12 Temple Street", "North Street", 500, 2025]);
  ws.addRow(["Ravi Kumar", "9876543210", "12 Temple Street", "North Street", 400, 2024]);
  ws.addRow(["Meena Devi", "", "4 Lake Road", "Lake Side", 1000, 2025]);
  ws.columns.forEach((c) => (c.width = 20));
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="household-import-template.xlsx"',
    },
  });
}
