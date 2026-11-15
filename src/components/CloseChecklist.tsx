import { formatINR } from "@/lib/money";
import { closeReadiness } from "@/modules/festivals/close";
import { CloseButton } from "./CloseForms";

const diffText = (n: number | null) => (n === null ? "" : n === 0 ? "matches" : `${n > 0 ? "+" : "-"}${formatINR(Math.abs(n))}`);

/** Year-end checklist for the active festival. Anyone can read it; only the admin gets the Close button. */
export async function CloseChecklist({ festival, canClose }: { festival: { id: string; name: string }; canClose: boolean }) {
  const { balances: b, blockers, recon } = await closeReadiness(festival.id);
  return (
    <section className="space-y-3 rounded-xl border p-3 bg-card">
      <h3 className="font-medium">Year-end close: {festival.name}</h3>
      {blockers.length === 0 ? (
        <p className="text-sm text-good">Ready to close. All collector cash is handed over, every cheque is settled, and the closing check is done.</p>
      ) : (
        <div>
          <p className="text-sm font-medium text-bad">Not ready yet:</p>
          <ul className="list-disc pl-5 text-sm">{blockers.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}

      <div className="rounded-xl bg-gray-50 p-3 text-sm">
        <p className="font-semibold">Closing check</p>
        {recon.entered ? (
          <ul className="mt-1 space-y-0.5 text-gray-500">
            <li>Cash: app says <b className="text-fg">{formatINR(b.cashInHand)}</b>, counted <b className="text-fg">{formatINR(recon.counts.countedCash!)}</b> ({diffText(recon.cashDiff)})</li>
            <li>Bank: app says <b className="text-fg">{formatINR(b.bank)}</b>, statement <b className="text-fg">{formatINR(recon.counts.countedBank!)}</b> ({diffText(recon.bankDiff)})</li>
            {recon.counts.note && <li>Note: {recon.counts.note}</li>}
            {recon.at && <li>Entered {recon.at.toLocaleString("en-IN")}</li>}
          </ul>
        ) : (
          <p className="mt-1 text-gray-500">Not done yet. The treasurer enters the cash counted and the bank statement balance on the Year-end page.</p>
        )}
      </div>

      <p className="text-sm">
        If closed now, next year starts with <b>{formatINR(b.cashInHand)}</b> cash in hand and <b>{formatINR(b.bank)}</b> in the bank.
        {b.cashInHand > 0 && " To start with it all in the bank, deposit the cash first (Treasurer, Bank)."}
      </p>
      {canClose ? <CloseButton id={festival.id} disabled={blockers.length > 0} /> : <p className="text-xs text-gray-500">Only the admin can close the festival.</p>}
    </section>
  );
}
