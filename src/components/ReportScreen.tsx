import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PAGE_SIZES } from "@/lib/pagination";
import { formatINR } from "@/lib/money";
import { buildReport } from "@/modules/reports/build";
import type { Cell, Col } from "@/modules/reports/types";
import { applyView, filterOptions, hasDateFilter, parseView } from "@/modules/reports/view";
import { Pager } from "./Pager";
import { PrintButton } from "./PrintButton";
import { resolveFestival } from "./ReportView";
import { Segmented } from "@/components/ui/Segmented";

type SP = Record<string, string | undefined>;

function show(c: Col, v: Cell) {
  if (v === null || v === undefined || v === "") return "";
  if (c.kind === "money" && typeof v === "number") return formatINR(v);
  return String(v);
}

const field = "rounded-xl border bg-card px-2.5 py-1.5 text-sm";

/** One report with festival picker, search, dropdown and date filters, page size, per-table paging, and an Excel link that carries the same filters. */
export async function ReportScreen({ basePath, id, searchParams }: { basePath: string; id: string; searchParams: SP }) {
  const festival = await resolveFestival(searchParams.festival);
  if (!festival) notFound();
  const [report, festivals] = await Promise.all([buildReport(id, festival.id), db.festival.findMany({ orderBy: { year: "desc" } })]);
  if (!report) notFound();

  const view = parseView(searchParams);
  const options = filterOptions(report.tables);
  const dates = hasDateFilter(report.tables);
  const tables = applyView(report.tables, view, true);
  const pathname = `${basePath}/reports/${id}`;

  // Everything except page numbers, so the Excel link and the pager links keep the filters.
  const keep: SP = {};
  for (const [k, v] of Object.entries(searchParams)) if (v && !/^p\d+$/.test(k)) keep[k] = v;
  keep.festival = festival.id;
  const exportHref = `/api/reports/${id}/export?${new URLSearchParams(Object.entries(keep).filter(([k]) => k !== "size") as [string, string][]).toString()}`;
  const active = Object.keys(searchParams).some((k) => (k === "q" || k.startsWith("f_") || k === "from" || k === "to") && searchParams[k]);
  const searchable = report.tables.some((t) => t.cols.some((c) => c.kind === "text" || !c.kind) && t.rows.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`${basePath}/reports?festival=${festival.id}`} className="btn btn-secondary btn-sm">All reports</Link>
        <div className="flex gap-4 text-sm">
          <PrintButton />
          <a href={exportHref} className="btn btn-secondary btn-sm">Download Excel{active ? " (filtered)" : ""}</a>
        </div>
      </div>
      <h2 className="text-xl font-extrabold tracking-tight">{report.title}</h2>

      <form className="grid gap-3 rounded-[18px] border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden" aria-label="Report filters">
        <label className="text-xs font-semibold text-gray-500">Festival
          <select name="festival" defaultValue={festival.id} className={`${field} mt-1 w-full font-normal text-fg`}>
            {festivals.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        {searchable && (
          <label className="text-xs font-semibold text-gray-500">Search
            <input name="q" defaultValue={view.q} placeholder="Name, area, status..." className={`${field} mt-1 w-full font-normal text-fg`} />
          </label>
        )}
        {options.map((o) => (
          <label key={o.key} className="text-xs font-semibold text-gray-500">{o.label}
            <select name={`f_${o.key}`} defaultValue={view.filters[o.key] ?? ""} className={`${field} mt-1 w-full font-normal text-fg`}>
              <option value="">All</option>
              {o.values.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ))}
        {dates && (
          <>
            <label className="text-xs font-semibold text-gray-500">From date
              <input type="date" name="from" defaultValue={view.from} className={`${field} mt-1 w-full font-normal text-fg`} />
            </label>
            <label className="text-xs font-semibold text-gray-500">To date
              <input type="date" name="to" defaultValue={view.to} className={`${field} mt-1 w-full font-normal text-fg`} />
            </label>
          </>
        )}
        <div className="text-xs font-semibold text-gray-500">Rows per page<div className="mt-1"><Segmented name="size" label="Rows per page" value={String(view.size)} options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))} /></div></div>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-1">
          <button className="btn btn-primary">Apply</button>
          <Link href={`${pathname}?festival=${festival.id}`} className="btn btn-secondary btn-sm">Reset</Link>
        </div>
      </form>
      <p className="-mt-2 text-sm text-gray-500 print:hidden">{report.festivalName}{active ? " · filters applied" : ""}</p>

      {tables.map((t) => (
        <section key={t.title} className="space-y-1">
          <h3 className="font-bold">{t.title}</h3>
          {t.note && <p className="text-xs text-gray-500">{t.note}</p>}
          {t.total === 0 ? (
            <p className="rounded-xl border bg-card p-4 text-sm text-gray-500">{active ? "Nothing matches these filters." : "Nothing to show."}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100">
                    <tr>{t.cols.map((c) => <th key={c.key} className={`p-2 ${c.kind === "money" || c.kind === "int" ? "text-right" : ""}`}>{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, i) => (
                      <tr key={i} className="border-t">
                        {t.cols.map((c) => <td key={c.key} className={`p-2 ${c.kind === "money" || c.kind === "int" ? "text-right tabular-nums" : ""}`}>{show(c, r[c.key])}</td>)}
                      </tr>
                    ))}
                    {t.totalRow && (
                      <tr className="border-t bg-gray-50 font-semibold">
                        {t.cols.map((c, i) => <td key={c.key} className={`p-2 ${c.kind === "money" || c.kind === "int" ? "text-right tabular-nums" : ""}`}>{i === 0 ? (active ? "Total (filtered)" : "Total") : show(c, t.totalRow![c.key] ?? null)}</td>)}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pager pathname={pathname} params={keep} pageKey={`p${t.index}`} page={t.page} pages={t.pages} total={t.total} from={t.from} to={t.to} />
            </>
          )}
        </section>
      ))}
    </div>
  );
}
