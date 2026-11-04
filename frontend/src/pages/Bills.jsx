import { useEffect, useState } from 'react';
import { BellRing, CalendarClock, CircleCheck, CircleAlert, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import api, { errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, Spinner } from '../components/ui';
import { EXPENSE_CATEGORIES } from '../utils/constants';
import { addDaysInput, formatDate, relativeDays, toInputDate, todayInput } from '../utils/format';

function BillModal({ open, onClose, bill }) {
  const { user, fmt } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const editing = !!bill;
  const blank = () => ({ name: '', amount: '', dueDate: addDaysInput(todayInput(), 7), category: 'Bills & Utilities', account: user.accounts[0] || 'Cash', reminderDays: '3' });
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(bill ? { name: bill.name, amount: String(bill.amount), dueDate: toInputDate(bill.dueDate), category: bill.category, account: bill.account, reminderDays: String(bill.reminderDays) } : blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bill]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cats = EXPENSE_CATEGORIES.includes(form.category) ? EXPENSE_CATEGORIES : [form.category, ...EXPENSE_CATEGORIES];
  const accs = user.accounts.includes(form.account) ? user.accounts : [form.account, ...user.accounts];

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Please enter a bill name');
    if (!(Number(form.amount) > 0)) return setError('Amount must be greater than 0');
    if (!form.dueDate) return setError('Pick a due date');
    const reminder = Number(form.reminderDays);
    if (!Number.isInteger(reminder) || reminder < 0 || reminder > 30) return setError('Reminder must be a whole number between 0 and 30 days');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), amount: Number(form.amount), dueDate: form.dueDate, category: form.category, account: form.account, reminderDays: reminder };
      if (editing) await api.put(`/bills/${bill._id}`, payload);
      else await api.post('/bills', payload);
      toast.success(editing ? 'Bill updated' : `Bill added. We will remind you ${reminder} day${reminder === 1 ? '' : 's'} before it is due`);
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
      title={editing ? 'Edit bill' : 'Add a bill'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="bill-form" className="btn-primary" disabled={saving}>{saving && <Spinner size={16} />} {editing ? 'Save' : 'Add bill'}</button>
        </>
      }
    >
      <form id="bill-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Bill name"><input className="input" value={form.name} onChange={set('name')} maxLength={100} placeholder="e.g. Electricity" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${user.currency})`}><input className="input" type="number" inputMode="decimal" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" /></Field>
          <Field label="Due date"><input className="input" type="date" value={form.dueDate} onChange={set('dueDate')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><select className="input" value={form.category} onChange={set('category')}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Paid from"><select className="input" value={form.account} onChange={set('account')}>{accs.map((a) => <option key={a}>{a}</option>)}</select></Field>
        </div>
        <Field label="Remind me (days before)" hint="You will get an in-app notification"><input className="input" type="number" min="0" max="30" step="1" value={form.reminderDays} onChange={set('reminderDays')} /></Field>
        <p className="text-xs text-muted">When you mark this bill as paid, a {fmt(Number(form.amount) || 0)} expense is recorded automatically.</p>
        {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

function BillRow({ bill: b, onPay, onEdit, onDelete, paying }) {
  const { fmt } = useAuth();
  const paid = b.status === 'paid';
  const soon = !paid && !b.overdue && b.daysUntil <= b.reminderDays;
  const badge = paid ? <Badge tone="good" icon={CircleCheck}>Paid {formatDate(b.paidAt)}</Badge> : b.overdue ? <Badge tone="bad" icon={CircleAlert}>{relativeDays(b.daysUntil)}</Badge> : soon ? <Badge tone="warn" icon={BellRing}>{relativeDays(b.daysUntil)}</Badge> : <Badge tone="muted" icon={CalendarClock}>{relativeDays(b.daysUntil)}</Badge>;
  return (
    <li className={`flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap ${paid ? 'opacity-70' : ''}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${b.overdue ? 'bg-bad/10 text-bad' : 'bg-primarySoft text-primary'}`}><Receipt size={20} /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{b.name}</p>
        <p className="truncate text-xs text-muted">Due {formatDate(b.dueDate)} · {b.category}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="font-extrabold tabular-nums">{fmt(b.amount)}</p>
        {badge}
      </div>
      <div className="flex items-center gap-1">
        {!paid && (
          <button className="btn-soft !px-3 !py-1.5 !text-xs" onClick={() => onPay(b)} disabled={paying === b._id}>
            {paying === b._id ? <Spinner size={14} /> : <CircleCheck size={14} />} Mark paid
          </button>
        )}
        {!paid && <button className="icon-btn !h-8 !w-8" onClick={() => onEdit(b)} aria-label={`Edit ${b.name}`}><Pencil size={15} /></button>}
        <button className="icon-btn !h-8 !w-8 hover:!bg-bad/10 hover:!text-bad" onClick={() => onDelete(b)} aria-label={`Delete ${b.name}`}><Trash2 size={15} /></button>
      </div>
    </li>
  );
}

export default function Bills() {
  const { fmt } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => api.get('/bills').then((r) => r.data), []);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(null);

  const pay = async (b) => {
    setPaying(b._id);
    try {
      await api.post(`/bills/${b._id}/pay`);
      toast.success(`${b.name} marked as paid and recorded as an expense`);
      bump();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setPaying(null);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/bills/${deleting._id}`);
      toast.success('Bill deleted');
      bump();
      setDeleting(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const pending = data?.bills.filter((b) => b.status === 'pending') || [];
  const paid = data?.bills.filter((b) => b.status === 'paid') || [];
  const overdue = pending.filter((b) => b.overdue);
  const upcoming = pending.filter((b) => !b.overdue);
  const section = (title, list, tone) => list.length > 0 && (
    <div>
      <h2 className={`mb-2 px-1 text-sm font-bold ${tone || 'text-muted'}`}>{title} ({list.length})</h2>
      <Card className="overflow-hidden"><ul className="divide-y divide-line">{list.map((b) => <BillRow key={b._id} bill={b} onPay={pay} onEdit={setModal} onDelete={setDeleting} paying={paying} />)}</ul></Card>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Bills" subtitle="Never miss a due date" actions={<button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Add bill</button>} />

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Skeleton className="h-72 !rounded-3xl" />
      ) : !data.bills.length ? (
        <Card><EmptyState icon={Receipt} title="No bills yet" text="Add a bill with its due date and we will remind you before it is due." action={<button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Add your first bill</button>} /></Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-3 gap-3">
            {[['Pending', data.summary.pendingCount], ['Overdue', data.summary.overdueCount], ['Amount due', fmt(data.summary.pendingTotal)]].map(([l, v]) => (
              <Card key={l} className={`px-4 py-3 ${l === 'Overdue' && v > 0 ? '!border-bad/40' : ''}`}><p className="text-xs font-semibold text-muted">{l}</p><p className={`truncate text-base font-extrabold tabular-nums sm:text-xl ${l === 'Overdue' && v > 0 ? 'text-bad' : ''}`}>{v}</p></Card>
            ))}
          </div>
          {section('Overdue', overdue, 'text-bad')}
          {section('Upcoming', upcoming)}
          {section('Paid', paid)}
        </div>
      )}

      <BillModal open={!!modal} onClose={() => setModal(null)} bill={modal?._id ? modal : null} />
      <ConfirmDialog open={!!deleting} title="Delete bill?" message={deleting ? `"${deleting.name}" will be removed.${deleting.status === 'paid' ? ' The expense recorded when you paid it stays in your transactions.' : ''}` : ''} onConfirm={remove} onCancel={() => setDeleting(null)} loading={busy} />
    </div>
  );
}