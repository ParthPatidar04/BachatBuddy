import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Pencil, Plus, Receipt, Search, Trash2, X } from 'lucide-react';
import api, { downloadFile, errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, Spinner } from '../components/ui';
import TransactionFormModal from '../components/TransactionFormModal';
import { ALL_CATEGORIES, categoryIcon } from '../utils/constants';
import { formatDate } from '../utils/format';

const LIMIT = 10;
const INITIAL = { search: '', type: '', category: '', account: '', from: '', to: '', sortBy: 'date', order: 'desc', page: 1 };

export default function Transactions() {
  const { user, fmt } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const [f, setF] = useState(INITIAL);
  const search = useDebounce(f.search);
  const [editing, setEditing] = useState(null); // {} = new
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  // any filter change returns to page 1
  const update = (patch) => setF((s) => ({ ...s, ...patch, page: 'page' in patch ? patch.page : 1 }));
  useEffect(() => {
    setF((s) => (s.page === 1 ? s : { ...s, page: 1 }));
  }, [search]);

  const params = { page: f.page, limit: LIMIT, sortBy: f.sortBy, order: f.order };
  if (search) params.search = search;
  ['type', 'category', 'account', 'from', 'to'].forEach((k) => f[k] && (params[k] = f[k]));

  const { data, loading, error, reload } = useFetch(
    () => api.get('/transactions', { params }).then((r) => r.data),
    [JSON.stringify(params)]
  );

  const hasFilters = ['search', 'type', 'category', 'account', 'from', 'to'].some((k) => f[k]);
  const toggleSort = (key) => update(f.sortBy === key ? { order: f.order === 'asc' ? 'desc' : 'asc' } : { sortBy: key, order: 'desc' });
  const SortIcon = ({ k }) => (f.sortBy === k ? (f.order === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : null);

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

  const exportCsv = async () => {
    setExporting(true);
    try {
      const p = {};
      ['type', 'category', 'from', 'to'].forEach((k) => f[k] && (p[k] = f[k]));
      await downloadFile('/reports/export/csv', p, 'transactions.csv');
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(errMsg(err, 'Could not export CSV'));
    } finally {
      setExporting(false);
    }
  };

  const categoryOptions = Array.from(new Set([...ALL_CATEGORIES, ...(data?.transactions || []).map((t) => t.category)]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        subtitle="Search, filter and manage every income and expense"
        actions={
          <>
            <button className="btn-ghost" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Spinner size={16} /> : <Download size={16} />} Export CSV
            </button>
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus size={16} /> Add
            </button>
          </>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-10" placeholder="Search name or notes" value={f.search} onChange={(e) => setF((s) => ({ ...s, search: e.target.value }))} aria-label="Search transactions" />
          </div>
          <select className="input" value={f.type} onChange={(e) => update({ type: e.target.value })} aria-label="Type">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select className="input" value={f.category} onChange={(e) => update({ category: e.target.value })} aria-label="Category">
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input className="input" type="date" value={f.from} max={f.to || undefined} onChange={(e) => update({ from: e.target.value })} aria-label="From date" />
          <input className="input" type="date" value={f.to} min={f.from || undefined} onChange={(e) => update({ to: e.target.value })} aria-label="To date" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <select className="input !w-auto" value={f.account} onChange={(e) => update({ account: e.target.value })} aria-label="Account">
            <option value="">All accounts</option>
            {user.accounts.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          {hasFilters && (
            <button className="btn-soft !py-2" onClick={() => setF(INITIAL)}>
              <X size={15} /> Clear filters
            </button>
          )}
        </div>
      </Card>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Income', fmt(data.totals.income)],
            ['Expenses', fmt(data.totals.expense)],
            ['Net', fmt(data.totals.net)],
          ].map(([label, value]) => (
            <Card key={label} className="px-4 py-3">
              <p className="text-xs font-semibold text-muted">{label}{hasFilters ? ' (filtered)' : ''}</p>
              <p className="truncate text-base font-extrabold tabular-nums sm:text-lg">{value}</p>
            </Card>
          ))}
        </div>
      )}

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Card className="overflow-hidden">
          {loading && !data ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : !data.transactions.length ? (
            <EmptyState
              icon={Receipt}
              title={hasFilters ? 'No transactions match your filters' : 'No transactions yet'}
              text={hasFilters ? 'Try a different search or clear the filters.' : 'Add your first income or expense to get started.'}
              action={hasFilters ? <button className="btn-soft" onClick={() => setF(INITIAL)}>Clear filters</button> : <button className="btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add transaction</button>}
            />
          ) : (
            <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
              {/* table on larger screens */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="px-5 py-3 font-semibold">
                        <button className="inline-flex items-center gap-1 font-semibold hover:text-ink" onClick={() => toggleSort('date')}>Date <SortIcon k="date" /></button>
                      </th>
                      <th className="px-3 py-3 font-semibold">Transaction</th>
                      <th className="px-3 py-3 font-semibold">Category</th>
                      <th className="px-3 py-3 font-semibold">Account</th>
                      <th className="px-3 py-3 text-right font-semibold">
                        <button className="inline-flex items-center gap-1 font-semibold hover:text-ink" onClick={() => toggleSort('amount')}>Amount <SortIcon k="amount" /></button>
                      </th>
                      <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t) => {
                      const Icon = categoryIcon(t.category);
                      const income = t.type === 'income';
                      return (
                        <tr key={t._id} className="group border-b border-line/60 last:border-0 hover:bg-surface2/70">
                          <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(t.date)}</td>
                          <td className="max-w-[18rem] px-3 py-3">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${income ? 'bg-good/15 text-good' : 'bg-primarySoft text-primary'}`}><Icon size={17} /></span>
                              <div className="min-w-0">
                                <p className="truncate font-bold">{t.title}</p>
                                {t.description && <p className="truncate text-xs text-muted">{t.description}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3"><Badge tone={income ? 'good' : 'primary'}>{t.category}</Badge></td>
                          <td className="px-3 py-3 text-muted">{t.account}</td>
                          <td className={`whitespace-nowrap px-3 py-3 text-right font-extrabold tabular-nums ${income ? 'text-[#0a7a0a] dark:text-[#4ade4a]' : ''}`}>
                            {income ? '+' : '-'}{fmt(t.amount)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-0.5 opacity-60 transition group-hover:opacity-100 group-focus-within:opacity-100">
                              <button className="icon-btn !h-8 !w-8" onClick={() => setEditing(t)} aria-label={`Edit ${t.title}`}><Pencil size={15} /></button>
                              <button className="icon-btn !h-8 !w-8 hover:!bg-bad/10 hover:!text-bad" onClick={() => setDeleting(t)} aria-label={`Delete ${t.title}`}><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* cards on mobile */}
              <ul className="divide-y divide-line/60 md:hidden">
                {data.transactions.map((t) => {
                  const Icon = categoryIcon(t.category);
                  const income = t.type === 'income';
                  return (
                    <li key={t._id} className="flex items-center gap-3 p-4">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${income ? 'bg-good/15 text-good' : 'bg-primarySoft text-primary'}`}><Icon size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{t.title}</p>
                        <p className="truncate text-xs text-muted">{t.category} · {formatDate(t.date)}</p>
                        <p className="truncate text-xs text-muted">{t.account}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-extrabold tabular-nums ${income ? 'text-[#0a7a0a] dark:text-[#4ade4a]' : ''}`}>{income ? '+' : '-'}{fmt(t.amount)}</p>
                        <div className="mt-1 flex justify-end gap-0.5">
                          <button className="icon-btn !h-8 !w-8" onClick={() => setEditing(t)} aria-label={`Edit ${t.title}`}><Pencil size={15} /></button>
                          <button className="icon-btn !h-8 !w-8 hover:!bg-bad/10 hover:!text-bad" onClick={() => setDeleting(t)} aria-label={`Delete ${t.title}`}><Trash2 size={15} /></button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-line px-5 py-3.5">
                <Pagination {...data.pagination} onChange={(page) => update({ page })} />
              </div>
            </div>
          )}
        </Card>
      )}

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