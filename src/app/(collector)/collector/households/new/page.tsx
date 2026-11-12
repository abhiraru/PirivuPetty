import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listAreasWithCounts } from "@/modules/areas/queries";
import { assignedAreaIds } from "@/modules/collections/access";
import { getActiveFestival } from "@/modules/festivals/queries";
import { HouseholdForm } from "@/app/(admin)/admin/households/HouseholdForm";
import { PageHeader } from "@/components/PageHeader";

export default async function NewHouseholdPage() {
  const user = await requireRole("COLLECTOR");
  const festival = await getActiveFestival();
  const ids = festival ? await assignedAreaIds(festival.id, user.id) : [];
  const areas = (await listAreasWithCounts()).filter((a) => ids.includes(a.id));
  return (
    <div className="space-y-4">
      <Link href="/collector/households" className="btn btn-secondary btn-sm">Back to list</Link>
      <PageHeader title="Add household" />
      {areas.length === 0 ? <p>You have no area assigned, so you cannot add households yet.</p> : <HouseholdForm areas={areas} />}
    </div>
  );
}
