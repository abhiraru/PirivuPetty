import { formatINR } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import { ChequeButtons } from "@/components/TreasuryForms";
import { getActiveFestival } from "@/modules/festivals/queries";
import { listCheques } from "@/modules/treasury/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function Page() {
  await requireRole("TREASURER");
  const f = await getActiveFestival();
  if (!f) return <p>No festival is active right now.</p>;
  const cheques = await listCheques(f.id);
  return (
    <div className="space-y-4">
      <PageHeader title="Cheques" />
      <p className="text-sm text-gray-600">A cheque counts towards the bank balance only once it is marked cleared. A bounced cheque is removed from the household&apos;s paid amount.</p>
      <ul className="divide-y rounded-xl border text-sm bg-card">
        {cheques.length === 0 && <li className="p-3 text-gray-500">No cheques yet.</li>}
        {cheques.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>
              {c.household.headName} · <b>{formatINR(c.amount)}</b> · no. {c.chequeNo}{c.chequeBank && ` (${c.chequeBank})`} · <b>{c.chequeStatus?.toLowerCase()}</b>
              {c.voidReason && c.chequeStatus === "BOUNCED" && ` · ${c.voidReason}`}
            </span>
            {c.status === "VALID" && c.chequeStatus && <ChequeButtons id={c.id} status={c.chequeStatus} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
