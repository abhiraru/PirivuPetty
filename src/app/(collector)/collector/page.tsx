import Link from "next/link";
import { CallButton } from "@/components/CallButton";
import { ChartCard, Donut, HBars, LineArea, StatusBar } from "@/components/charts";
import { Icon } from "@/components/ui/Icon";
import { btn } from "@/components/ui/btn";
import { Kpi } from "@/components/ui/Kpi";
import { WelcomeHeader } from "@/components/WelcomeHeader";
import { requireRole } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { getCollectorDashboard } from "@/modules/collections/dashboard";
import { getActiveFestival } from "@/modules/festivals/queries";

const STATUS_COLOR: Record<string, string> = {
  "Paid in full": "var(--good)",
  "Partly paid": "var(--c2)",
  "Not paid": "var(--bad)",
  "No promise yet": "var(--c6)",
  "Paid, no promise": "var(--c1)",
  Declined: "var(--c3)",
};
const FILTERABLE = ["Paid in full", "Partly paid", "Not paid", "No promise yet"];
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export default async function CollectorHome() {
  const user = await requireRole("COLLECTOR");
  const festival = await getActiveFestival();
  if (!festival) {
    return (
      <div className="space-y-4">
        <WelcomeHeader name={user.name} />
        <div className="rounded-[18px] border bg-card p-6">
          <h2 className="text-lg font-bold">No festival is active right now</h2>
          <p className="mt-1 text-sm text-gray-500">The admin needs to activate a festival before collections can start.</p>
        </div>
      </div>
    );
  }

  const { overview: o, summary, areaNames, hasAreas } = await getCollectorDashboard(user, festival);

  if (!hasAreas) {
    return (
      <div className="space-y-4">
        <WelcomeHeader name={user.name} subtitle={festival.name} />
        <div className="rounded-[18px] border bg-card p-6">
          <h2 className="text-lg font-bold">You have no area yet</h2>
          <p className="mt-1 text-sm text-gray-500">Ask the admin to assign you an area. Your collection figures will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WelcomeHeader name={user.name} subtitle={`${festival.name} · ${areaNames.join(", ")}`}>
        <Link href="/collector/households" className={btn("primary")}><Icon name="plus" />Record payment</Link>
        <Link href="/collector/households/new" className={btn("secondary")}><Icon name="users" />Add household</Link>
      </WelcomeHeader>

      <section aria-label="Your collection so far" className="grid gap-5 rounded-[22px] bg-hero p-6 text-hero-fg md:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-sm opacity-75">Collected so far</p>
          <p className="my-1 text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl">{formatINR(o.collected)}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="min-w-[8.5rem] rounded-2xl bg-[var(--hero-soft)] px-4 py-2.5"><p className="text-xs opacity-75">Still to collect</p><p className="text-lg font-bold tabular-nums text-[#ffd28a]">{formatINR(o.pending)}</p></div>
            <div className="min-w-[8.5rem] rounded-2xl bg-[var(--hero-soft)] px-4 py-2.5"><p className="text-xs opacity-75">Cash with you</p><p className="text-lg font-bold tabular-nums">{formatINR(summary.holding)}</p></div>
            <div className="min-w-[8.5rem] rounded-2xl bg-[var(--hero-soft)] px-4 py-2.5"><p className="text-xs opacity-75">Households</p><p className="text-lg font-bold tabular-nums">{o.households}</p></div>
          </div>
        </div>
        <div className="self-center">
          <p className="text-sm opacity-75">Your target</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{o.progressPct}% <span className="text-sm font-medium opacity-75">of {formatINR(o.promised)} promised</span></p>
          <div className="my-2 h-2.5 overflow-hidden rounded-full bg-[var(--hero-soft)]" role="progressbar" aria-valuenow={o.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of promises collected">
            <div className="h-full rounded-full bg-accent" style={{ width: `${o.progressPct}%` }} />
          </div>
          <p className="text-xs opacity-75">{formatINR(o.pending)} still to come in from {o.pendingHouseholds} household{o.pendingHouseholds === 1 ? "" : "s"}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key figures">
        <Kpi label="Promised" value={formatINR(o.promised)} hint={`${o.promisedHouseholds} households promised`} />
        <Kpi label="Collected" value={formatINR(o.collected)} hint={o.byMode.length ? o.byMode.map((m) => m.label).join(" · ") : "Nothing yet"} />
        <Kpi label="Pending" value={formatINR(o.pending)} tone={o.pending > 0 ? "warn" : undefined} hint={`${o.pendingHouseholds} households owe`} />
        <Kpi
          label="Cash with you"
          value={formatINR(summary.holding)}
          hint="Not yet handed over"
          action={summary.holding > 0 ? <Link href="/collector/handover" className={btn("secondary", "sm")}><Icon name="wallet" />Hand over</Link> : undefined}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Collected and pending by area" hint="What households paid, next to what is still unpaid">
          <HBars series={["Collected", "Pending"]} rows={o.byArea.map((a) => ({ label: a.area, values: [a.collected, a.pending] }))} />
        </ChartCard>
        <ChartCard title="Household status" hint={`${o.households} households in your areas`}>
          <StatusBar
            items={o.status.map((s) => ({
              label: s.label,
              count: s.count,
              color: STATUS_COLOR[s.label] ?? "var(--c6)",
              href: FILTERABLE.includes(s.label) ? `/collector/households?status=${encodeURIComponent(s.label)}` : undefined,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Collection over the last 14 days" hint="Running total of payments in your areas">
          <LineArea points={o.trend} />
        </ChartCard>
        <ChartCard title="How people paid">
          <Donut centerLabel="collected" slices={o.byMode} />
        </ChartCard>
      </div>

      <section className="space-y-4 rounded-[18px] border bg-card p-5" aria-labelledby="owes-h">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="owes-h" className="font-bold">Who still owes</h2>
            <p className="text-xs text-gray-500">Largest pending amounts first</p>
          </div>
          {o.pendingHouseholds > o.topPending.length && (
            <Link href="/collector/households?status=Still%20owes" className={btn("ghost", "sm")}>See all {o.pendingHouseholds}<Icon name="arrow" /></Link>
          )}
        </div>
        {o.topPending.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">Nobody owes anything right now.</p>
        ) : (
          <ul className="divide-y">
            {o.topPending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 basis-52 items-center gap-3">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-500" aria-hidden>{initials(p.name)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-gray-500">{p.area}{p.phone ? ` · ${p.phone}` : ""}</p>
                    <p className="text-xs text-gray-500">Promised {formatINR(p.pledge ?? 0)} · paid {formatINR(p.paid)}</p>
                  </div>
                </div>
                <span className="font-extrabold tabular-nums text-warn">{formatINR(p.balance)}</span>
                <div className="flex gap-2">
                  <Link href={`/collector/households/${p.id}#record-payment`} className={btn("primary", "sm")}><Icon name="plus" />Record payment</Link>
                  {p.phone && <CallButton phone={p.phone} name={p.name} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {o.noPromise > 0 && (
        <section className="rounded-[18px] border bg-card p-5" aria-labelledby="attn-h">
          <h2 id="attn-h" className="mb-3 font-bold">Needs your attention</h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warn-bg p-3 text-sm text-warn">
            <span>{o.noPromise} household{o.noPromise === 1 ? " has" : "s have"} no promise yet</span>
            <Link href="/collector/households?status=No%20promise%20yet" className={btn("secondary", "sm")}>Set promises<Icon name="arrow" /></Link>
          </div>
        </section>
      )}
    </div>
  );
}
