import { formatINR } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import { BankForm } from "@/components/TreasuryForms";
import { getActiveFestival } from "@/modules/festivals/queries";
import { getDashboard, listBankTransactions } from "@/modules/treasury/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function Page() {
  await requireRole("TREASURER");
  const f = await getActiveFestival();
  if (!f) return <p>No festival is active right now.</p>;
  const [txns, d] = await Promise.all([listBankTransactions(f.id), getDashboard(f.id)]);
  return (
    <div className="space-y-6">
      <PageHeader title="Bank" />
      <p className="text-sm">Cash in hand <b>{formatINR(d.balances.cashInHand)}</b> · In bank <b>{formatINR(d.balances.bank)}</b></p>
      <BankForm />
      <ul className="divide-y rounded-xl border text-sm bg-card">
        {txns.length === 0 && <li className="p-3 text-gray-500">No deposits or withdrawals yet.</li>}
        {txns.map((t) => (
          <li key={t.id} className="p-2">
            {t.type === "DEPOSIT_CASH" ? "Deposited" : "Withdrew"} {formatINR(t.amount)} · {t.date.toLocaleDateString("en-IN")}{t.reference && ` · ${t.reference}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
