import { formatINR } from "@/lib/money";
import { listCheques, pendingHandovers } from "@/modules/treasury/queries";
import { ChequeButtons, ResolveHandoverForm } from "./TreasuryForms";

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** The treasurer's daily jobs, on the home page: handovers to confirm and cheques to move along. */
export async function TreasurerTasks({ festivalId }: { festivalId: string }) {
  const [handovers, allCheques] = await Promise.all([pendingHandovers(festivalId), listCheques(festivalId)]);
  const cheques = allCheques.filter((c) => c.status === "VALID" && (c.chequeStatus === "RECEIVED" || c.chequeStatus === "DEPOSITED"));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-3 rounded-[18px] border bg-card p-5" aria-labelledby="wait-h">
        <div>
          <h2 id="wait-h" className="font-bold">Waiting for you</h2>
          <p className="text-xs text-gray-500">Cash collectors say they handed over</p>
        </div>
        {handovers.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No handovers waiting.</p>
        ) : (
          <ul className="divide-y">
            {handovers.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-500" aria-hidden>{initials(h.collector.name)}</span>
                  <div className="min-w-0">
                    <p className="font-semibold">{h.collector.name}</p>
                    <p className="text-xs text-gray-500">{h.handedOn.toLocaleDateString("en-IN")}{h.note ? ` · ${h.note}` : ""}</p>
                  </div>
                </div>
                <span className="font-extrabold tabular-nums">{formatINR(h.amount)}</span>
                <ResolveHandoverForm id={h.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-[18px] border bg-card p-5" aria-labelledby="chq-h">
        <div>
          <h2 id="chq-h" className="font-bold">Cheques to clear</h2>
          <p className="text-xs text-gray-500">Counted in the bank once cleared</p>
        </div>
        {cheques.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No open cheques.</p>
        ) : (
          <ul className="divide-y">
            {cheques.slice(0, 6).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-semibold">Cheque {c.chequeNo}{c.chequeBank ? ` (${c.chequeBank})` : ""}</p>
                  <p className="text-xs text-gray-500">{c.household.headName} · {c.chequeStatus?.toLowerCase()}</p>
                </div>
                <span className="font-extrabold tabular-nums">{formatINR(c.amount)}</span>
                {c.chequeStatus && <ChequeButtons id={c.id} status={c.chequeStatus} />}
              </li>
            ))}
          </ul>
        )}
        {cheques.length > 6 && <p className="text-xs text-gray-500">{cheques.length - 6} more on the Cheques page.</p>}
      </section>
    </div>
  );
}
