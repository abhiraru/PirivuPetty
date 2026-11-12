import { formatINR } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import { RequestHandoverForm } from "@/components/TreasuryForms";
import { collectorSummary } from "@/modules/collections/queries";
import { getActiveFestival } from "@/modules/festivals/queries";
import { getBalances } from "@/modules/treasury/balances";
import { recentHandovers } from "@/modules/treasury/queries";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";

export default async function Page() {
  const user = await requireRole("COLLECTOR");
  const f = await getActiveFestival();
  if (!f) return <p>No festival is active right now.</p>;
  const [s, b, history] = await Promise.all([collectorSummary(f.id, user.id), getBalances(db, f.id), recentHandovers(f.id, user.id)]);
  const available = b.available[user.id] ?? 0;
  return (
    <div className="space-y-6">
      <PageHeader title="Hand over cash" />
      <p className="text-sm">Cash collected <b>{formatINR(s.cash)}</b> · already handed over <b>{formatINR(s.handedOver)}</b> · still with you <b>{formatINR(s.holding)}</b></p>
      <section>
        <h3 className="mb-2 font-medium">Give cash to the treasurer</h3>
        <p className="mb-2 text-sm text-gray-600">Give the cash to the treasurer first, then send this. It counts once the treasurer confirms.</p>
        <RequestHandoverForm max={Math.max(available, 0)} />
      </section>
      <section>
        <h3 className="mb-2 font-medium">History</h3>
        <ul className="divide-y rounded-xl border text-sm bg-card">
          {history.length === 0 && <li className="p-3 text-gray-500">None yet.</li>}
          {history.map((h) => <li key={h.id} className="p-2">{formatINR(h.amount)} · {h.status.toLowerCase()} · {h.handedOn.toLocaleDateString("en-IN")}{h.note && ` · ${h.note}`}</li>)}
        </ul>
      </section>
    </div>
  );
}
