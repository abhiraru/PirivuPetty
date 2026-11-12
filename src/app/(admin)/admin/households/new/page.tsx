import Link from "next/link";
import { listAreasWithCounts } from "@/modules/areas/queries";
import { HouseholdForm } from "../HouseholdForm";
import { PageHeader } from "@/components/PageHeader";

export default async function NewHouseholdPage() {
  const areas = await listAreasWithCounts();
  return (
    <div className="space-y-4">
      <Link href="/admin/households" className="btn btn-secondary btn-sm">Back to households</Link>
      <PageHeader title="Add household" />
      {areas.length === 0 ? <p>Add an area first.</p> : <HouseholdForm areas={areas} />}
    </div>
  );
}
