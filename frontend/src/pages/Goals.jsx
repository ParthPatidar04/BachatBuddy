import { useEffect, useState } from 'react';
import { CalendarClock, CircleCheck, Pencil, PiggyBank, Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import api, { errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, ProgressBar, Skeleton, Spinner } from '../components/ui';
import { addDaysInput, formatDate, toInputDate, todayInput } from '../utils/format';

function GoalModal({ open, onClose, goal }) {
  const { user } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const editing = !!goal;
  const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(goal ? { name: goal.name, targetAmount: String(goal.targetAmount), targetDate: toInputDate(goal.targetDate) } : { name: '', targetAmount: '', targetDate: addDaysInput(todayInput(), 180) });
  }, [open, goal]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Give your goal a name');
    if (!(Number(form.targetAmount) > 0)) return setError('Target amount must be greater than 0');
    if (!form.targetDate) return setError('Pick a target date');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), targetAmount: Number(form.targetAmount), targetDate: form.targetDate };
      if (editing) await api.put(`/goals/${goal._id}`, payload);
      else await api.post('/goals', payload);
      toast.success(editing ? 'Goal updated' : 'Goal created');
      bump();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit goal' : 'New savings goal'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="goal-form" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} />} {editing ? 'Save' : 'Create goal'}</button>
        </>
      }
    >
      <form id="goal-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Goal name"><input className="input" value={form.name} onChange={set('name')} maxLength={80} placeholder="e.g. New laptop" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Target (${user.currency})`}><input className="input" type="number" inputMode="decimal" step="0.01" min="0.01" value={form.targetAmount} onChange={set('targetAmount')} placeholder="0.00" /></Field>
          <Field label="Target date"><input className="input" type="date" value={form.targetDate} onChange={set('targetDate')} /></Field>
        </div>
        {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

function AddMoneyModal({ goal, onClose }) {
  const { user, fmt } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setAmount(''); setError(''); }, [goal]);

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return setError('Enter an amount greater than 0');
    setSaving(true);
    try {
      const res = await api.post(`/goals/${goal._id}/contribute`, { amount: Number(amount) });
      toast.success(res.data.goal.completed ? `Goal reached: ${goal.name}!` : `Added ${fmt(Number(amount))} to ${goal.name}`);
      bump();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!goal}
      onClose={onClose}
      title={goal ? `Add to ${goal.name}` : ''}
      size="sm:max-w-md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="contribute-form" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} />} Add money</button>
        </>
      }
    >
      {goal && (
        <form id="contribute-form" onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm text-muted">{fmt(goal.remaining)} left to reach your {fmt(goal.targetAmount)} target. This moves money from your balance into the goal.</p>
          <Field label={`Amount (${user.currency})`}><input className="input" type="number" inputMode="decimal" step="0.01" min="0.01" max={goal.remaining} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus /></Field>
          <div className="flex flex-wrap gap-2">
            {[0.25, 0.5, 1].map((p) => (
              <button type="button" key={p} className="btn-soft !px-3 !py-1.5 !text-xs" onClick={() => setAmount(String(Math.round(goal.remaining * p * 100) / 100))}>{p === 1 ? 'Remaining' : `${p * 100}% of remaining`}</button>
            ))}
          </div>
          {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad" role="alert">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

function GoalCard({ goal: g, onAdd, onEdit, onDelete }) {
  const { fmt } = useAuth();
  const status = g.completed ? { tone: 'good', icon: CircleCheck, text: 'Completed' } : g.overdue ? { tone: 'bad', icon: CalendarClock, text: 'Past target date' } : g.onTrack === false ? { tone: 'warn', icon: TrendingUp, text: 'Behind pace' } : g.onTrack ? { tone: 'good', icon: TrendingUp, text: 'On track' } : { tone: 'muted', icon: Target, text: 'No savings yet' };
  return (
    <Card className="card-hover flex flex-col p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primarySoft text-primary"><Target size={21} /></div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold">{g.name}</h3>
          <p className="text-xs text-muted">Target date {formatDate(g.targetDate)}</p>
        </div>
        <div className="flex gap-0.5">
          <button className="icon-btn !h-8 !w-8" onClick={() => onEdit(g)} aria-label={`Edit ${g.name}`}><Pencil size={15} /></button>
          <button className="icon-btn !h-8 !w-8 hover:!bg-bad/10 hover:!text-bad" onClick={() => onDelete(g)} aria-label={`Delete ${g.name}`}><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="mb-1.5 flex items-end justify-between">
        <p className="text-2xl font-extrabold tabular-nums">{fmt(g.savedAmount)}</p>
        <p className="text-sm font-bold tabular-nums text-primary">{Math.round(g.percent)}%</p>
      </div>
      <ProgressBar value={g.percent} status={g.completed ? 'done' : 'ok'} label={`${g.name} progress`} height="h-3" />
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{fmt(g.remaining)} remaining</span>
        <span>of {fmt(g.targetAmount)}</span>
      </div>

      <div className="mt-4 space-y-1.5 rounded-2xl bg-surface2 p-3 text-xs">
        <div className="flex items-center justify-between"><span className="text-muted">Status</span><Badge tone={status.tone} icon={status.icon}>{status.text}</Badge></div>
        {!g.completed && (
          <>
            <div className="flex justify-between"><span className="text-muted">Estimated completion</span><span className="font-semibold">{g.estimatedCompletion ? formatDate(g.estimatedCompletion) : 'Add money to see'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Needed per month</span><span className="font-semibold tabular-nums">{g.overdue ? '-' : fmt(g.requiredPerMonth)}</span></div>
          </>
        )}
      </div>

      <button className="btn-primary mt-4 w-full" onClick={() => onAdd(g)} disabled={g.completed}>
        <Plus size={16} /> {g.completed ? 'Goal reached' : 'Add money'}
      </button>
    </Card>
  );
}

export default function Goals() {
  const { fmt } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get('/goals').then((r) => r.data), []);
  const [modal, setModal] = useState(null);
  const [adding, setAdding] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/goals/${deleting._id}`);
      toast.success('Goal deleted');
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
      <PageHeader title="Savings goals" subtitle="Save towards the things that matter" actions={<button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> New goal</button>} />

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 !rounded-3xl" />)}</div>
      ) : !data.goals.length ? (
        <Card><EmptyState icon={PiggyBank} title="No savings goals yet" text="Create a goal like an emergency fund or a trip, then add money as you save." action={<button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Create your first goal</button>} /></Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-3 gap-3">
            {[['Total saved', fmt(data.summary.totalSaved)], ['Total target', fmt(data.summary.totalTarget)], ['Active goals', data.summary.active]].map(([l, v]) => (
              <Card key={l} className="px-4 py-3"><p className="text-xs font-semibold text-muted">{l}</p><p className="truncate text-base font-extrabold tabular-nums sm:text-xl">{v}</p></Card>
            ))}
          </div>
          <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.goals.map((g) => <GoalCard key={g._id} goal={g} onAdd={setAdding} onEdit={setModal} onDelete={setDeleting} />)}
          </div>
        </div>
      )}

      <GoalModal open={!!modal} onClose={() => setModal(null)} goal={modal?._id ? modal : null} />
      <AddMoneyModal goal={adding} onClose={() => setAdding(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete goal?"
        message={deleting ? `"${deleting.name}" will be removed.${deleting.savedAmount > 0 ? ` The ${fmt(deleting.savedAmount)} saved in it returns to your available balance.` : ''}` : ''}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
        loading={busy}
      />
    </div>
  );
}