export function UsageMeter({ label, value, limit, detail }: { label: string; value: number; limit: number; detail: string }) {
  const exactPercent = (value / Math.max(limit, 1)) * 100;
  const barPercent = Math.min(100, exactPercent);
  const labelPercent = value > 0 && exactPercent < 1 ? "<1%" : `${Math.min(100, Math.round(exactPercent))}%`;
  return <div className="panel p-5"><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div><p className="text-sm font-semibold">{value.toLocaleString()} <span className="font-normal text-[var(--muted)]">/ {limit.toLocaleString()}</span></p></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--panel-muted)]"><div className="h-full rounded-full bg-[var(--primary-gradient)]" style={{ width: `${barPercent}%` }} /></div><p className="mt-2 text-right text-[11px] text-[var(--muted)]">{labelPercent} used</p></div>;
}
