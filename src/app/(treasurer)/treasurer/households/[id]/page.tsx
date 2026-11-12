import Link from "next/link";
import { notFound } from "next/navigation";
import { HouseholdWork } from "@/components/HouseholdWork";
import { requireRole } from "@/lib/auth";
import { getHousehold } from "@/modules/households/queries";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("TREASURER");
  const { id } = await params;
  const h = await getHousehold(id);
  if (!h) notFound();
  return (
    <div className="space-y-4">
      <Link href="/treasurer/households" className="btn btn-secondary btn-sm">Back to list</Link>
      <div>
        <h2 className="text-xl font-semibold">{h.headName}</h2>
        <p className="text-sm text-gray-500">{h.area.name} · {h.address}{h.phone ? ` · ${h.phone}` : ""}</p>
      </div>
      <HouseholdWork user={user} householdId={id} />
    </div>
  );
}
