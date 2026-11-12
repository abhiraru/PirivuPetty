"use client";

import { useActionState } from "react";
import { createAreaAction } from "@/modules/areas/actions";

export function AreaForm() {
  const [state, action, pending] = useActionState(createAreaAction, {});
  return (
    <form action={action} className="flex flex-wrap items-start gap-2 rounded-xl border p-3 bg-card">
      <input name="name" placeholder="Area name" required className="rounded-xl border p-2 bg-card" />
      <input name="description" placeholder="Description (optional)" className="rounded-xl border p-2 bg-card" />
      <button disabled={pending} className="btn btn-primary">Add area</button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
