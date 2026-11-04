import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarClock, CircleAlert, PiggyBank, Repeat, TriangleAlert, X } from 'lucide-react';
import api, { errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { EmptyState } from './ui';

const TYPE_STYLE = {
  budget_exceeded: { icon: CircleAlert, color: 'text-bad bg-bad/10' },
  budget_warning: { icon: TriangleAlert, color: 'text-[#b27a00] bg-warn/20 dark:text-warn' },
  bill_due: { icon: CalendarClock, color: 'text-primary bg-primarySoft' },
  bill_overdue: { icon: CircleAlert, color: 'text-bad bg-bad/10' },
  recurring: { icon: Repeat, color: 'text-primary bg-primarySoft' },
  goal_milestone: { icon: PiggyBank, color: 'text-good bg-good/15' },
};

const timeAgo = (iso) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso)) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const toast = useToast();
  const { data, reload } = useFetch(() => api.get('/notifications').then((r) => r.data), []);
  const unread = data?.unreadCount || 0;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = async (fn) => {
    try {
      await fn();
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button className="icon-btn relative border border-line bg-surface" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 animate-pop overflow-hidden rounded-3xl border border-line bg-surface shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[24rem]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="font-bold">Notifications</h3>
            <div className="flex gap-3 text-xs font-semibold text-primary">
              <button disabled={!unread} className="disabled:opacity-40" onClick={() => run(() => api.post('/notifications/read-all'))}>
                Mark all read
              </button>
              <button disabled={!data?.notifications?.length} className="disabled:opacity-40" onClick={() => run(() => api.delete('/notifications'))}>
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            {!data?.notifications?.length ? (
              <EmptyState icon={Bell} title="You're all caught up" text="Budget alerts, bill reminders and goal milestones will show up here." />
            ) : (
              data.notifications.map((n) => {
                const s = TYPE_STYLE[n.type] || TYPE_STYLE.recurring;
                return (
                  <div
                    key={n._id}
                    className={`group flex gap-3 border-b border-line/70 px-4 py-3 last:border-0 ${n.read ? '' : 'bg-primarySoft/40'}`}
                    onClick={() => !n.read && run(() => api.patch(`/notifications/${n._id}/read`))}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
                      <s.icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                      <p className="mt-1 text-[11px] text-muted/80">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      className="icon-btn !h-7 !w-7 shrink-0"
                      aria-label="Remove notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        run(() => api.delete(`/notifications/${n._id}`));
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}