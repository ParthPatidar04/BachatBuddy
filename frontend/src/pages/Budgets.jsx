import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Plus, Wallet } from 'lucide-react';
import api, { errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, Spinner } from '../components/ui';
import BudgetRow from '../components/BudgetRow';
import { EXPENSE_CATEGORIES } from '../utils/constants';
import { currentMonthKey, monthLongLabel, shiftMonthKey } from '../utils/format';

function BudgetModal({ open, onClose, month, existing, taken }) {
  const { user } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const editing = !!existing;
  const available = ['overall', ...EXPENSE_CATEGORIES].filter((c) => !taken.includes(c));
  const [category, setCategory] = useState('overall');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setCategory(existing?.category || available[0] || 'overall');
    setLimit(existing ? String(existing.limit) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(limit);
    if (!(value > 0)) return setError('Enter a limit greater than 0');
    if (!category) return setError('Choose a category');
    setSaving(true);
    try {
      await api.put('/budgets', { month, category, limit: value });
      toast.success(editing ? 'Budget updated' : 'Budget created');
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
      title={`${editing ? 'Edit' : 'New'} budget · ${monthLongLabel(month)}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="budget-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner size={16} />} {editing ? 'Save' : 'Create budget'}
          </button>
        </>
      }
    >
      <form id="budget-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Applies to">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} disabled={editing}>
            {(editing ? [existing.category] : available).map((c) => (
              <option key={c} value={c}>{c === 'overall' ? 'Overall monthly budget' : c}</option>
            ))}
          </select>
        </Field>
        <Field label={`Monthly limit (${user.currency})`}>
          <input className="input" type="number" inputMode="decimal" step="0.01" min="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" autoFocus />
        </Field>
        {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

export default function Budgets() {
  const { fmt } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const [month, setMonth] = useState(currentMonthKey());
  const [modal, setModal] = useState(null); // {} new, budget = edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);

  const { data, loading, error, reload } = useFetch(() => api.get('/budgets', { params: { month } }).then((r) => r.data), [month]);

  const overall = data?.budgets.find((b) => b.category === 'overall');
  const categories = data?.budgets.filter((b) => b.category !== 'overall') || [];
  const allocated = categories.reduce((s, b) => s + b.limit, 0);
  const isCurrent = month === currentMonthKey();

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/budgets/${deleting._id}`);
      toast.success('Budget deleted');
      bump();
      setDeleting(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const copyPrevious = async () => {
    setCopying(true);
    try {
      const res = await api.post('/budgets/copy-previous', { month });
      res.data.copied ? toast.success(`Copied ${res.data.copied} budget${res.data.copied > 1 ? 's' : ''} from last month`) : toast.info('Nothing new to copy. You already have those budgets.');
      bump();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budgets"
        subtitle="Set spending limits and get warned before you overspend"
        actions={
          <>
            <button className="btn-ghost" onClick={copyPrevious} disabled={copying}>
              {copying ? <Spinner size={16} /> : <Copy size={16} />} Copy last month
            </button>
            <button className="btn-primary" onClick={() => setModal({})}>
              <Plus size={16} /> New budget
            </button>
          </>
        }
      />

      <div className="flex items-center justify-center gap-2">
        <button className="icon-btn border border-line bg-surface" onClick={() => setMonth(shiftMonthKey(month, -1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <span className="min-w-[10rem] text-center font-bold">{monthLongLabel(month)}</span>
        <button className="icon-btn border border-line bg-surface" onClick={() => setMonth(shiftMonthKey(month, 1))} disabled={isCurrent} aria-label="Next month"><ChevronRight size={18} /></button>
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <div className="grid gap-5 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 !rounded-3xl" />)}</div>
      ) : !data.budgets.length ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title={`No budgets for ${monthLongLabel(month)}`}
            text="Create an overall monthly budget and category limits, or copy last month's."
            action={<button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Create a budget</button>}
          />
        </Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {overall ? (
            <Card className="hero-gradient border-transparent p-5">
              <BudgetRow large budget={overall} onEdit={setModal} onDelete={setDeleting} />
              {allocated > 0 && (
                <p className={`mt-3 text-xs ${allocated > overall.limit ? 'font-semibold text-bad' : 'text-ink/70'}`}>
                  Category limits add up to {fmt(allocated)}{allocated > overall.limit ? `, which is ${fmt(allocated - overall.limit)} more than your overall budget.` : ` of your ${fmt(overall.limit)} overall budget.`}
                </p>
              )}
            </Card>
          ) : (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted">Set an overall monthly budget to cap your total spending.</p>
              <button className="btn-soft" onClick={() => setModal({})}>Set overall budget</button>
            </Card>
          )}

          {categories.length > 0 && (
            <div className="stagger grid gap-4 md:grid-cols-2">
              {categories.map((b) => (
                <Card key={b._id} className="card-hover p-5">
                  <BudgetRow large budget={b} onEdit={setModal} onDelete={setDeleting} />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <BudgetModal open={!!modal} onClose={() => setModal(null)} month={month} existing={modal?._id ? modal : null} taken={(data?.budgets || []).map((b) => b.category)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete budget?"
        message={deleting ? `The ${deleting.category === 'overall' ? 'overall' : deleting.category} budget for ${monthLongLabel(month)} will be removed. Your transactions are not affected.` : ''}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
        loading={busy}
      />
    </div>
  );
}