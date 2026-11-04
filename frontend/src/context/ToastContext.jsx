import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, color: 'text-good' },
  error: { icon: CircleAlert, color: 'text-bad' },
  info: { icon: Info, color: 'text-primary' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);

  const dismiss = useCallback((tid) => setToasts((t) => t.filter((x) => x.id !== tid)), []);
  const push = useCallback(
    (type, message) => {
      const tid = ++id.current;
      setToasts((t) => [...t.slice(-3), { id: tid, type, message }]);
      setTimeout(() => dismiss(tid), 4200);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const { icon: Icon, color } = STYLES[t.type];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-sm animate-slideIn items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-pop"
            >
              <Icon size={20} className={`mt-0.5 shrink-0 ${color}`} />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);