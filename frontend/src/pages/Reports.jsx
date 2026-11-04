import { useState } from 'react';
import { Download, FileDown, FileSpreadsheet, PiggyBank, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import api, { downloadFile, errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Field, PageHeader, ProgressBar, Segmented, Skeleton, Spinner } from '../components/ui';
import { CategoryDonut, ChartTable, IncomeExpenseBars, TrendArea } from '../components/Charts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants';
import { formatShortDate } from '../utils/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primarySoft text-primary"><Icon size={20} /></span>
      <p className="mt-3 text-sm font-semibold text-muted">{label}</p>
      <p className="truncate text-2xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

function CategoryTable({ rows, empty }) {
  const { fmt } = useAuth();
  if (!rows.length) return <p className="py-4 text-center text-sm text-muted">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <th className="py-2 font-semibold">Category</th>
          <th className="py-2 text-right font-semibold">Amount</th>
          <th className="py-2 text-right font-semibold">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.category} className="border-b border-line/60 last:border-0">
            <td className="py-2 font-medium">{r.category}</td>
            <td className="py-2 text-right tabular-nums">{fmt(r.total)}</td>
            <td className="py-2 text-right tabular-nums text-muted">{r.percent}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExportCard() {
  const toast = useToast();
  const [f, setF] = useState({ from: '', to: '', type: '', category: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const run = async () => {
    if (f.from && f.to && f.from > f.to) return toast.error('"From" date must be before "To" date');
    setBusy(true);
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
      await downloadFile('/reports/export/csv', params, 'transactions.csv');
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(errMsg(err, 'Could not export the CSV'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <CardHeader title="Export transactions (CSV)" subtitle="Leave filters empty to export everything" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="From"><input className="input" type="date" value={f.from} onChange={set('from')} /></Field>
        <Field label="To"><input className="input" type="date" value={f.to} onChange={set('to')} /></Field>
        <Field label="Type">
          <select className="input" value={f.type} onChange={set('type')}><option value="">All</option><option value="income">Income</option><option value="expense">Expense</option></select>
        </Field>
        <Field label="Category">
          <select className="input" value={f.category} onChange={set('category')}>
            <option value="">All</option>
            {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <button className="btn-soft mt-4" onClick={run} disabled={busy}>{busy ? <Spinner size={16} /> : <FileSpreadsheet size={16} />} Download CSV</button>
    </Card>
  );
}

export default function Reports() {
  const { fmt } = useAuth();
  const toast = useToast();
  const now = new Date();
  const [period, setPeriod] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [pdfBusy, setPdfBusy] = useState(false);

  const params = period === 'year' ? { period, year } : { period, year, month };
  const { data: r, error, loading, reload } = useFetch(() => api.get('/reports/summary', { params }).then((x) => x.data), [period, year, month]);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  const pdf = async () => {
    setPdfBusy(true);
    try {
      await downloadFile('/reports/export/pdf', params, 'financial-report.pdf');
      toast.success('PDF report downloaded');
    } catch (err) {
      toast.error(errMsg(err, 'Could not generate the PDF'));
    } finally {
      setPdfBusy(false);
    }
  };

  const empty = r && r.totals.count === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Summaries you can download and share"
        actions={<button className="btn-primary" onClick={pdf} disabled={pdfBusy || !r}>{pdfBusy ? <Spinner size={16} /> : <FileDown size={16} />} Download PDF</button>}
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Segmented value={period} onChange={setPeriod} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} />
        {period === 'month' && (
          <select className="input !w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Month">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        )}
        <select className="input !w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        {r && <p className="ml-auto text-xs text-muted">{formatShortDate(r.range.from)} to {formatShortDate(r.range.to)}</p>}
      </Card>

      {error && !r ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !r ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 !rounded-3xl" />)}</div>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={TrendingUp} label="Total income" value={fmt(r.totals.income)} sub={`${r.totals.count} transactions`} />
            <Stat icon={TrendingDown} label="Total expenses" value={fmt(r.totals.expense)} />
            <Stat icon={PiggyBank} label="Net savings" value={fmt(r.savings.netSavings)} sub={r.totals.income > 0 ? `${r.totals.savingsRate}% savings rate` : 'No income recorded'} />
            <Stat icon={Receipt} label="Held in goals" value={fmt(r.savings.heldInGoals)} sub="All active goals" />
          </div>

          {empty ? (
            <Card><EmptyState icon={Receipt} title={`No transactions in ${r.label}`} text="Pick another period or add transactions to see a report." /></Card>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-5">
                  <CardHeader title="Expenses by category" subtitle={r.label} />
                  {r.expenseByCategory.length ? <CategoryDonut rows={r.expenseByCategory} /> : <p className="py-6 text-center text-sm text-muted">No expenses in this period</p>}
                </Card>
                <Card className="p-5">
                  <CardHeader title={r.trend.kind === 'monthly' ? 'Income vs expenses by month' : 'Weekly spending'} subtitle={r.label} />
                  {r.trend.kind === 'monthly' ? (
                    <>
                      <IncomeExpenseBars data={r.trend.rows} />
                      <ChartTable columns={[{ key: 'month', label: 'Month' }, { key: 'income', label: 'Income', render: (x) => fmt(x.income) }, { key: 'expense', label: 'Expenses', render: (x) => fmt(x.expense) }]} rows={r.trend.rows} />
                    </>
                  ) : (
                    <TrendArea data={r.trend.rows} xKey="week" name="Expenses" />
                  )}
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-5"><CardHeader title="Expense breakdown" /><CategoryTable rows={r.expenseByCategory} empty="No expenses in this period" /></Card>
                <Card className="p-5"><CardHeader title="Income breakdown" /><CategoryTable rows={r.incomeByCategory} empty="No income in this period" /></Card>
              </div>

              {r.period === 'month' && r.budgets.length > 0 && (
                <Card className="p-5">
                  <CardHeader title="Budgets" subtitle={r.label} />
                  <ul className="space-y-4">
                    {r.budgets.map((b) => (
                      <li key={b._id}>
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                          <span className="font-semibold">{b.category === 'overall' ? 'Overall budget' : b.category}</span>
                          <span className="tabular-nums text-muted">{fmt(b.spent)} / {fmt(b.limit)} {b.status !== 'ok' && <Badge tone={b.status === 'exceeded' ? 'bad' : 'warn'}>{b.status === 'exceeded' ? 'Exceeded' : 'Near limit'}</Badge>}</span>
                        </div>
                        <ProgressBar value={b.percent} status={b.status} label={`${b.category} budget used`} />
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}

          {r.goals.length > 0 && (
            <Card className="p-5">
              <CardHeader title="Savings summary" subtitle="Current state of your goals" />
              <ul className="space-y-4">
                {r.goals.map((g) => (
                  <li key={g._id}>
                    <div className="mb-1.5 flex justify-between gap-2 text-sm"><span className="font-semibold">{g.name}</span><span className="tabular-nums text-muted">{fmt(g.savedAmount)} / {fmt(g.targetAmount)} ({Math.round(g.percent)}%)</span></div>
                    <ProgressBar value={g.percent} status={g.completed ? 'done' : 'ok'} label={`${g.name} progress`} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <ExportCard />
      <p className="flex items-center gap-1.5 text-xs text-muted"><Download size={14} /> Files are generated on demand from your latest data.</p>
    </div>
  );
}