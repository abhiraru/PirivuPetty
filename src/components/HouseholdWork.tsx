import { formatINR } from "@/lib/money";
import type { SessionUser } from "@/lib/permissions";
import { assignedAreaIds, canWorkOnArea } from "@/modules/collections/access";
import { getLedger } from "@/modules/collections/queries";
import { listCollectors } from "@/modules/areas/queries";
import { getActiveFestival } from "@/modules/festivals/queries";
import { db } from "@/lib/db";
import { CollectionForm, PledgeForm, VoidForm } from "./CollectionForms";

const MODE = { CASH: "Cash", CHEQUE: "Cheque", ONLINE: "Online" } as const;

/** Pledge, payments and history for one household in the active festival. Shows nothing the user may not touch. */
export async function HouseholdWork({ user, householdId }: { user: SessionUser; householdId: string }) {
  const festival = await getActiveFestival();
  if (!festival) return <p className="text-sm text-gray-500">No active festival, so pledges and payments are closed.</p>;
  const ledger = await getLedger(householdId, festival.id, festival.year);
  if (!ledger) return null;
  const { household, pledge, paid, balance, payments, earlier } = ledger;

  const areas = user.role === "COLLECTOR" ? await assignedAreaIds(festival.id, user.id) : [];
  if (!canWorkOnArea(user, household.areaId, areas)) return <p className="text-sm text-red-600">This household is not in your area.</p>;

  const canVoid = user.role !== "COLLECTOR";
  const collectors = canVoid ? await listCollectors() : undefined;
  const assigned = canVoid
    ? (await db.areaAssignment.findFirst({ where: { festivalId: festival.id, areaId: household.areaId } }))?.collectorId
    : undefined;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-3 bg-card">
        <h3 className="mb-2 font-medium">{festival.name}</h3>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div><dt className="text-gray-500">Promised</dt><dd className="font-medium">{pledge ? formatINR(pledge.amount) : "Not set"}</dd></div>
          <div><dt className="text-gray-500">Paid</dt><dd className="font-medium">{formatINR(paid)}</dd></div>
          <div><dt className="text-gray-500">Still to pay</dt><dd className="font-medium">{formatINR(balance)}</dd></div>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 font-medium">Promise for this year</h3>
        <PledgeForm householdId={household.id} current={pledge?.amount ?? null} note={pledge?.note} />
      </section>

      <section id="record-payment" className="scroll-mt-24">
        <h3 className="mb-2 font-medium">Record a payment</h3>
        <CollectionForm householdId={household.id} collectors={collectors} defaultCollectorId={assigned} />
      </section>

      <section>
        <h3 className="mb-2 font-medium">Payments this year</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">None yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border text-sm bg-card">
            {payments.map((p) => (
              <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 p-2 ${p.status === "VOIDED" ? "text-gray-400 line-through" : ""}`}>
                <span>
                  {formatINR(p.amount)} · {MODE[p.mode]} · {p.collectedOn.toLocaleDateString("en-IN")}
                  {p.txnId && ` · ID ${p.txnId}`}
                  {p.chequeNo && ` · cheque ${p.chequeNo}${p.chequeBank ? ` (${p.chequeBank})` : ""}`}
                  {p.collector && ` · ${p.collector.name}`}
                </span>
                {p.status === "VOIDED" ? (
                  <span className="no-underline">voided: {p.voidReason}</span>
                ) : (
                  canVoid && <VoidForm id={p.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium">Earlier years</h3>
        {earlier.length === 0 ? (
          <p className="text-sm text-gray-500">No earlier festivals on record.</p>
        ) : (
          <div className="space-y-3">
            {earlier.map((y) => (
              <div key={y.year} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex flex-wrap items-baseline justify-between gap-2 bg-gray-50 px-3 py-2">
                  <span className="font-semibold">{y.year}</span>
                  <span className="text-sm">
                    {y.pledge !== null && <span className="mr-3 text-gray-500">Promised {formatINR(y.pledge)}</span>}
                    {y.paid > 0 ? (
                      <span className="rounded-full bg-good-bg px-2.5 py-0.5 font-bold tabular-nums text-good">Paid {formatINR(y.paid)}</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-semibold text-gray-500">did not give</span>
                    )}
                  </span>
                </div>
                {y.payments.length > 0 && (
                  <ul className="divide-y text-sm">
                    {y.payments.map((p) => (
                      <li key={p.id} className="p-2">
                        {formatINR(p.amount)} · {MODE[p.mode]} · {p.imported ? "from imported records" : p.collectedOn.toLocaleDateString("en-IN")}
                        {p.txnId && ` · ID ${p.txnId}`}
                        {p.chequeNo && ` · cheque ${p.chequeNo}`}
                        {p.collector && ` · ${p.collector.name}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
