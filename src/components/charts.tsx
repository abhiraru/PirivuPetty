import Link from "next/link";
import { donutSegments, linePoints, niceMax } from "@/lib/chartMath";
import { btn } from "./ui/btn";
import { formatINR, formatINRCompact } from "@/lib/money";

export const SERIES = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];

export function ChartCard({ title, hint, children, className = "" }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[18px] border bg-card p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-bold">{title}</h3>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-gray-500">{children}</p>;
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars, one row per item, with one or two series. */
export function HBars({ rows, series }: { rows: { label: string; values: number[] }[]; series: string[] }) {
  const max = Math.max(...rows.flatMap((r) => r.values), 0);
  if (rows.length === 0 || max === 0) return <Empty>Nothing collected yet.</Empty>;
  return (
    <div>
      {series.length > 1 && <Legend items={series.map((s, i) => ({ label: s, color: SERIES[i] }))} />}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <span className="truncate font-semibold" title={r.label}>{r.label}</span>
            <div className="space-y-1">
              {r.values.map((v, i) => (
                <div key={i} className="flex items-center gap-2" title={`${r.label}, ${series[i]}: ${formatINR(v)}`}>
                  <div className="h-3 rounded-full" style={{ width: `${Math.max((v / max) * 100, v > 0 ? 2 : 0)}%`, background: SERIES[i] }} />
                  <span className="whitespace-nowrap text-xs tabular-nums text-gray-500">{formatINR(v)}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Donut with a centre total and a legend showing amount and share. */
export function Donut({ slices, centerLabel }: { slices: { label: string; value: number }[]; centerLabel: string }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const live = slices.filter((s) => s.value > 0);
  const total = live.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <Empty>Nothing to show yet.</Empty>;
  const segs = donutSegments(live.map((s) => s.value), C);
  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" role="img" aria-label={`${centerLabel}: ${live.map((s) => `${s.label} ${formatINR(s.value)}`).join(", ")}`}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--subtle-2)" strokeWidth="16" />
        {segs.map((g, i) => (
          <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="16" strokeDasharray={`${g.length} ${C - g.length}`} strokeDashoffset={g.offset} transform="rotate(-90 60 60)">
            <title>{`${live[i].label}: ${formatINR(live[i].value)}`}</title>
          </circle>
        ))}
        <text x="60" y="58" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--fg)">{formatINRCompact(total)}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="7" fill="var(--muted)">{centerLabel}</text>
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {live.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} aria-hidden />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums text-gray-500">{formatINR(s.value)} · {Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vertical grouped bars, e.g. collected and spent for each year. */
export function VBars({ groups, series }: { groups: { label: string; values: number[] }[]; series: string[] }) {
  const max = niceMax(Math.max(...groups.flatMap((g) => g.values), 0));
  if (groups.length === 0 || groups.every((g) => g.values.every((v) => v === 0))) return <Empty>No earlier years to compare yet.</Empty>;
  return (
    <div>
      <Legend items={series.map((s, i) => ({ label: s, color: SERIES[i] }))} />
      <div className="flex items-end gap-3 border-b pt-5" style={{ height: 190 }}>
        {groups.map((g) => (
          <div key={g.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1">
            {g.values.map((v, i) => (
              <div key={i} className="relative w-full max-w-9 rounded-t-md" style={{ height: `${(v / max) * 100}%`, background: SERIES[i], minHeight: v > 0 ? 3 : 0 }} title={`${g.label}, ${series[i]}: ${formatINR(v)}`}>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tabular-nums text-gray-500">{v > 0 ? formatINRCompact(v) : ""}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-3">
        {groups.map((g) => <span key={g.label} className="min-w-0 flex-1 truncate text-center text-xs text-gray-500">{g.label}</span>)}
      </div>
    </div>
  );
}

/** Area line over time. Labels the axis with a few real values and marks the last point. */
export function LineArea({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0 || points.every((p) => p.value === 0)) return <Empty>No payments recorded yet.</Empty>;
  const W = 600, H = 170, padL = 46, padB = 22, padT = 10;
  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const pts = linePoints(points.map((p) => p.value), W - padL - 8, H - padT - padB, max).map((p) => ({ x: p.x + padL, y: p.y + padT }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const base = H - padB;
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${base} L${pts[0].x.toFixed(1)} ${base} Z`;
  const ticks = [0, 0.5, 1];
  const xs = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const last = pts[pts.length - 1];
  return (
    <div className="overflow-x-auto">
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[480px]" role="img" aria-label={`Cumulative collection over time, reaching ${formatINR(points[points.length - 1].value)}`}>
      {ticks.map((t) => {
        const y = padT + (1 - t) * (H - padT - padB);
        return (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{formatINRCompact(max * t)}</text>
          </g>
        );
      })}
      <path d={area} fill="var(--c1)" opacity="0.14" />
      <path d={line} fill="none" stroke="var(--c1)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="4.5" fill="var(--c1)" stroke="var(--card)" strokeWidth="2" />
      {xs.map((i) => (
        <text key={i} x={pts[i].x} y={H - 5} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--muted)">{points[i].label}</text>
      ))}
    </svg>
    </div>
  );
}

/** One bar split by status, with a legend. Items that have a link become buttons that open that filtered list. */
export function StatusBar({ items }: { items: { label: string; count: number; color: string; href?: string }[] }) {
  const total = items.reduce((a, i) => a + i.count, 0);
  if (total === 0) return <Empty>No households yet.</Empty>;
  return (
    <div className="space-y-3">
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={items.map((i) => `${i.label} ${i.count}`).join(", ")}>
        {items.map((i) => <span key={i.label} style={{ width: `${(i.count / total) * 100}%`, background: i.color }} title={`${i.label}: ${i.count}`} />)}
      </div>
      <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {items.map((i) => {
          const inner = (
            <>
              <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />{i.label}</span>
              <b className="tabular-nums">{i.count}</b>
            </>
          );
          return (
            <li key={i.label}>
              {i.href ? (
                <Link href={i.href} className={btn("secondary", "sm", "w-full justify-between")}>{inner}</Link>
              ) : (
                <span className="flex h-8 items-center justify-between rounded-[10px] border border-dashed px-3 text-[13px] font-semibold text-gray-500">{inner}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
