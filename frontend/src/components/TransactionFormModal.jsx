import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants';
import { todayInput, toInputDate } from '../utils/format';
import { Field, Modal, Segmented, Spinner } from './ui';

const blank = (accounts) => ({
  type: 'expense',
  title: '',
  amount: '',
  category: EXPENSE_CATEGORIES[0],
  date: todayInput(),
  account: accounts[0] || 'Cash',
  description: '',
});

// Add or edit (when `transaction` is given) an income / expense
export default function TransactionFormModal({ open, onClose, transaction }) {
  const { user } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const editing = !!transaction;
  const [form, setForm] = useState(blank(user.accounts));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      transaction
        ? {
            type: transaction.type,
            title: transaction.title,
            amount: String(transaction.amount),
            category: transaction.category,
            date: toInputDate(transaction.date),
            account: transaction.account,
            description: transaction.description || '',
          }
        : blank(user.accounts)
    );
  }, [open, transaction, user.accounts]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const categoryOptions = categories.includes(form.category) ? categories : [form.category, ...categories]; // keep a custom category when editing
  const accountOptions = user.accounts.includes(form.account) ? user.accounts : [form.account, ...user.accounts];

  const changeType = (type) =>
    setForm((f) => ({ ...f, type, category: (type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(f.category) ? f.category : (type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0] }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const amount = Number(form.amount);
    if (!form.title.trim()) return setError('Please enter a title');
    if (!(amount > 0)) return setError('Amount must be greater than 0');
    if (!form.date) return setError('Please pick a date');

    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), amount, description: form.description.trim() };
      if (editing) await api.put(`/transactions/${transaction._id}`, payload);
      else await api.post('/transactions', payload);
      toast.success(editing ? 'Transaction updated' : 'Transaction added');
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
      title={editing ? 'Edit transaction' : 'Add transaction'}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="tx-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner size={16} />}
            {editing ? 'Save changes' : 'Add transaction'}
          </button>
        </>
      }
    >
      <form id="tx-form" onSubmit={submit} className="space-y-4" noValidate>
        <Segmented
          className="w-full [&>button]:flex-1"
          value={form.type}
          onChange={changeType}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />
        <Field label="Title">
          <input className="input" value={form.title} onChange={set('title')} maxLength={100} placeholder="e.g. Grocery shopping" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${user.currency})`}>
            <input className="input" type="number" inputMode="decimal" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={form.date} onChange={set('date')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className="input" value={form.category} onChange={set('category')}>
              {categoryOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Account">
            <select className="input" value={form.account} onChange={set('account')}>
              {accountOptions.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea className="input min-h-[72px] resize-y" value={form.description} onChange={set('description')} maxLength={500} placeholder="Add a short note" />
        </Field>
        {error && (
          <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}