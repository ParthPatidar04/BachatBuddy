// Shared hover tooltip for every Recharts chart
export default function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter, footer }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[10rem] rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      {(label !== undefined || payload[0]?.payload?.category) && (
        <p className="mb-1.5 font-bold">{labelFormatter ? labelFormatter(label, payload) : label ?? payload[0].payload.category}</p>
      )}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color || p.payload?.fill || p.fill }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto pl-4 font-bold tabular-nums">{valueFormatter(p.value)}</span>
        </div>
      ))}
      {footer?.(payload)}
    </div>
  );
}