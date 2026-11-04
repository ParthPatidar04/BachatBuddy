import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import api, { errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Segmented, Skeleton, Spinner } from '../components/ui';
import { EXPENSE_CATEGORIES, FREQUENCIES, INCOME_CATEGORIES, categoryIcon } from '../utils/constants';
import { formatDate, relativeDays, toInputDate, todayInput } from '../utils/format';

const PER_MONTH = { daily: 30.4375, weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };
const freqLabel = (f) => FREQUENCIES.find((x) => x.value === f)?.label || f;

function RuleModal({ open, onClose, rule }) {
  const { user } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const editing = !!rule;
  const blank = () => ({
    type: 'expense', title: '', amount: '', category: EXPENSE_CATEGORIES[0], account: user.accounts[0] || 'Cash',
    frequency: 'monthly', date: todayInput(), endDate: '', description: '',
  });
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      rule
        ? {
            type: rule.type, title: rule.title, amount: String(rule.amount), category: rule.category, account: rule.account,
            frequency: rule.frequency, date: toInputDate(rule.nextDate), endDate: toInputDate(rule.endDate), description: rule.description || '',
          }
        : blank()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cats = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const catOptions = cats.includes(form.category) ? cats : [form.category, ...cats];
  const accOptions = user.accounts.includes(form.account) ? user.accounts : [form.account, ...user.accounts];
  const changeType = (type) => {
    const list = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    setForm((f) => ({ ...f, type, category: list.includes(f.category) ? f.category : list[0] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Please enter a title');
    if (!(Number(form.amount) > 0)) return setError('Amount must be greater than 0');
    if (!form.date) return setError('Pick a date');
    if (form.endDate && form.endDate < form.date) return setError('End date must be after the start date');
    setSaving(true);
    try {
      const base = {
        title: form.title.trim(), amount: Number(form.amount), type: form.type, category: form.category,
        account: form.account, description: form.description.trim(), frequency: form.frequency,
        endDate: form.endDate || null,
      };
      if (editing) {
        await api.put(`/recurring/${rule._id}`, { ...base, nextDate: form.date });
        toast.success('Recurring transaction updated');
      } else {
        const res = await api.post('/recurring', { ...base, startDate: form.date });
        const n = res.data.generated;
        toast.success(n ? `Created. ${n} transaction${n === 1 ? '' : 's'} added already because the date has passed` : 'Recurring transaction created');
      }
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
      title={editing ? 'Edit recurring' : 'New recurring transaction'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="rule-form" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} />} {editing ? 'Save' : 'Create'}</button>
        </>
      }
    >
      <form id="rule-form" onSubmit={submit} className="space-y-4" noValidate>
        <Segmented value={form.type} onChange={changeType} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} className="w-full [&>button]:flex-1" />
        <Field label="Title"><input className="input" value={form.title} onChange={set('title')} maxLength={100} placeholder="e.g. Netflix, Rent, Salary" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${user.currency})`}><input className="input" type="number" inputMode="decimal" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" /></Field>
          <Field label="Frequency">
            <select className="input" value={form.frequency} onChange={set('frequency')}>{FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><select className="input" value={form.category} onChange={set('category')}>{catOptions.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Account"><select className="input" value={form.account} onChange={set('account')}>{accOptions.map((a) => <option key={a}>{a}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={editing ? 'Next date' : 'Start date'} hint={editing ? undefined : 'Past dates are generated right away'}><input className="input" type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="End date (optional)"><input className="input" type="date" value={form.endDate} onChange={set('endDate')} min={form.date} /></Field>
        </div>
        <Field label="Notes (optional)"><textarea className="input min-h-[70px] resize-y" value={form.description} onChange={set('description')} maxLength={500} /></Field>
        {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

function RuleRow({ rule: r, onEdit, onDelete, onToggle }) {
  const { fmt } = useAuth();
  const Icon = categoryIcon(r.category);
  const income = r.type === 'income';
  const ended = !r.isActive && r.endDate && new Date(r.endDate) < new Date(r.nextDate);
  return (
    <li className={`flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap ${r.isActive ? '' : 'opacity-65'}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${income ? 'bg-good/15 text-good' : 'bg-primarySoft text-primary'}`}><Icon size={20} /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{r.title}</p>
        <p className="truncate text-xs text-muted">{freqLabel(r.frequency)} · {r.category} · {r.account}</p>
      </div>
      <div className="text-right">
        <p className={`font-extrabold tabular-nums ${income ? 'text-[#0a7a0a] dark:text-[#4ade4a]' : ''}`}>{income ? '+' : '-'}{fmt(r.amount)}</p>
        {r.isActive ? (
          <p className="text-xs text-muted">Next: {formatDate(r.nextDate)} · {relativeDays(r.daysUntil)}</p>
        ) : (
          <Badge tone="muted">{ended ? 'Ended' : 'Paused'}</Badge>
        )}
      </div>
      <div className="flex gap-0.5">
        <button className="icon-btn !h-8 !w-8" onClick={() => onToggle(r)} aria-label={r.isActive ? `Pause ${r.title}` : `Resume ${r.title}`} title={r.isActive ? 'Pause' : 'Resume'}>
          {r.isActive ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button className="icon-btn !h-8 !w-8" onClick={() => onEdit(r)} aria-label={`Edit ${r.title}`}><Pencil size={15} /></button>
        <button className="icon-btn !h-8 !w-8 hover:!bg-bad/10 hover:!text-bad" onClick={() => onDelete(r)} aria-label={`Delete ${r.title}`}><Trash2 size={15} /></button>
      </div>
    </li>
  );
}

export default function Recurring() {
  const { fmt } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => api.get('/recurring').then((r) => r.data), []);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const monthly = useMemo(() => {
    const active = (data?.recurring || []).filter((r) => r.isActive);
    const sum = (type) => active.filter((r) => r.type === type).reduce((s, r) => s + r.amount * PER_MONTH[r.frequency], 0);
    return { income: sum('income'), expense: sum('expense'), active: active.length };
  }, [data]);

  const toggle = async (r) => {
    try {
      await api.put(`/recurring/${r._id}`, { isActive: !r.isActive });
      toast.success(r.isActive ? 'Paused' : 'Resumed. Missed dates are skipped, not back-filled');
      bump();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/recurring/${deleting._id}`);
      toast.success('Deleted. Transactions already generated are kept');
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
      <PageHeader title="Recurring" subtitle="Salary, rent, subscriptions and other repeating money. Transactions are created automatically when due." actions={<button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> New recurring</button>} />

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Skeleton className="h-72 !rounded-3xl" />
      ) : !data.recurring.length ? (
        <Card><EmptyState icon={Repeat} title="Nothing recurring yet" text="Add your salary, rent or subscriptions once and they will be recorded on time, every time." action={<button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Add recurring</button>} /></Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-3 gap-3">
            {[['Active rules', monthly.active], ['Income / month', fmt(monthly.income)], ['Expenses / month', fmt(monthly.expense)]].map(([l, v]) => (
              <Card key={l} className="px-4 py-3"><p className="text-xs font-semibold text-muted">{l}</p><p className="truncate text-base font-extrabold tabular-nums sm:text-xl">{v}</p></Card>
            ))}
          </div>
          <Card className="overflow-hidden">
            <ul className="stagger divide-y divide-line">
              {data.recurring.map((r) => <RuleRow key={r._id} rule={r} onEdit={setModal} onDelete={setDeleting} onToggle={toggle} />)}
            </ul>
          </Card>
          <p className="flex items-center gap-1.5 text-xs text-muted"><CalendarClock size={14} /> Monthly figures are estimates from your active rules.</p>
        </div>
      )}

      <RuleModal open={!!modal} onClose={() => setModal(null)} rule={modal?._id ? modal : null} />
      <ConfirmDialog open={!!deleting} title="Delete recurring transaction?" message={deleting ? `"${deleting.title}" will stop repeating. Transactions it already created stay in your history.` : ''} onConfirm={remove} onCancel={() => setDeleting(null)} loading={busy} />
    </div>
  );
}