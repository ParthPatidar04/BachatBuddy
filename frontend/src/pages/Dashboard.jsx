import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, CircleAlert, PiggyBank, Plus, Receipt, Repeat, Sparkles, Target,
  TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import api, { errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, ProgressBar, Segmented, Skeleton } from '../components/ui';
import { CategoryDonut, IncomeExpenseBars, TrendArea } from '../components/Charts';
import TransactionItem from '../components/TransactionItem';
import TransactionFormModal from '../components/TransactionFormModal';
import BudgetRow from '../components/BudgetRow';
import Orb from '../components/Orb';
import { formatDate, formatShortDate, monthLongLabel, pctText, relativeDays } from '../utils/format';

function Delta({ value, goodWhenUp }) {
  if (value === null || value === undefined) return <Badge tone="muted">New</Badge>;
  if (value === 0) return <Badge tone="muted">No change</Badge>;
  const up = value > 0;
  const good = up === goodWhenUp;
  return (
    <Badge tone={good ? 'good' : 'warn'} icon={up ? ArrowUpRight : ArrowDownRight}>
      {pctText(value)}
    </Badge>
  );
}

function StatCard({ icon: Icon, label, value, sub, delta, goodWhenUp }) {
  return (
    <Card className="card-hover p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primarySoft text-primary">
          <Icon size={20} />
        </span>
        {delta !== undefined && <Delta value={delta} goodWhenUp={goodWhenUp} />}
      </div>
      <p className="mt-4 text-sm font-semibold text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  );
}

const DashboardSkeleton = () => (
  <div className="space-y-5">
    <Skeleton className="h-10 w-64" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 !rounded-3xl" />)}
    </div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Skeleton className="h-80 !rounded-3xl lg:col-span-2" />
      <Skeleton className="h-80 !rounded-3xl" />
    </div>
  </div>
);

export default function Dashboard() {
  const { user, fmt } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get('/dashboard').then((r) => r.data), []);
  const [trend, setTrend] = useState('monthly');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <DashboardSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const { summary: s } = data;
  const net = s.thisMonth.net;
  const monthlyTrend = data.monthly.map((m) => ({ month: m.month, expense: m.expense }));

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/transactions/${deleting._id}`);
      toast.success('Transaction deleted');
      bump();
      setDeleting(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Your finances for {monthLongLabel(data.month)} and beyond</p>
      </div>

      {/* summary cards */}
      <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary">
        <Card className="hero-gradient relative overflow-hidden border-transparent p-5 sm:col-span-2 xl:col-span-1">
          <Orb size={110} float className="absolute -right-6 -top-6 opacity-60" />
          <div className="relative">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface/70 text-primary backdrop-blur">
              <Wallet size={20} />
            </span>
            <p className="mt-4 text-sm font-semibold text-ink/70">Total Balance</p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight tabular-nums">{fmt(s.balance)}</p>
            <p className="mt-1 text-xs text-ink/70">
              Available after savings · this month {net >= 0 ? '+' : '-'}
              {fmt(Math.abs(net))}
            </p>
          </div>
        </Card>
        <StatCard icon={TrendingUp} label="Total Income" value={fmt(s.income)} sub={`This month: ${fmt(s.thisMonth.income)}`} delta={s.incomeChangePct} goodWhenUp />
        <StatCard icon={TrendingDown} label="Total Expenses" value={fmt(s.expense)} sub={`This month: ${fmt(s.thisMonth.expense)}`} delta={s.expenseChangePct} goodWhenUp={false} />
        <StatCard icon={PiggyBank} label="Total Savings" value={fmt(s.savings)} sub="Set aside in savings goals" />
      </section>

      <p className="-mt-2 text-xs text-muted">Change badges compare this month so far with the same days of last month.</p>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader title="Income vs Expenses" subtitle="Last 6 months" />
          <IncomeExpenseBars data={data.monthly} />
        </Card>
        <Card className="p-5">
          <CardHeader title="Where your money goes" subtitle={`${monthLongLabel(data.month)} expenses`} />
          {data.categories.length ? (
            <CategoryDonut rows={data.categories} />
          ) : (
            <EmptyState icon={Receipt} title="No expenses this month" text="Add an expense to see your category breakdown." />
          )}
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            title="Spending trend"
            subtitle={trend === 'monthly' ? 'Expenses per month' : 'Expenses per week, last 8 weeks'}
            action={<Segmented value={trend} onChange={setTrend} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }]} />}
          />
          {trend === 'monthly' ? <TrendArea data={monthlyTrend} xKey="month" name="Expenses" /> : <TrendArea data={data.weekly} xKey="week" name="Expenses" />}
        </Card>

        <Card className="hero-gradient relative overflow-hidden border-transparent p-5">
          <Orb size={64} className="absolute right-4 top-4" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              <Sparkles size={14} /> AI Money Assistant
            </p>
            <h2 className="mt-1 max-w-[11rem] text-lg font-extrabold leading-snug">Insights from your data</h2>
            <ul className="mt-4 space-y-2.5">
              {data.insights.map((tip) => (
                <li key={tip} className="rounded-2xl bg-surface/70 px-3.5 py-2.5 text-sm font-medium backdrop-blur">
                  {tip}
                </li>
              ))}
            </ul>
            <Link to="/assistant" className="btn-primary mt-4 w-full">
              Ask a question
            </Link>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader title="Budget overview" subtitle={monthLongLabel(data.month)} action={<Link to="/budgets" className="text-sm font-semibold text-primary hover:underline">Manage</Link>} />
          {data.budgets.length ? (
            <div className="space-y-5">
              {data.budgets.slice(0, 5).map((b) => (
                <BudgetRow key={b._id} budget={b} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Wallet} title="No budgets yet" text="Set spending limits to get warnings before you overspend." action={<Link to="/budgets" className="btn-soft">Create a budget</Link>} />
          )}
        </Card>

        <Card className="p-5">
          <CardHeader title="Savings goals" action={<Link to="/goals" className="text-sm font-semibold text-primary hover:underline">View all</Link>} />
          {data.goals.length ? (
            <div className="space-y-5">
              {data.goals.map((g) => (
                <div key={g._id}>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primarySoft text-primary">
                      <Target size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{g.name}</p>
                      <p className="text-xs text-muted">
                        {fmt(g.savedAmount)} of {fmt(g.targetAmount)}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums">{Math.round(g.percent)}%</span>
                  </div>
                  <ProgressBar value={g.percent} label={`${g.name} progress`} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={PiggyBank} title="No active goals" text="Create a goal and watch your progress grow." action={<Link to="/goals" className="btn-soft">Create a goal</Link>} />
          )}
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader title="Recent transactions" action={<Link to="/transactions" className="text-sm font-semibold text-primary hover:underline">See all</Link>} />
          {data.recent.length ? (
            <ul className="-mx-1.5">
              {data.recent.map((tx) => (
                <TransactionItem key={tx._id} tx={tx} onEdit={setEditing} onDelete={setDeleting} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={Receipt} title="No transactions yet" text="Add your first income or expense to get started." action={<button className="btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add transaction</button>} />
          )}
        </Card>

        <Card className="p-5">
          <CardHeader title="Upcoming payments" subtitle="Next 30 days" action={<Link to="/bills" className="text-sm font-semibold text-primary hover:underline">Bills</Link>} />
          {data.upcoming.length ? (
            <ul className="space-y-1">
              {data.upcoming.map((u) => (
                <li key={`${u.kind}-${u.id}`} className="flex items-center gap-3 rounded-2xl p-2">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${u.overdue ? 'bg-bad/10 text-bad' : 'bg-primarySoft text-primary'}`}>
                    {u.overdue ? <CircleAlert size={18} /> : u.kind === 'bill' ? <CalendarClock size={18} /> : <Repeat size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{u.title}</p>
                    <p className={`text-xs ${u.overdue ? 'font-semibold text-bad' : 'text-muted'}`}>
                      {u.overdue ? relativeDays(u.daysUntil) : `${formatShortDate(u.date)} · ${relativeDays(u.daysUntil)}`}
                    </p>
                  </div>
                  <p className={`text-sm font-extrabold tabular-nums ${u.type === 'income' ? 'text-[#0a7a0a] dark:text-[#4ade4a]' : ''}`}>
                    {u.type === 'income' ? '+' : '-'}
                    {fmt(u.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarClock} title="Nothing due soon" text="Bills and recurring payments will appear here." action={<Link to="/bills" className="btn-soft">Add a bill</Link>} />
          )}
        </Card>
      </section>

      <TransactionFormModal open={!!editing} transaction={editing?._id ? editing : null} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete transaction?"
        message={deleting ? `"${deleting.title}" (${fmt(deleting.amount)} on ${formatDate(deleting.date)}) will be removed and your balance and budgets will update.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={busy}
      />
    </div>
  );
}