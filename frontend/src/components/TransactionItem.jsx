import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { categoryIcon } from '../utils/constants';
import { formatDate } from '../utils/format';
import { Badge } from './ui';

// Compact transaction row used on the dashboard
export default function TransactionItem({ tx, onEdit, onDelete }) {
  const { fmt } = useAuth();
  const Icon = categoryIcon(tx.category);
  const income = tx.type === 'income';
  return (
    <li className="group flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-surface2">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${income ? 'bg-good/15 text-good' : 'bg-primarySoft text-primary'}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{tx.title}</p>
        <p className="truncate text-xs text-muted">
          {tx.category} · {formatDate(tx.date)}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-extrabold tabular-nums ${income ? 'text-[#0a7a0a] dark:text-[#4ade4a]' : ''}`}>
          {income ? '+' : '-'}
          {fmt(tx.amount)}
        </p>
        <Badge tone={income ? 'good' : 'muted'}>{income ? 'Income' : 'Expense'}</Badge>
      </div>
      <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button className="icon-btn !h-8 !w-8" onClick={() => onEdit(tx)} aria-label={`Edit ${tx.title}`}>
          <Pencil size={15} />
        </button>
        <button className="icon-btn !h-8 !w-8 hover:!bg-bad/10 hover:!text-bad" onClick={() => onDelete(tx)} aria-label={`Delete ${tx.title}`}>
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}