import ExcelJS from "exceljs";
import { Readable } from "node:stream";

export const TEMPLATE_COLUMNS = ["name", "phone", "address", "area", "amount", "year"] as const;

export type RawRow = {
  line: number;
  name: string;
  phone: string;
  address: string;
  area: string;
  amount: string;
  year: string;
};

const ALIASES: Record<string, (typeof TEMPLATE_COLUMNS)[number]> = {
  name: "name",
  "household name": "name",
  "head name": "name",
  phone: "phone",
  mobile: "phone",
  "phone number": "phone",
  address: "address",
  area: "area",
  street: "area",
  amount: "amount",
  "amount (rs)": "amount",
  year: "year",
};

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("text" in v) return String(v.text).trim();
    if ("result" in v) return String(v.result ?? "").trim();
    if (v instanceof Date) return v.toISOString();
    return "";
  }
  return String(v).trim();
}

export async function parseSheet(buffer: Buffer, fileName: string): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook();
  if (fileName.toLowerCase().endsWith(".csv")) await wb.csv.read(Readable.from(buffer));
  else await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("The file has no sheet.");

  const colIndex: Partial<Record<(typeof TEMPLATE_COLUMNS)[number], number>> = {};
  sheet.getRow(1).eachCell((cell, col) => {
    const key = ALIASES[cellText(cell.value).toLowerCase()];
    if (key) colIndex[key] = col;
  });
  for (const required of ["name", "address", "area"] as const) {
    if (!colIndex[required]) throw new Error(`Missing a "${required}" column in the first row.`);
  }

  const rows: RawRow[] = [];
  sheet.eachRow((row, line) => {
    if (line === 1) return;
    const get = (k: (typeof TEMPLATE_COLUMNS)[number]) => (colIndex[k] ? cellText(row.getCell(colIndex[k]!).value) : "");
    const r = { line, name: get("name"), phone: get("phone"), address: get("address"), area: get("area"), amount: get("amount"), year: get("year") };
    if (Object.values({ ...r, line: "" }).some(Boolean)) rows.push(r);
  });
  if (rows.length === 0) throw new Error("The file has no data rows.");
  if (rows.length > 5000) throw new Error("Too many rows. Split the file into parts of at most 5000 rows.");
  return rows;
}
