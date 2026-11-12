import Link from "next/link";
import { PageHeader } from "./PageHeader";
import { Icon } from "./ui/Icon";
import { btn } from "./ui/btn";
import { db } from "@/lib/db";
import { REPORTS } from "@/modules/reports/build";

export async function resolveFestival(id?: string) {
  if (id) {
    const f = await db.festival.findUnique({ where: { id } });
    if (f) return f;
  }
  return (
    (await db.festival.findFirst({ where: { status: "ACTIVE" } })) ??
    (await db.festival.findFirst({ where: { isHistorical: false, status: { not: "DRAFT" } }, orderBy: { year: "desc" } })) ??
    (await db.festival.findFirst({ orderBy: { year: "desc" } }))
  );
}

export function FestivalPicker({ festivals, current }: { festivals: { id: string; name: string }[]; current: string }) {
  return (
    <form className="flex items-center gap-2 text-sm print:hidden">
      <label>Festival</label>
      <select name="festival" defaultValue={current} className="rounded-xl border p-1 bg-card">
        {festivals.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <button className="btn btn-secondary btn-sm">Show</button>
    </form>
  );
}

export async function ReportsIndex({ basePath, festivalId }: { basePath: string; festivalId?: string }) {
  const [festivals, festival] = await Promise.all([db.festival.findMany({ orderBy: { year: "desc" } }), resolveFestival(festivalId)]);
  if (!festival) return <p>There are no festivals yet.</p>;
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Every report can be filtered, paged and downloaded to Excel." />
      <FestivalPicker festivals={festivals} current={festival.id} />
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {REPORTS.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3">
            <div className="min-w-0 flex-1 basis-64">
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-gray-500">{r.description}</p>
            </div>
            <Link href={`${basePath}/reports/${r.id}?festival=${festival.id}`} className={btn("secondary", "sm")}>Open<Icon name="arrow" /></Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
