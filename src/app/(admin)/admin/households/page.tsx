import Link from "next/link";
import { Pager } from "@/components/Pager";
import { Icon } from "@/components/ui/Icon";
import { btn } from "@/components/ui/btn";
import { formatINR } from "@/lib/money";
import { PAGE_SIZES, parsePage, parseSize } from "@/lib/pagination";
import { listAreasWithCounts } from "@/modules/areas/queries";
import { toggleHouseholdAction } from "@/modules/households/actions";
import { searchHouseholds, type GaveFilter } from "@/modules/households/queries";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/PageHeader";

type SP = Record<string, string | undefined>;
const field = "rounded-xl border bg-card px-2.5 py-1.5 text-sm font-normal text-fg";
const label = "text-xs font-semibold text-gray-500";

export default async function HouseholdsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const size = parseSize(sp.size);
  const gave: GaveFilter = sp.gave === "gave" || sp.gave === "none" ? sp.gave : undefined;
  const [{ rows, window: w, lastYear }, areas] = await Promise.all([
    searchHouseholds({ q: sp.q, areaId: sp.area, gave, page: parsePage(sp.page), size }),
    listAreasWithCounts(),
  ]);
  const keep: SP = {};
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") keep[k] = v;
  const filtered = !!(sp.q || sp.area || gave);

  return (
    <div className="space-y-4">
      <PageHeader title="Households" subtitle={`${w.total} household${w.total === 1 ? "" : "s"}${filtered ? " match" : ""}`}>
        <Link href="/admin/households/new" className={btn("primary")}><Icon name="plus" />Add household</Link>
        <Link href="/admin/households/import" className={btn("secondary")}><Icon name="upload" />Import from Excel</Link>
      </PageHeader>

      <form className="grid gap-3 rounded-[18px] border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto_auto]" aria-label="Household filters">
        <label className={label}>Search
          <input name="q" defaultValue={sp.q} placeholder="Name, address or phone" className={`${field} mt-1 w-full`} />
        </label>
        <label className={label}>Area
          <select name="area" defaultValue={sp.area ?? ""} className={`${field} mt-1 w-full`}>
            <option value="">All areas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        {lastYear !== null && (
          <div className={label}>Gave in {lastYear}<div className="mt-1"><Segmented name="gave" label={`Gave in ${lastYear}`} value={sp.gave ?? ""} options={[{ value: "", label: "Any" }, { value: "gave", label: "Gave" }, { value: "none", label: "Did not give" }]} /></div></div>
        )}
        <div className={label}>Rows per page<div className="mt-1"><Segmented name="size" label="Rows per page" value={String(size)} options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))} /></div></div>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
          <button className="btn btn-primary">Apply</button>
          <Link href="/admin/households" className="btn btn-secondary btn-sm">Reset</Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-gray-500">{filtered ? "No households match these filters." : "No households yet."}</p>
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {rows.map((h) => (
              <li key={h.id} className="grid gap-x-4 gap-y-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <span className="font-semibold">{h.headName}</span>
                  {!h.isActive && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">inactive</span>}
                  <p className="truncate text-sm text-gray-500">{h.area.name} · {h.address}{h.phone ? ` · ${h.phone}` : ""}</p>
                </div>

                <div className="text-sm sm:min-w-[11rem] sm:text-right">
                  {lastYear !== null && (
                    <p>
                      <span className="text-gray-500">{lastYear}: </span>
                      {h.lastYearAmount ? (
                        <span className="rounded-full bg-good-bg px-2.5 py-0.5 font-bold tabular-nums text-good">{formatINR(h.lastYearAmount)}</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-semibold text-gray-500">did not give</span>
                      )}
                    </p>
                  )}
                  {h.earlier.length > 0 && <p className="mt-0.5 text-xs text-gray-500 tabular-nums">Earlier: {h.earlier.map((y) => `${y.year} ${formatINR(y.amount)}`).join(" · ")}</p>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/households/${h.id}`} className={btn("secondary", "sm")}>Open<Icon name="arrow" /></Link>
  
                  <form action={toggleHouseholdAction}>
                    <input type="hidden" name="id" value={h.id} />
                    <input type="hidden" name="active" value={String(!h.isActive)} />
                    <button className="btn btn-secondary btn-sm">{h.isActive ? "Deactivate" : "Activate"}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <Pager pathname="/admin/households" params={keep} page={w.page} pages={w.pages} total={w.total} from={w.from} to={w.to} />
        </>
      )}
    </div>
  );
}
