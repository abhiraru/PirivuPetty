import Link from "next/link";
import { Pager } from "@/components/Pager";
import { requireRole } from "@/lib/auth";
import { PAGE_SIZES, parsePage, parseSize } from "@/lib/pagination";
import { auditFilterOptions, searchAudit } from "@/modules/audit/queries";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/PageHeader";

type SP = Record<string, string | undefined>;
const field = "rounded-xl border bg-card px-2.5 py-1.5 text-sm font-normal text-fg";
const label = "text-xs font-semibold text-gray-500";

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const size = parseSize(sp.size);
  const filters = { q: sp.q, user: sp.user, action: sp.action, entity: sp.entity, from: sp.from, to: sp.to };
  const [{ rows, window: w }, opts] = await Promise.all([searchAudit(filters, parsePage(sp.page), size), auditFilterOptions()]);
  const active = Object.values(filters).some(Boolean);
  const keep: SP = {};
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") keep[k] = v;

  return (
    <div className="space-y-4">
      <div>
        <PageHeader title="Audit log" />
        <p className="text-sm text-gray-500">Every change to money, people and records, newest first.</p>
      </div>

      <form className="grid gap-3 rounded-[18px] border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Audit log filters">
        <label className={label}>Search
          <input name="q" defaultValue={sp.q} placeholder="Action, record or person" className={`${field} mt-1 w-full`} />
        </label>
        <label className={label}>Person
          <select name="user" defaultValue={sp.user ?? ""} className={`${field} mt-1 w-full`}>
            <option value="">Everyone</option>
            <option value="none">System / not signed in</option>
            {opts.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className={label}>Action
          <select name="action" defaultValue={sp.action ?? ""} className={`${field} mt-1 w-full`}>
            <option value="">All actions</option>
            {opts.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className={label}>Record type
          <select name="entity" defaultValue={sp.entity ?? ""} className={`${field} mt-1 w-full`}>
            <option value="">All types</option>
            {opts.entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className={label}>From date
          <input type="date" name="from" defaultValue={sp.from} className={`${field} mt-1 w-full`} />
        </label>
        <label className={label}>To date
          <input type="date" name="to" defaultValue={sp.to} className={`${field} mt-1 w-full`} />
        </label>
        <div className={label}>Rows per page<div className="mt-1"><Segmented name="size" label="Rows per page" value={String(size)} options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))} /></div></div>
        <div className="flex items-end gap-3">
          <button className="btn btn-primary">Apply</button>
          <Link href="/admin/audit" className="btn btn-secondary btn-sm">Reset</Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-gray-500">{active ? "Nothing matches these filters." : "No activity recorded yet."}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100"><tr><th className="p-2">When</th><th className="p-2">Who</th><th className="p-2">Action</th><th className="p-2">Record</th><th className="p-2">Details</th></tr></thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-t align-top">
                    <td className="whitespace-nowrap p-2">{l.createdAt.toLocaleString("en-IN")}</td>
                    <td className="p-2">{l.user?.name ?? "system"}</td>
                    <td className="p-2">{l.action}</td>
                    <td className="p-2">{l.entity}</td>
                    <td className="max-w-xs break-words p-2 text-xs text-gray-500">{l.after ? JSON.stringify(l.after) : l.entityId ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pathname="/admin/audit" params={keep} page={w.page} pages={w.pages} total={w.total} from={w.from} to={w.to} />
        </>
      )}
    </div>
  );
}
