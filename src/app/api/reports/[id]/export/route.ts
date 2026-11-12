import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { buildReport } from "@/modules/reports/build";
import { paiseToRupees } from "@/lib/money";
import { resolveFestival } from "@/components/ReportView";
import { applyView, parseView } from "@/modules/reports/view";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("ADMIN", "TREASURER");
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const festival = await resolveFestival(query.festival);
  const report = festival ? await buildReport(id, festival.id) : null;
  if (!report) return new Response("Not found", { status: 404 });

  // Same filters as the screen, every matching row.
  const tables = applyView(report.tables, parseView(query), false);
  const wb = new ExcelJS.Workbook();
  const used = new Set<string>();
  for (const t of tables) {
    let name = t.title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${name.slice(0, 28)} ${n}`;
    used.add(name.toLowerCase());
    const ws = wb.addWorksheet(name);
    ws.addRow([`${report.title} - ${report.festivalName}`]).font = { bold: true, size: 13 };
    ws.addRow([t.title]);
    ws.addRow(t.cols.map((c) => c.label)).font = { bold: true };
    const put = (r: Record<string, string | number | null>, bold = false) => {
      const row = ws.addRow(t.cols.map((c) => (c.kind === "money" && typeof r[c.key] === "number" ? paiseToRupees(r[c.key] as number) : r[c.key] ?? null)));
      t.cols.forEach((c, i) => { if (c.kind === "money") row.getCell(i + 1).numFmt = "#,##0.00"; });
      if (bold) row.font = { bold: true };
    };
    t.rows.forEach((r) => put(r));
    if (t.totalRow) put(t.totalRow, true);
    t.cols.forEach((c, i) => (ws.getColumn(i + 1).width = Math.max(14, c.label.length + 4)));
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${id}-${festival!.year}.xlsx"`,
    },
  });
}
