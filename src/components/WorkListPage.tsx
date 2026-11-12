import Link from "next/link";
import { formatINR } from "@/lib/money";
import { PAGE_SIZES, paginate, parsePage, parseSize } from "@/lib/pagination";
import type { SessionUser } from "@/lib/permissions";
import { listAreasWithCounts } from "@/modules/areas/queries";
import { assignedAreaIds } from "@/modules/collections/access";
import { collectorSummary, listWorkHouseholds } from "@/modules/collections/queries";
import { filterByStatus, summarize, WORK_STATUSES } from "@/modules/collections/workList";
import { getActiveFestival } from "@/modules/festivals/queries";
import { CallButton } from "./CallButton";
import { Pager } from "./Pager";
import { Icon } from "./ui/Icon";
import { btn } from "./ui/btn";
import { Segmented } from "@/components/ui/Segmented";

type SP = { q?: string; area?: string; status?: string; page?: string; size?: string };
const field = "rounded-xl border bg-card px-2.5 py-1.5 text-sm font-normal text-fg";
const label = "text-xs font-semibold text-gray-500";

/**
 * Households to work on in the active festival, paged. Collectors see only their assigned areas.
 * `basePath` is the role's home (household links are `${basePath}/households/:id`); `listPath` is this list's own address.
 */
export async function WorkListPage({ user, basePath, listPath, params }: { user: SessionUser; basePath: string; listPath: string; params: SP }) {
  const festival = await getActiveFestival();
  if (!festival) return <p>No festival is active right now.</p>;

  const areaIds = user.role === "COLLECTOR" ? await assignedAreaIds(festival.id, user.id) : undefined;
  const [all, allAreas, summary] = await Promise.all([
    listWorkHouseholds({ festivalId: festival.id, festivalYear: festival.year, areaIds, areaId: params.area, q: params.q }),
    listAreasWithCounts(),
    user.role === "COLLECTOR" ? collectorSummary(festival.id, user.id) : Promise.resolve(null),
  ]);
  const areas = areaIds ? allAreas.filter((a) => areaIds.includes(a.id)) : allAreas;

  // Totals and paging cover every matching household, not just the page on screen.
  const matching = filterByStatus(all, params.status);
  const totals = summarize(matching);
  const size = parseSize(params.size);
  const w = paginate(matching.length, parsePage(params.page), size);
  const rows = matching.slice(w.skip, w.skip + w.size);
  const filtered = !!(params.q || params.area || params.status);

  const keep: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") keep[k] = v;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold tracking-tight">{festival.name}</h2>
        {user.role === "COLLECTOR" && <Link href="/collector/households/new" className={btn("primary", "sm")}><Icon name="plus" />Add household</Link>}
      </div>
      {summary && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 text-sm sm:grid-cols-4">
          <div><p className="text-gray-500">Collected</p><p className="font-medium">{formatINR(summary.total)}</p></div>
          <div><p className="text-gray-500">Cash (in hand)</p><p className="font-medium">{formatINR(summary.cash)}</p></div>
          <div><p className="text-gray-500">Cheque / online</p><p className="font-medium">{formatINR(summary.cheque + summary.online)}</p></div>
          <div><p className="text-gray-500">Cash still with you</p><p className="font-medium">{formatINR(summary.holding)}</p></div>
        </div>
      )}
      {areaIds && areaIds.length === 0 && <p className="text-sm text-gray-600">You have no area assigned yet. Ask the admin.</p>}

      <form className="grid gap-3 rounded-[18px] border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Household filters">
        <label className={`${label} lg:col-span-2`}>Search
          <input name="q" defaultValue={params.q} placeholder="Name, address or phone" className={`${field} mt-1 w-full`} />
        </label>
        {areas.length > 1 && (
          <label className={label}>Area
            <select name="area" defaultValue={params.area ?? ""} className={`${field} mt-1 w-full`}>
              <option value="">All areas</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}
        <label className={label}>Promise status
          <select name="status" defaultValue={params.status ?? ""} className={`${field} mt-1 w-full`}>
            <option value="">All</option>
            {WORK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className={label}>Rows per page<div className="mt-1"><Segmented name="size" label="Rows per page" value={String(size)} options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))} /></div></div>
        <div className="flex items-end gap-3">
          <button className="btn btn-primary">Apply</button>
          <Link href={listPath} className="btn btn-secondary btn-sm">Reset</Link>
        </div>
      </form>

      <p className="text-sm text-gray-500">
        {totals.count} household{totals.count === 1 ? "" : "s"}{filtered ? " match" : ""} · promised {formatINR(totals.pledged)} · paid {formatINR(totals.paid)}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-gray-500">{filtered ? "No households match these filters." : "No households to show."}</p>
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-semibold">{r.headName}</p>
                  <p className="text-sm text-gray-500">
                    {r.areaName} · {r.address}{r.phone ? ` · ${r.phone}` : ""}
                    {r.lastYear && ` · last gave ${formatINR(r.lastYear.amount)} (${r.lastYear.year})`}
                  </p>
                </div>
                <p className="text-sm tabular-nums">
                  {r.pledge === null ? <span className="text-gray-500">no promise yet</span> : <>paid {formatINR(r.paid)} of {formatINR(r.pledge)}</>}
                </p>
                <div className="flex gap-2">
                  <Link href={`${basePath}/households/${r.id}`} className={btn("secondary", "sm")}>Open<Icon name="arrow" /></Link>
                  {r.phone && <CallButton phone={r.phone} name={r.headName} />}
                </div>
              </li>
            ))}
          </ul>
          <Pager pathname={listPath} params={keep} page={w.page} pages={w.pages} total={w.total} from={w.from} to={w.to} />
        </>
      )}
    </div>
  );
}
