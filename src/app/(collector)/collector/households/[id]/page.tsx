import Link from "next/link";
import { notFound } from "next/navigation";
import { CallButton } from "@/components/CallButton";
import { HouseholdWork } from "@/components/HouseholdWork";
import { Icon } from "@/components/ui/Icon";
import { btn } from "@/components/ui/btn";
import { requireRole } from "@/lib/auth";
import { getHousehold } from "@/modules/households/queries";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("COLLECTOR");
  const { id } = await params;
  const h = await getHousehold(id);
  if (!h) notFound();
  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <Link href="/collector/households" className={btn("ghost", "sm", "-ml-3")}><Icon name="back" />Back to households</Link>
      <div>
        <h1 className="text-balance text-xl font-extrabold tracking-tight sm:text-2xl">{h.headName}</h1>
        <p className="text-sm text-gray-500">{h.area.name} · {h.address}{h.phone ? ` · ${h.phone}` : ""}</p>
        {h.phone && <div className="mt-2 hidden md:block"><CallButton phone={h.phone} name={h.headName} /></div>}
      </div>
      <HouseholdWork user={user} householdId={id} />

      {/* Phones: the main action stays in reach, just above the tab bar. */}
      <div
        className="fixed inset-x-0 z-20 flex gap-2 border-t bg-card/95 px-4 py-2.5 backdrop-blur md:hidden print:hidden"
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Link href="#record-payment" className={btn("primary", "md", "flex-1")}><Icon name="plus" />Record payment</Link>
        {h.phone && <CallButton phone={h.phone} name={h.headName} />}
      </div>
    </div>
  );
}
