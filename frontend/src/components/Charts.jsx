import { useMemo } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { foldCategories, slotColor, useChartTheme } from '../utils/chart';
import { formatShortDate, monthLabel } from '../utils/format';
import ChartTooltip from './ChartTooltip';

const tickStyle = (t) => ({ fill: t.tick, fontSize: 12 });
const crossYears = (rows) => rows.length > 1 && rows[0].month.slice(0, 4) !== rows[rows.length - 1].month.slice(0, 4);

export const Legend = ({ items }) => (
  <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted">
    {items.map((i) => (
      <li key={i.label} className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
        {i.label}
      </li>
    ))}
  </ul>
);

// Accessible alternative to a chart: the same numbers as a table
export function ChartTable({ columns, rows }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer select-none font-semibold text-primary">View as table</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-muted">
              {columns.map((c) => (
                <th key={c.key} className="py-1.5 pr-3 font-semibold">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line/60 last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="py-1.5 pr-3 tabular-nums">{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function IncomeExpenseBars({ data, height = 260 }) {
  const { fmt } = useAuth();
  const t = useChartTheme();
  const withYear = crossYears(data);
  const label = (m) => monthLabel(m, withYear);
  return (
    <div>
      <Legend items={[{ label: 'Income', color: t.income }, { label: 'Expenses', color: t.expense }]} />
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={t.grid} />
            <XAxis dataKey="month" tickFormatter={label} tick={tickStyle(t)} axisLine={{ stroke: t.axis }} tickLine={false} />
            <YAxis tickFormatter={fmt.compact} tick={tickStyle(t)} axisLine={false} tickLine={false} width={58} />
            <Tooltip
              cursor={{ fill: t.grid, opacity: 0.45 }}
              content={
                <ChartTooltip
                  labelFormatter={label}
                  valueFormatter={fmt}
                  footer={(p) => (
                    <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-semibold">
                      <span className="text-muted">Net</span>
                      <span className="tabular-nums">{fmt(p[0].payload.net ?? p[0].payload.income - p[0].payload.expense)}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="income" name="Income" fill={t.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expense" name="Expenses" fill={t.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        rows={data}
        columns={[
          { key: 'month', label: 'Month', render: (r) => label(r.month) },
          { key: 'income', label: 'Income', render: (r) => fmt(r.income) },
          { key: 'expense', label: 'Expenses', render: (r) => fmt(r.expense) },
        ]}
      />
    </div>
  );
}

// Single-series trend (spending). `xKey` is 'month' or 'week'.
export function TrendArea({ data, xKey, name = 'Spending', height = 240 }) {
  const { fmt } = useAuth();
  const t = useChartTheme();
  const valueKey = 'expense' in (data[0] || {}) ? 'expense' : 'total';
  const withYear = xKey === 'month' && crossYears(data);
  const label = (v) => (xKey === 'month' ? monthLabel(v, withYear) : formatShortDate(v));
  const gradId = `grad-${xKey}`;
  const empty = data.every((d) => !d[valueKey]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.expense} stopOpacity={0.28} />
              <stop offset="100%" stopColor={t.expense} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey={xKey} tickFormatter={label} tick={tickStyle(t)} axisLine={{ stroke: t.axis }} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={fmt.compact} tick={tickStyle(t)} axisLine={false} tickLine={false} width={58} domain={empty ? [0, 100] : ['auto', 'auto']} />
          <Tooltip
            cursor={{ stroke: t.axis, strokeWidth: 1 }}
            content={<ChartTooltip labelFormatter={(v) => (xKey === 'month' ? monthLabel(v, true) : `Week of ${formatShortDate(v)}`)} valueFormatter={fmt} />}
          />
          <Area
            type="monotone" dataKey={valueKey} name={name} stroke={t.expense} strokeWidth={2} fill={`url(#${gradId})`}
            dot={false} activeDot={{ r: 5, stroke: t.gap, strokeWidth: 2, fill: t.expense }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <ChartTable
        rows={data}
        columns={[
          { key: xKey, label: xKey === 'month' ? 'Month' : 'Week of', render: (r) => label(r[xKey]) },
          { key: valueKey, label: name, render: (r) => fmt(r[valueKey]) },
        ]}
      />
    </div>
  );
}

export function CategoryDonut({ rows, centerLabel = 'Spent' }) {
  const { fmt } = useAuth();
  const t = useChartTheme();
  const folded = useMemo(() => foldCategories(rows), [rows]);
  const data = folded.map((r) => ({ ...r, fill: slotColor(t, r.slot) }));
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div>
      <div className="relative mx-auto h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} dataKey="total" nameKey="category" innerRadius={64} outerRadius={92} paddingAngle={2}
              stroke={t.gap} strokeWidth={2} startAngle={90} endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.category} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={fmt}
                  footer={(p) => <p className="mt-1 text-muted">{p[0].payload.percent}% of spending</p>}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-semibold text-muted">{centerLabel}</span>
          <span className="text-lg font-extrabold leading-tight tabular-nums">{fmt.compact(total)}</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((d) => (
          <li key={d.category} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.fill }} />
            <span className="min-w-0 flex-1 truncate">{d.category}</span>
            <span className="text-xs text-muted tabular-nums">{d.percent}%</span>
            <span className="w-24 text-right font-semibold tabular-nums">{fmt(d.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Ranking of one measure -> one color, direct value labels
export function TopCategoryBars({ rows, height }) {
  const { fmt } = useAuth();
  const t = useChartTheme();
  const h = height || Math.max(140, rows.length * 46);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="category" width={118} tick={tickStyle(t)} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: t.grid, opacity: 0.45 }} content={<ChartTooltip valueFormatter={fmt} />} />
        <Bar dataKey="total" name="Spent" fill={t.expense} radius={[0, 4, 4, 0]} barSize={16}>
          <LabelList dataKey="total" position="right" formatter={fmt.compact} style={{ fill: 'rgb(var(--ink))', fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}