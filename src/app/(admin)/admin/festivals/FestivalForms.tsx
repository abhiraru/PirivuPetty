"use client";

import { useActionState } from "react";
import { formatINR } from "@/lib/money";
import { activateFestivalAction, createFestivalAction } from "@/modules/festivals/actions";
import { updateOpeningAction } from "@/modules/festivals/closeActions";

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
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="btn btn-primary btn-sm">{pending ? <span className="btn-spinner" /> : null}Activate</button>
      {state.error && <span className="text-xs text-bad">{state.error}</span>}
      {state.message && <span className="text-xs text-good">{state.message}</span>}
    </form>
  );
}

/** Opening balances of a festival that has not started. Warns when they differ from the previous closing, and lets the admin fix them. */
export function OpeningForm({ id, cash, bank, previous }: { id: string; cash: number; bank: number; previous: { year: number; cash: number; bank: number } | null }) {
  const [state, action, pending] = useActionState(updateOpeningAction, {});
  const differs = previous !== null && (previous.cash !== cash || previous.bank !== bank);
  return (
    <form action={action} className="w-full space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
      <input type="hidden" name="id" value={id} />
      {differs && previous && (
        <p className="rounded-lg bg-warn-bg p-2 text-warn">
          Differs from the {previous.year} closing (cash {formatINR(previous.cash)}, bank {formatINR(previous.bank)}). Use the closing balance unless you know why it should be different.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-gray-500">Opening cash (Rs)
          <input name="openingCash" type="number" step="0.01" min="0" defaultValue={cash / 100} key={`c${cash}`} className="mt-1 block h-8 w-32 rounded-xl border px-2 text-sm font-normal text-fg" />
        </label>
        <label className="text-xs font-semibold text-gray-500">Opening bank (Rs)
          <input name="openingBank" type="number" step="0.01" min="0" defaultValue={bank / 100} key={`b${bank}`} className="mt-1 block h-8 w-32 rounded-xl border px-2 text-sm font-normal text-fg" />
        </label>
        <button disabled={pending} className="btn btn-secondary btn-sm">Save opening</button>
        {state.ok && <span className="text-xs text-good">Saved.</span>}
        {state.error && <span className="text-xs text-bad">{state.error}</span>}
      </div>
    </form>
  );
}
