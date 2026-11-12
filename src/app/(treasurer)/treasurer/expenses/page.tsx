import { formatINR } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import { CategoryForm, ExpenseForm, VoidExpenseForm } from "@/components/TreasuryForms";
import { getActiveFestival } from "@/modules/festivals/queries";
import { listCategories, listExpenses } from "@/modules/treasury/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function Page() {
  await requireRole("TREASURER");
  const f = await getActiveFestival();
  if (!f) return <p>No festival is active right now.</p>;
  const [categories, expenses] = await Promise.all([listCategories(), listExpenses(f.id)]);
  const total = expenses.filter((e) => e.status === "VALID").reduce((s, e) => s + e.amount, 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" />
      <ExpenseForm categories={categories} />
      <CategoryForm />
      <p className="text-sm">Total spent: <b>{formatINR(total)}</b></p>
      <ul className="divide-y rounded-xl border text-sm bg-card">
        {expenses.length === 0 && <li className="p-3 text-gray-500">No expenses yet.</li>}
        {expenses.map((e) => (
          <li key={e.id} className={`flex flex-wrap items-center justify-between gap-2 p-2 ${e.status === "VOIDED" ? "text-gray-400 line-through" : ""}`}>
            <span>
              {formatINR(e.amount)} · {e.category.name} · {e.description} · from {e.paidFrom.toLowerCase()} · {e.paidOn.toLocaleDateString("en-IN")}
              {e.vendor && ` · ${e.vendor}`}{e.billReference && ` · bill ${e.billReference}`}
              {e.attachmentUrl && <> · <a href={`/api/bills/${e.id}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">view bill</a></>}
            </span>
            {e.status === "VOIDED" ? <span className="no-underline">voided: {e.voidReason}</span> : <VoidExpenseForm id={e.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
