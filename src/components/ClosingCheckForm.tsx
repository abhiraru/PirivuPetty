"use client";

import { useActionState } from "react";
import { saveClosingCheckAction } from "@/modules/festivals/closeActions";
import { Icon } from "./ui/Icon";

const box = "w-full rounded-xl border p-2";

/** The treasurer types what was really counted and what the bank statement says. The app compares it with its own figures. */
export function ClosingCheckForm({ initial }: { initial: { cash: number | null; bank: number | null; note: string | null } }) {
  const [s, a, p] = useActionState(saveClosingCheckAction, {});
  return (
    <form action={a} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">
        Cash counted in hand (Rs)
        <input name="countedCash" type="number" step="0.01" min="0" required defaultValue={initial.cash === null ? "" : initial.cash / 100} className={`${box} mt-1 font-normal`} />
      </label>
      <label className="text-sm font-semibold">
        Bank statement balance (Rs)
        <input name="countedBank" type="number" step="0.01" min="0" required defaultValue={initial.bank === null ? "" : initial.bank / 100} className={`${box} mt-1 font-normal`} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Note <span className="font-normal text-gray-500">(required if the numbers differ from the app)</span>
        <input name="note" defaultValue={initial.note ?? ""} placeholder="e.g. Bank charges of Rs 118 not yet recorded" className={`${box} mt-1 font-normal`} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={p} className="btn btn-primary">{p ? <span className="btn-spinner" /> : <Icon name="check" />}Save closing check</button>
        {s.error && <p role="alert" className="text-sm text-bad">{s.error}</p>}
        {s.ok && <p className="text-sm text-good">Saved.</p>}
      </div>
    </form>
  );
}
