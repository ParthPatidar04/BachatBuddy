import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight, CalendarClock, ChartColumn, FileText, LayoutDashboard, LogOut, Menu, Moon, PiggyBank,
  Plus, Repeat, Settings, Sparkles, Sun, Wallet, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { initials } from '../utils/format';
import Orb from './Orb';
import NotificationBell from './NotificationBell';
import TransactionFormModal from './TransactionFormModal';
import { FullPageLoader } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/goals', label: 'Savings Goals', icon: PiggyBank },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/bills', label: 'Bills', icon: CalendarClock },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const linkClass = ({ isActive }) =>
  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-primarySoft text-primary' : 'text-muted hover:bg-surface2 hover:text-ink'
  }`;

const Brand = () => (
  <div className="flex items-center gap-2.5 px-2 py-1">
    <Orb size={34} />
    <span className="text-xl font-extrabold tracking-tight">BachatBuddy</span>
  </div>
);

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="icon-btn border border-line bg-surface" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function NavList({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={linkClass} onClick={onNavigate}>
          <Icon size={19} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard() {
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface2 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white dark:text-[#120d2e]">
        {initials(user.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
        <LogOut size={18} />
      </button>
    </div>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-line bg-surface/80 p-4 backdrop-blur-xl lg:flex">
        <div className="space-y-6">
          <Brand />
          <NavList />
        </div>
        <UserCard />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 animate-slideIn flex-col justify-between overflow-y-auto bg-surface p-4 shadow-pop">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Brand />
                <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              <NavList onNavigate={() => setDrawer(false)} />
            </div>
            <UserCard />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line/70 bg-bg/70 px-4 py-3 backdrop-blur-xl sm:px-6">
        <button className="icon-btn border border-line bg-surface lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <div className="lg:hidden">
          <Brand />
        </div>
        <p className="ml-1 hidden text-sm text-muted lg:block">
          Hi <span className="font-bold text-ink">{user.name.split(' ')[0]}</span>, here's your money at a glance
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-primary hidden !py-2 sm:inline-flex" onClick={() => setAddOpen(true)}>
            <Plus size={18} /> Add transaction
          </button>
          <ThemeToggle />
          <NotificationBell />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
        <Suspense fallback={<FullPageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {/* mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden" aria-label="Quick navigation">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          {[NAV[0], NAV[1]].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-muted'}`}>
              <Icon size={21} />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => setAddOpen(true)}
            className="mx-auto -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition active:scale-95 dark:text-[#120d2e]"
            aria-label="Add transaction"
          >
            <Plus size={26} />
          </button>
          <NavLink to="/budgets" className={({ isActive }) => `flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-muted'}`}>
            <Wallet size={21} />
            Budgets
          </NavLink>
          <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold text-muted">
            <Menu size={21} />
            More
          </button>
        </div>
      </nav>

      <TransactionFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}