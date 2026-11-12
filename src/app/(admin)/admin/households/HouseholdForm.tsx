"use client";

import { useActionState } from "react";
import { saveHouseholdAction } from "@/modules/households/actions";

type Values = { id?: string; headName?: string; phone?: string | null; altPhone?: string | null; address?: string; areaId?: string; notes?: string | null };

export function HouseholdForm({ areas, values = {} }: { areas: { id: string; name: string }[]; values?: Values }) {
  const [state, action, pending] = useActionState(saveHouseholdAction, {});
  return (
    <form action={action} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2 bg-card">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input name="headName" placeholder="Name" defaultValue={values.headName} required className="rounded-xl border p-2 bg-card" />
      <select name="areaId" defaultValue={values.areaId ?? ""} required className="rounded-xl border p-2 bg-card">
        <option value="" disabled>Choose area</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <input name="address" placeholder="Address" defaultValue={values.address} required className="rounded-xl border p-2 sm:col-span-2 bg-card" />
      <input name="phone" placeholder="Phone" defaultValue={values.phone ?? ""} className="rounded-xl border p-2 bg-card" />
      <input name="altPhone" placeholder="Alternate phone" defaultValue={values.altPhone ?? ""} className="rounded-xl border p-2 bg-card" />
      <input name="notes" placeholder="Notes" defaultValue={values.notes ?? ""} className="rounded-xl border p-2 sm:col-span-2 bg-card" />
      <button disabled={pending} className="btn btn-primary sm:col-span-2">
        {values.id ? "Save changes" : "Add household"}
      </button>
      {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700 sm:col-span-2">Saved.</p>}
    </form>
  );
}
