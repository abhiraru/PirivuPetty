import { formatINR } from "@/lib/money";
import { closeReadiness } from "@/modules/festivals/close";
import { CloseButton } from "./CloseForms";

/** Year-end checklist for the active festival. Anyone can read it; only the admin gets the Close button. */
export async function CloseChecklist({ festival, canClose }: { festival: { id: string; name: string }; canClose: boolean }) {
  const { balances: b, blockers } = await closeReadiness(festival.id);
  return (
    <section className="space-y-3 rounded-xl border p-3 bg-card">
      <h3 className="font-medium">Year-end close: {festival.name}</h3>
      {blockers.length === 0 ? (
        <p className="text-sm text-green-700">Ready to close. All collector cash is handed over and every cheque is settled.</p>
      ) : (
        <div>
          <p className="text-sm font-medium text-red-700">Not ready yet:</p>
          <ul className="list-disc pl-5 text-sm">{blockers.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      <p className="text-sm">
        If closed now, next year starts with <b>{formatINR(b.cashInHand)}</b> cash in hand and <b>{formatINR(b.bank)}</b> in the bank.
        {b.cashInHand > 0 && " To start with it all in the bank, deposit the cash first (Treasurer, Bank)."}
      </p>
      {canClose ? <CloseButton id={festival.id} disabled={blockers.length > 0} /> : <p className="text-xs text-gray-500">Only the admin can close the festival.</p>}
    </section>
  );
}
