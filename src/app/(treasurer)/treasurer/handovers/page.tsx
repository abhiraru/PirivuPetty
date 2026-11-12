import { formatINR } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import { ReceivedForm, ResolveHandoverForm } from "@/components/TreasuryForms";
import { listCollectors } from "@/modules/areas/queries";
import { getActiveFestival } from "@/modules/festivals/queries";
import { getDashboard, pendingHandovers, recentHandovers } from "@/modules/treasury/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function Page() {
  await requireRole("TREASURER");
  const f = await getActiveFestival();
  if (!f) return <p>No festival is active right now.</p>;
  const [pending, recent, collectors, d] = await Promise.all([pendingHandovers(f.id), recentHandovers(f.id), listCollectors(), getDashboard(f.id)]);
  return (
    <div className="space-y-6">
      <PageHeader title="Handovers from collectors" />
      <section>
        <h3 className="mb-2 font-medium">Waiting for you</h3>
        {pending.length === 0 ? <p className="text-sm text-gray-500">None.</p> : (
          <ul className="divide-y rounded-xl border text-sm bg-card">
            {pending.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
                <span>{h.collector.name}: <b>{formatINR(h.amount)}</b>{h.note && ` · ${h.note}`}</span>
                <ResolveHandoverForm id={h.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section id="record-cash" className="scroll-mt-24">
        <h3 className="mb-2 font-medium">Record cash received from a collector</h3>
        <ReceivedForm collectors={collectors} />
      </section>
      <section>
        <h3 className="mb-2 font-medium">Cash still with collectors: {formatINR(d.balances.totalWithCollectors)}</h3>
        <ul className="text-sm">{d.holdings.map((h) => <li key={h.collectorId}>{h.name}: {formatINR(h.holding)}</li>)}</ul>
      </section>
      <section>
        <h3 className="mb-2 font-medium">History</h3>
        <ul className="divide-y rounded-xl border text-sm bg-card">
          {recent.map((h) => <li key={h.id} className="p-2">{h.collector.name} · {formatINR(h.amount)} · {h.status.toLowerCase()} · {h.handedOn.toLocaleDateString("en-IN")}</li>)}
        </ul>
      </section>
    </div>
  );
}
