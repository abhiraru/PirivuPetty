/** One headline number. Pass `action` for a button under it (for example "Hand over"). */
export function Kpi({ label, value, hint, tone, action }: { label: string; value: string; hint?: string; tone?: "warn" | "bad"; action?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[18px] border bg-card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-extrabold tabular-nums tracking-tight ${tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : ""}`}>{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
