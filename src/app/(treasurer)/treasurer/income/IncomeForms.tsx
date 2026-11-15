"use client";

import { useActionState, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ConfirmVoid } from "@/components/ui/ConfirmVoid";
import { Segmented } from "@/components/ui/Segmented";
import { addIncomeAction, voidIncomeAction } from "@/modules/income/actions";
import { SOURCES, SOURCE_LABEL } from "@/modules/income/schema";

const box = "w-full rounded-xl border p-2";
const todayLocal = () => new Date().toLocaleDateString("en-CA");

export function IncomeForm() {
  const [s, action, pending] = useActionState(addIncomeAction, {});
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");
  useEffect(() => {
    const t = todayLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the clock once on mount
    setToday(t);
    setDate(t);
  }, []);
  return (
    <form action={action} className="grid gap-3 rounded-[18px] border bg-card p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">
        Where did it come from?
        <select name="source" defaultValue="BANK_INTEREST" className={`${box} mt-1 font-normal`}>
          {SOURCES.map((k) => <option key={k} value={k}>{SOURCE_LABEL[k]}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Amount (Rs)
        <input name="amount" type="number" step="0.01" min="0.01" required className={`${box} mt-1 font-normal`} />
      </label>
      <div className="text-sm font-semibold">
        Received in
        <div className="mt-1">
          <Segmented name="receivedIn" label="Received in" value="BANK" options={[{ value: "BANK", label: "Bank" }, { value: "CASH", label: "Cash in hand" }]} />
        </div>
      </div>
      <label className="text-sm font-semibold">
        Date received
        <input id="receivedOn" name="receivedOn" type="date" required value={date} max={today || undefined} onChange={(e) => setDate(e.target.value)} className={`${box} mt-1 font-normal`} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Note <span className="font-normal text-gray-500">(optional)</span>
        <input name="description" placeholder="e.g. Savings account interest, quarter to September" className={`${box} mt-1 font-normal`} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Reference <span className="font-normal text-gray-500">(optional)</span>
        <input name="reference" placeholder="Bank entry, sponsor receipt number..." className={`${box} mt-1 font-normal`} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn btn-primary">{pending ? <span className="btn-spinner" /> : <Icon name="plus" />}Add income</button>
        {s.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
        {s.ok && <p className="text-sm text-good">Income added.</p>}
      </div>
    </form>
  );
}

export function VoidIncomeForm({ id }: { id: string }) {
  const [s, a, p] = useActionState(voidIncomeAction, {});
  return (
    <form action={a}>
      <ConfirmVoid pending={p} error={s.error}>
        <input type="hidden" name="id" value={id} />
      </ConfirmVoid>
    </form>
  );
}
