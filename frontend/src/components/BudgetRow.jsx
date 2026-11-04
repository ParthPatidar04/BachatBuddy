import { CircleAlert, CircleCheck, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { categoryIcon } from '../utils/constants';
import { Badge, ProgressBar } from './ui';

export const STATUS = {
  ok: { tone: 'good', label: 'On track', icon: CircleCheck },
  warning: { tone: 'warn', label: 'Near limit', icon: TriangleAlert },
  exceeded: { tone: 'bad', label: 'Over budget', icon: CircleAlert },
};

// One budget: spent vs limit, remaining, % used. Status is always icon + label, never color alone.
export default function BudgetRow({ budget, onEdit, onDelete, large = false }) {
  const { fmt } = useAuth();
  const s = STATUS[budget.status];
  const Icon = categoryIcon(budget.category);
  const name = budget.category === 'overall' ? 'Overall monthly budget' : budget.category;
  return (
    <div className={large ? '' : 'rounded-2xl p-1'}>
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primarySoft text-primary">
          <Icon size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="text-xs text-muted">
            {fmt(budget.spent)} of {fmt(budget.limit)}
          </p>
        </div>
        <Badge tone={s.tone} icon={s.icon}>
          {s.label}
        </Badge>
        {(onEdit || onDelete) && (
          <div className="flex gap-0.5">
            {onEdit && (
              <button className="icon-btn !h-8 !w-8" onClick={() => onEdit(budget)} aria-label={`Edit ${name}`}>
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button className="icon-btn !h-8 !w-8 hover:!bg-bad/10 hover:!text-bad" onClick={() => onDelete(budget)} aria-label={`Delete ${name}`}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>
      <ProgressBar value={budget.percent} status={budget.status} label={`${name} used`} />
      <div className="mt-1.5 flex justify-between text-xs">
        <span className="font-semibold tabular-nums">{Math.round(budget.percent)}% used</span>
        <span className={`tabular-nums ${budget.remaining < 0 ? 'font-semibold text-bad' : 'text-muted'}`}>
          {budget.remaining < 0 ? `${fmt(-budget.remaining)} over` : `${fmt(budget.remaining)} left`}
        </span>
      </div>
    </div>
  );
}