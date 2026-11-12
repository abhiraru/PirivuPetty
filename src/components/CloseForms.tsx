"use client";

import { useActionState } from "react";
import { closeFestivalAction, reopenFestivalAction } from "@/modules/festivals/closeActions";

export function CloseButton({ id, disabled }: { id: string; disabled: boolean }) {
  const [s, a, p] = useActionState(closeFestivalAction, {});
  return (
    <form action={a} className="space-y-2" onSubmit={(e) => { if (!confirm("Close this festival? It becomes read-only and the balances carry forward.")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button disabled={disabled || p} className="btn btn-primary">Close festival</button>
      {s.error && <p className="text-sm text-red-600">{s.error}</p>}
    </form>
  );
}

export function ReopenForm({ id }: { id: string }) {
  const [s, a, p] = useActionState(reopenFestivalAction, {});
  return (
    <form action={a} className="flex flex-wrap items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input name="reason" placeholder="Reason for reopening" required className="w-44 rounded-xl border p-1 text-sm bg-card" />
      <button disabled={p} className="btn btn-secondary btn-sm">Reopen</button>
      {s.error && <span className="text-xs text-red-600">{s.error}</span>}
    </form>
  );
}
