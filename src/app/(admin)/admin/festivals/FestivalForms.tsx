"use client";

import { useActionState } from "react";
import { activateFestivalAction, createFestivalAction } from "@/modules/festivals/actions";

export function CreateFestivalForm({ suggested }: { suggested: { openingCash: number; openingBank: number; fromYear: number | null } }) {
  const [state, action, pending] = useActionState(createFestivalAction, {});
  const year = new Date().getFullYear();
  return (
    <form action={action} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2 bg-card">
      <label className="text-sm">Name<input name="name" defaultValue={`Festival ${year}`} required className="mt-1 w-full rounded-xl border p-2 bg-card" /></label>
      <label className="text-sm">Year<input name="year" type="number" defaultValue={year} required className="mt-1 w-full rounded-xl border p-2 bg-card" /></label>
      <label className="text-sm">Opening cash in hand (Rs)<input name="openingCash" type="number" step="0.01" min="0" defaultValue={suggested.openingCash / 100} className="mt-1 w-full rounded-xl border p-2 bg-card" /></label>
      <label className="text-sm">Opening bank balance (Rs)<input name="openingBank" type="number" step="0.01" min="0" defaultValue={suggested.openingBank / 100} className="mt-1 w-full rounded-xl border p-2 bg-card" /></label>
      <p className="text-xs text-gray-500 sm:col-span-2">
        {suggested.fromYear
          ? `Pre-filled from the closing balance of ${suggested.fromYear}.`
          : "No closed festival yet. Enter the balances you start with (0 if none)."}
      </p>
      <button disabled={pending} className="btn btn-primary sm:col-span-2">Create festival</button>
      {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
    </form>
  );
}

export function ActivateButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(activateFestivalAction, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="btn btn-secondary btn-sm">Activate</button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
