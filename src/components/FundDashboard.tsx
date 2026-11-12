import Link from "next/link";
import { Icon } from "./ui/Icon";
import { btn } from "./ui/btn";
import { formatINR } from "@/lib/money";
import { getActiveFestival } from "@/modules/festivals/queries";
import { getDashboard } from "@/modules/treasury/queries";

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "warn" | "bad" }) {
  return (
    <div className="rounded-[18px] border bg-card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums tracking-tight ${tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : ""}`}>{formatINR(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/** Fund summary. `header` goes above it (the welcome line); `renderTasks` adds task cards below the figures (treasurer only). */
export async function FundDashboard({ header, renderTasks }: { header?: React.ReactNode; renderTasks?: (festivalId: string) => React.ReactNode } = {}) {
  const festival = await getActiveFestival();
  if (!festival)
    return (
      <div className="space-y-5">
        {header}
      <div className="rounded-[18px] border bg-card p-6">
        <h2 className="text-lg font-bold">No festival is active right now</h2>
        <p className="mt-1 text-sm text-gray-500">The admin needs to create and activate a festival before collections can start.</p>
      </div>
      </div>
    );
  const d = await getDashboard(festival.id);
  const b = d.balances;
  const pct = d.pledged > 0 ? Math.min(100, Math.round((b.collectedTotal / d.pledged) * 100)) : 0;
  const waiting = d.holdings.reduce((s, h) => s + h.pending, 0);

  return (
    <div className="space-y-5">
      {header}
      <section className="grid gap-5 rounded-[22px] bg-hero p-6 text-hero-fg md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-sm opacity-75">{festival.name} · Total fund</p>
          <p className="my-1 text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl">{formatINR(b.netFund)}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(
              [
                ["Cash in hand", b.cashInHand],
                ["In bank", b.bank],
                ["Spent", b.spentTotal],
              ] as const
            ).map(([l, v]) => (
              <div key={l} className="min-w-[8.5rem] rounded-2xl bg-[var(--hero-soft)] px-4 py-2.5">
                <p className="text-xs opacity-75">{l}</p>
                <p className="text-lg font-bold tabular-nums">{formatINR(v)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="self-center">
          <p className="text-sm opacity-75">Collected so far</p>
          <p className="mb-2 mt-0.5 text-2xl font-extrabold tabular-nums">
            {formatINR(b.collectedTotal)} <span className="text-sm font-medium opacity-75">of {formatINR(d.pledged)} promised</span>
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--hero-soft)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of promises collected">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs opacity-75">{pct}% of promises collected · {formatINR(d.stillToCollect)} still to come in</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Promised" value={d.pledged} hint={`${d.pledgeCount} households`} />
        <Stat label="Still to collect" value={d.stillToCollect} tone={d.stillToCollect > 0 ? "warn" : undefined} />
        <Stat label="Cheques not cleared" value={b.chequesNotCleared} hint="Counts once cleared" />
        <Stat
          label="Cash with collectors"
          value={b.totalWithCollectors}
          hint={waiting > 0 ? `${formatINR(waiting)} awaiting confirmation` : undefined}
          tone={b.totalWithCollectors > 0 ? "warn" : undefined}
        />
      </section>

      {renderTasks?.(festival.id)}

      <section className="rounded-[18px] border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold">Cash with collectors</h3>
          <Link href="/treasurer/handovers" className={btn("ghost", "sm")}>Handovers<Icon name="arrow" /></Link>
        </div>
        {d.holdings.length === 0 ? (
          <p className="text-sm text-gray-500">All collector cash has been handed over.</p>
        ) : (
          <ul className="divide-y text-sm">
            {d.holdings.map((h) => (
              <li key={h.collectorId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2.5">
                <span className="font-semibold">{h.name}</span>
                <span className="ml-auto tabular-nums">
                  {formatINR(h.holding)}
                  {h.pending > 0 && <span className="ml-2 rounded-full bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn">{formatINR(h.pending)} waiting</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
