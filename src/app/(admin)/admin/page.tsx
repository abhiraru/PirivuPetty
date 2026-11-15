import Link from "next/link";
import { ChartCard, Donut, HBars, LineArea, VBars } from "@/components/charts";
import { resolveFestival } from "@/components/ReportView";
import { Icon } from "@/components/ui/Icon";
import { btn } from "@/components/ui/btn";
import { Kpi } from "@/components/ui/Kpi";
import { WelcomeHeader } from "@/components/WelcomeHeader";
import { requireRole } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { getOverview } from "@/modules/reports/overview";

export default async function AdminOverview() {
  const user = await requireRole("ADMIN");
  const festival = await resolveFestival();
  if (!festival)
    return (
      <div className="space-y-5">
        <WelcomeHeader name={user.name} />
        <div className="rounded-[18px] border bg-card p-6">
          <h2 className="text-lg font-bold">Let&apos;s get started</h2>
          <p className="mt-1 text-sm text-gray-500">Create a festival, then add areas, collectors and households.</p>
          <Link href="/admin/festivals" className={btn("primary", "md", "mt-3")}><Icon name="plus" />Create a festival</Link>
        </div>
      </div>
    );

  const o = await getOverview(festival.id);
  const b = o.dash.balances;
  const pct = o.dash.pledged > 0 ? Math.round((b.collectedTotal / o.dash.pledged) * 100) : 0;
  const a = o.attention;
  const alerts: { text: string; href: string }[] = [];
  if (a.pendingHandovers > 0) alerts.push({ text: `${formatINR(a.pendingHandovers)} in handovers waiting for the treasurer`, href: "/admin/reports/collectors" });
  if (a.chequeCount > 0) alerts.push({ text: `${a.chequeCount} cheque${a.chequeCount === 1 ? "" : "s"} (${formatINR(a.chequeAmount)}) not yet cleared`, href: "/admin/reports/cheques" });
  for (const h of a.holdingCollectors) alerts.push({ text: `${h.name} holds ${formatINR(h.holding)} in cash`, href: "/admin/reports/collectors" });
  if (a.withoutPromise > 0) alerts.push({ text: `${a.withoutPromise} households have no promise yet`, href: "/admin/reports/pending" });

  return (
    <div className="space-y-5">
      <WelcomeHeader name={user.name} subtitle={`${festival.name} · ${festival.status === "ACTIVE" ? "collection in progress" : festival.status === "CLOSED" ? "closed" : "not started"}`}>
        <Link href="/admin/reports" className={btn("primary")}><Icon name="chart" />Open reports</Link>
      </WelcomeHeader>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Key figures">
        <Kpi label="Total fund" value={formatINR(b.netFund)} hint={`Cash ${formatINR(b.cashInHand)} · Bank ${formatINR(b.bank)}`} />
        <Kpi label="Collected" value={formatINR(b.collectedTotal)} hint={`${pct}% of ${formatINR(o.dash.pledged)} promised`} />
        <Kpi label="Other sources" value={formatINR(b.otherIncome)} hint="Interest, sponsorship..." />
        <Kpi label="Spent" value={formatINR(b.spentTotal)} hint={b.collectedTotal > 0 ? `${Math.round((b.spentTotal / b.collectedTotal) * 100)}% of collected` : undefined} />
        <Kpi label="Still to collect" value={formatINR(o.dash.stillToCollect)} tone={o.dash.stillToCollect > 0 ? "warn" : undefined} hint={`${o.dash.pledgeCount} households promised`} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Collected by collector" hint="Money each collector took, next to what is still unpaid in their area">
          <HBars series={["Collected", "Not yet paid"]} rows={o.collectors.map((c) => ({ label: c.label, values: [c.collected, c.unpaid] }))} />
        </ChartCard>
        <ChartCard title="How people paid">
          <Donut centerLabel="collected" slices={o.modes} />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Where the money went" hint="Expenses by category">
          <Donut centerLabel="spent" slices={o.expenses} />
        </ChartCard>
        <ChartCard title="Year by year" hint="Collected and spent in each festival">
          <VBars series={["Collected", "Spent"]} groups={o.perYear} />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Collection over time" hint="Running total of payments received">
          <LineArea points={o.timeline} />
        </ChartCard>
        <ChartCard title="Needs attention">
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nothing needs attention.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {alerts.map((x) => (
                <li key={x.text} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl bg-warn-bg p-3 text-warn">
                  <span>{x.text}</span>
                  <Link href={x.href} className={btn("secondary", "sm")}>Review<Icon name="arrow" /></Link>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
