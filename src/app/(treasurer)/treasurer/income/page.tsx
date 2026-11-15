import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { getActiveFestival } from "@/modules/festivals/queries";
import { listIncome } from "@/modules/income/queries";
import { SOURCE_LABEL } from "@/modules/income/schema";
import { IncomeForm, VoidIncomeForm } from "./IncomeForms";

export default async function Page() {
  await requireRole("TREASURER");
  const f = await getActiveFestival();
  if (!f) return <p>No festival is active right now.</p>;
  const rows = await listIncome(f.id);
  const total = rows.filter((r) => r.status === "VALID").reduce((s, r) => s + r.amount, 0);
  return (
    <div className="space-y-5">
      <PageHeader title="Other income" subtitle={`${f.name} · money that is not a household payment, such as bank interest or sponsorship`} />
      <IncomeForm />
      <p className="text-sm">Total other income: <b className="tabular-nums">{formatINR(total)}</b></p>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card text-sm">
        {rows.length === 0 && <li className="p-4 text-gray-500">Nothing recorded yet.</li>}
        {rows.map((r) => (
          <li key={r.id} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3 ${r.status === "VOIDED" ? "text-gray-400 line-through" : ""}`}>
            <div className="min-w-0 flex-1 basis-60">
              <p className="font-semibold">{SOURCE_LABEL[r.source]} · {r.description}</p>
              <p className="text-xs text-gray-500">{r.receivedOn.toLocaleDateString("en-IN")} · received in {r.receivedIn === "BANK" ? "bank" : "cash"}{r.reference ? ` · ${r.reference}` : ""}</p>
            </div>
            <span className="font-extrabold tabular-nums">{formatINR(r.amount)}</span>
            {r.status === "VOIDED" ? <span className="no-underline">voided: {r.voidReason}</span> : <VoidIncomeForm id={r.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
