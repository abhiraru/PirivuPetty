import { ClosingCheckForm } from "@/components/ClosingCheckForm";
import { CloseChecklist } from "@/components/CloseChecklist";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { db } from "@/lib/db";
import { getActiveFestival } from "@/modules/festivals/queries";
import { getBalances } from "@/modules/treasury/balances";

export default async function Page() {
  await requireRole("TREASURER");
  const f = await getActiveFestival();
  if (!f) return <p>No festival is active right now.</p>;
  const b = await getBalances(db, f.id);
  return (
    <div className="space-y-5">
      <PageHeader title="Year-end" subtitle={`${f.name} · check the money, then the admin can close the year`} />
      <section className="space-y-3 rounded-[18px] border bg-card p-5">
        <div>
          <h2 className="font-bold">Closing check</h2>
          <p className="text-sm text-gray-500">Count the cash in hand and read the balance on the bank statement. The app compares them with its own figures.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-gray-50 p-3"><p className="text-gray-500">The app says: cash in hand</p><p className="text-lg font-extrabold tabular-nums">{formatINR(b.cashInHand)}</p></div>
          <div className="rounded-xl bg-gray-50 p-3"><p className="text-gray-500">The app says: in the bank</p><p className="text-lg font-extrabold tabular-nums">{formatINR(b.bank)}</p></div>
        </div>
        <ClosingCheckForm initial={{ cash: f.countedCash, bank: f.countedBank, note: f.reconNote }} />
        <p className="text-xs text-gray-500">If the numbers differ, find the cause first. Missing bank interest goes under Other income, and bank charges under Expenses. Then count again.</p>
      </section>
      <CloseChecklist festival={f} canClose={false} />
    </div>
  );
}
