import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Flame, PiggyBank, TrendingDown, TrendingUp, CalendarRange } from 'lucide-react';
import api from '../api/client';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from '../components/ui';
import { CategoryDonut, ChartTable, IncomeExpenseBars, TopCategoryBars, TrendArea } from '../components/Charts';
import { addDaysInput, formatDate, pctText, todayInput, currentMonthKey, shiftMonthKey } from '../utils/format';

const PRESETS = [
  { value: '30d', label: '30 days' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: 'custom', label: 'Custom' },
];

const presetRange = (p) => {
  const to = todayInput();
  if (p === '30d') return { from: addDaysInput(to, -29), to };
  const months = { '3m': 3, '6m': 6, '12m': 12 }[p];
  return { from: `${shiftMonthKey(currentMonthKey(), -(months - 1))}-01`, to };
};

function Delta({ value, goodWhenUp }) {
  if (value === null || value === undefined) return <Badge tone="muted">New</Badge>;
  if (value === 0) return <Badge tone="muted">No change</Badge>;
  const up = value > 0;
  return (
    <Badge tone={up === goodWhenUp ? 'good' : 'warn'} icon={up ? ArrowUpRight : ArrowDownRight}>
      {pctText(value)}
    </Badge>
  );
}

function Metric({ icon: Icon, label, value, sub, delta, goodWhenUp }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primarySoft text-primary"><Icon size={20} /></span>
        {delta !== undefined && <Delta value={delta} goodWhenUp={goodWhenUp} />}
      </div>
      <p className="mt-3 text-sm font-semibold text-muted">{label}</p>
      <p className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export default function Analytics() {
  const { fmt } = useAuth();
  const [preset, setPreset] = useState('6m');
  const [custom, setCustom] = useState(() => presetRange('6m'));
  const [trend, setTrend] = useState('weekly');

  const range = useMemo(() => (preset === 'custom' ? custom : presetRange(preset)), [preset, custom]);
  const valid = range.from && range.to && range.from <= range.to;

  const { data, loading, error, reload } = useFetch(
    () => (valid ? api.get('/analytics', { params: range }).then((r) => r.data) : Promise.resolve(null)),
    [range.from, range.to, valid]
  );

  const pickPreset = (p) => {
    if (p === 'custom') setCustom(presetRange(preset === 'custom' ? '6m' : preset));
    setPreset(p);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" subtitle="Understand your spending habits over any period" />

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <CalendarRange size={18} className="text-muted" />
        <Segmented value={preset} onChange={pickPreset} options={PRESETS} />
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input className="input !w-auto" type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="From date" />
            <span className="text-muted">to</span>
            <input className="input !w-auto" type="date" value={custom.to} min={custom.from} max={todayInput()} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="To date" />
          </div>
        )}
        {!valid && <p className="text-sm font-medium text-bad">Choose a valid date range.</p>}
      </Card>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 !rounded-3xl" />)}
        </div>
      ) : data.totals.count === 0 && data.previous.count === 0 ? (
        <Card>
          <EmptyState icon={CalendarRange} title="No data in this period" text="Pick a different date range or add some transactions." />
        </Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <p className="text-xs text-muted">
            {formatDate(data.range.from)} - {formatDate(data.range.to)} · compared with {formatDate(data.previousRange.from)} - {formatDate(data.previousRange.to)}
          </p>

          <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={TrendingUp} label="Income" value={fmt(data.totals.income)} delta={data.changes.income} goodWhenUp sub={`Previous: ${fmt(data.previous.income)}`} />
            <Metric icon={TrendingDown} label="Expenses" value={fmt(data.totals.expense)} delta={data.changes.expense} goodWhenUp={false} sub={`Previous: ${fmt(data.previous.expense)}`} />
            <Metric icon={PiggyBank} label="Savings rate" value={`${data.totals.savingsRate}%`} sub={`Net ${fmt(data.totals.net)} · previous ${data.previous.savingsRate}%`} />
            <Metric icon={Flame} label="Avg monthly expense" value={fmt(data.avgMonthlyExpense)} sub={data.topCategories[0] ? `Top: ${data.topCategories[0].category}` : 'No expenses'} />
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <CardHeader title="Income vs Expenses" subtitle="Month by month" />
              <IncomeExpenseBars data={data.monthly} />
            </Card>
            <Card className="p-5">
              <CardHeader title="Expense breakdown" subtitle="By category" />
              {data.categories.length ? <CategoryDonut rows={data.categories} /> : <EmptyState title="No expenses in this period" />}
            </Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <CardHeader
                title="Spending trend"
                subtitle={trend === 'weekly' ? 'Expenses per week' : 'Expenses per month'}
                action={<Segmented value={trend} onChange={setTrend} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />}
              />
              {trend === 'weekly' ? <TrendArea data={data.weekly} xKey="week" name="Expenses" /> : <TrendArea data={data.monthly} xKey="month" name="Expenses" />}
            </Card>
            <Card className="p-5">
              <CardHeader title="Highest spending categories" subtitle="Top 5 in this period" />
              {data.topCategories.length ? <TopCategoryBars rows={data.topCategories} /> : <EmptyState title="No expenses in this period" />}
            </Card>
          </section>

          <Card className="p-5">
            <CardHeader title="Compared with the previous period" subtitle="Category spending, same length of time just before the selected range" />
            {data.categories.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="py-2 pr-3 font-semibold">Category</th>
                      <th className="px-3 py-2 text-right font-semibold">This period</th>
                      <th className="px-3 py-2 text-right font-semibold">Previous</th>
                      <th className="py-2 pl-3 text-right font-semibold">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((c) => (
                      <tr key={c.category} className="border-b border-line/60 last:border-0">
                        <td className="py-2.5 pr-3 font-semibold">{c.category}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(c.total)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted">{fmt(c.previousTotal)}</td>
                        <td className="py-2.5 pl-3 text-right"><Delta value={c.change} goodWhenUp={false} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No expenses in this period" />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}