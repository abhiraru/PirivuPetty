import Link from "next/link";
import { notFound } from "next/navigation";
import { listAreasWithCounts } from "@/modules/areas/queries";
import { HouseholdWork } from "@/components/HouseholdWork";
import { requireRole } from "@/lib/auth";
import { getHousehold } from "@/modules/households/queries";
import { HouseholdForm } from "../HouseholdForm";

export default async function EditHouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("ADMIN");
  const { id } = await params;
  const [h, areas] = await Promise.all([getHousehold(id), listAreasWithCounts()]);
  if (!h) notFound();
  return (
    <div className="space-y-4">
      <Link href="/admin/households" className="btn btn-secondary btn-sm">Back to households</Link>
      <h2 className="text-xl font-semibold">{h.headName}</h2>
      <HouseholdForm areas={areas} values={h} />
      <HouseholdWork user={user} householdId={id} />
    </div>
  );
}
