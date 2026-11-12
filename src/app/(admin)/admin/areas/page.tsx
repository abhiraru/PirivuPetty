import { assignCollectorAction } from "@/modules/areas/actions";
import { assignmentsForFestival, listAreasWithCounts, listCollectors } from "@/modules/areas/queries";
import { getActiveFestival, listFestivals } from "@/modules/festivals/queries";
import { AreaForm } from "./AreaForm";
import { PageHeader } from "@/components/PageHeader";

export default async function AreasPage() {
  const active = await getActiveFestival();
  const festival = active ?? (await listFestivals()).find((f) => f.status === "DRAFT" && !f.isHistorical);
  const [areas, collectors, assignments] = await Promise.all([
    listAreasWithCounts(),
    listCollectors(),
    festival ? assignmentsForFestival(festival.id) : Promise.resolve([]),
  ]);
  const collectorOf = new Map(assignments.map((a) => [a.areaId, a.collectorId]));

  return (
    <div className="space-y-6">
      <PageHeader title="Areas" />
      <AreaForm />
      <p className="text-sm text-gray-600">
        {festival ? <>Collector assignments for <b>{festival.name}</b>.</> : "Create a festival to assign collectors to areas."}
      </p>
      <ul className="divide-y rounded-xl border bg-card">
        {areas.length === 0 && <li className="p-3 text-gray-500">No areas yet.</li>}
        {areas.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-sm text-gray-500">{a._count.households} households</p>
            </div>
            {festival && (
              <form action={assignCollectorAction} className="flex items-center gap-2">
                <input type="hidden" name="festivalId" value={festival.id} />
                <input type="hidden" name="areaId" value={a.id} />
                <select name="collectorId" defaultValue={collectorOf.get(a.id) ?? ""} className="rounded-xl border p-1 text-sm bg-card">
                  <option value="">Unassigned</option>
                  {collectors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button className="btn btn-secondary btn-sm">Save</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
