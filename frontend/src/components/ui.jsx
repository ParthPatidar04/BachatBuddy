import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, CircleAlert, Loader2, X } from 'lucide-react';

export const Card = ({ className = '', children, ...rest }) => (
  <div className={`card ${className}`} {...rest}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 className="text-base font-bold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Spinner = ({ size = 18, className = '' }) => <Loader2 size={size} className={`animate-spin ${className}`} />;
export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} />;

export const FullPageLoader = () => (
  <div className="flex min-h-screen items-center justify-center text-primary">
    <Spinner size={32} />
  </div>
);

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
    {Icon && (
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primarySoft text-primary">
        <Icon size={26} />
      </div>
    )}
    <p className="font-bold">{title}</p>
    {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="card flex flex-col items-center gap-3 px-4 py-10 text-center">
    <CircleAlert className="text-bad" size={28} />
    <p className="text-sm font-medium">{message}</p>
    {onRetry && (
      <button className="btn-soft" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

const BAR = { ok: 'bg-primary', warning: 'bg-warn', exceeded: 'bg-bad', done: 'bg-good' };
export const ProgressBar = ({ value, status = 'ok', height = 'h-2.5', label }) => (
  <div
    className={`w-full overflow-hidden rounded-full bg-line/70 ${height}`}
    role="progressbar"
    aria-valuenow={Math.round(Math.min(100, value))}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={label}
  >
    <div
      className={`h-full rounded-full transition-all duration-700 ease-out ${BAR[status]}`}
      style={{ width: `${Math.min(100, Math.max(value > 0 ? 2 : 0, value))}%` }}
    />
  </div>
);

const TONES = {
  good: 'bg-good/15 text-[#0a7a0a] dark:text-[#4ade4a]',
  warn: 'bg-warn/20 text-[#8a5d00] dark:text-warn',
  bad: 'bg-bad/10 text-bad dark:text-[#ff7b7b]',
  primary: 'bg-primarySoft text-primary',
  muted: 'bg-line/70 text-muted',
};
export const Badge = ({ tone = 'muted', icon: Icon, children }) => (
  <span className={`chip ${TONES[tone]}`}>
    {Icon && <Icon size={12} />}
    {children}
  </span>
);

export const Field = ({ label, error, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="label">{label}</span>
    {children}
    {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    {error && <span className="mt-1 block text-xs font-medium text-bad">{error}</span>}
  </label>
);

export const Segmented = ({ options, value, onChange, className = '' }) => (
  <div className={`inline-flex rounded-xl bg-line/60 p-1 ${className}`} role="tablist">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={value === o.value}
        onClick={() => onChange(o.value)}
        className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
          value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export function Modal({ open, onClose, title, children, footer, size = 'sm:max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full ${size} animate-pop flex-col rounded-t-3xl border border-line bg-surface shadow-pop sm:rounded-3xl`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="icon-btn -mr-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    size="sm:max-w-md"
    footer={
      <>
        <button className="btn-ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading && <Spinner size={16} />}
          {confirmLabel}
        </button>
      </>
    }
  >
    <p className="text-sm text-muted">{message}</p>
  </Modal>
);

export const Pagination = ({ page, pages, total, limit, onChange }) => {
  if (pages <= 1) return total ? <p className="text-xs text-muted">{total} result{total === 1 ? '' : 's'}</p> : null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted">
        Showing {from}-{to} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button className="icon-btn border border-line" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[4.5rem] text-center text-sm font-semibold">
          {page} / {pages}
        </span>
        <button className="icon-btn border border-line" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};