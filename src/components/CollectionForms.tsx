"use client";

import { useActionState, useEffect, useState } from "react";
import { ConfirmVoid } from "./ui/ConfirmVoid";
import { recordCollectionAction, savePledgeAction, voidCollectionAction } from "@/modules/collections/actions";

const input = "w-full rounded border p-2";

/** Today in the browser's own timezone as YYYY-MM-DD, which is what a date input expects. */
const todayLocal = () => new Date().toLocaleDateString("en-CA");

export function PledgeForm({ householdId, current, note }: { householdId: string; current: number | null; note?: string | null }) {
  const [state, action, pending] = useActionState(savePledgeAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="householdId" value={householdId} />
      <label className="text-sm">
        Promised amount (Rs)
        <input name="amount" type="number" step="0.01" min="0" defaultValue={current === null ? "" : current / 100} required className={`${input} mt-1 w-40`} />
      </label>
      <label className="min-w-40 flex-1 text-sm">
        Note
        <input name="note" defaultValue={note ?? ""} className={`${input} mt-1`} />
      </label>
      <button disabled={pending} className="btn btn-primary">{current === null ? "Save promise" : "Update promise"}</button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="w-full text-sm text-green-700">Saved.</p>}
    </form>
  );
}

export function CollectionForm({ householdId, collectors, defaultCollectorId }: { householdId: string; collectors?: { id: string; name: string }[]; defaultCollectorId?: string }) {
  const [state, action, pending] = useActionState(recordCollectionAction, {});
  const [mode, setMode] = useState("CASH");
  // Pre-filled with today in the browser's timezone. Set after load so the server's clock never decides it.
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");
  useEffect(() => {
    const t = todayLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the clock once on mount
    setToday(t);
    setDate(t);
  }, []);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="householdId" value={householdId} />
      <label className="text-sm">
        Amount received (Rs)
        <input name="amount" type="number" step="0.01" min="0.01" required className={`${input} mt-1`} />
      </label>
      <label className="text-sm">
        How paid
        <select name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className={`${input} mt-1`}>
          <option value="CASH">Cash (in hand)</option>
          <option value="CHEQUE">Cheque</option>
          <option value="ONLINE">Online / transaction</option>
        </select>
      </label>
      {mode === "ONLINE" && (
        <label className="text-sm sm:col-span-2">
          Payment / transaction ID
          <input name="txnId" required className={`${input} mt-1`} />
        </label>
      )}
      {mode === "CHEQUE" && (
        <>
          <label className="text-sm">Cheque number<input name="chequeNo" required className={`${input} mt-1`} /></label>
          <label className="text-sm">Bank<input name="chequeBank" className={`${input} mt-1`} /></label>
          <label className="text-sm">Cheque date<input name="chequeDate" type="date" className={`${input} mt-1`} /></label>
        </>
      )}
      <label className="text-sm">
        Date received
        <input id="collectedOn" name="collectedOn" type="date" required value={date} max={today || undefined} onChange={(e) => setDate(e.target.value)} className={`${input} mt-1`} />
      </label>
      {collectors && (
        <label className="text-sm">
          Taken by
          <select name="collectedBy" defaultValue={defaultCollectorId ?? ""} className={`${input} mt-1`}>
            <option value="">Directly to treasurer</option>
            {collectors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <button disabled={pending} className="btn btn-primary sm:col-span-2">Record payment</button>
      {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700 sm:col-span-2">Payment recorded.</p>}
    </form>
  );
}

export function VoidForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(voidCollectionAction, {});
  return (
    <form action={action}>
      <ConfirmVoid pending={pending} error={state.error}>
        <input type="hidden" name="id" value={id} />
      </ConfirmVoid>
    </form>
  );
}
