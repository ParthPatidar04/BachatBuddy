import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChartColumn, Eye, EyeOff, Moon, PiggyBank, Sparkles, Sun } from 'lucide-react';
import { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Orb from '../components/Orb';
import { Field, Spinner } from '../components/ui';
import { CURRENCIES } from '../utils/constants';

const FEATURES = [
  { icon: ChartColumn, text: 'See exactly where your money goes' },
  { icon: PiggyBank, text: 'Budgets and savings goals that keep you on track' },
  { icon: Sparkles, text: 'An AI assistant that answers from your real data' },
];

export default function Auth({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'INR' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isLogin && form.name.trim().length < 2) return setError('Please enter your name');
    if (!form.email.trim()) return setError('Please enter your email');
    if (!isLogin && form.password.length < 8) return setError('Password must be at least 8 characters');
    if (isLogin && !form.password) return setError('Please enter your password');

    setBusy(true);
    try {
      if (isLogin) await login({ email: form.email, password: form.password });
      else await register({ name: form.name.trim(), email: form.email, password: form.password, currency: form.currency });
      navigate('/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hero-gradient relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <Orb size={36} />
          <span className="text-2xl font-extrabold tracking-tight">BachatBuddy</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
            Manage money, make smarter <span className="italic text-primary">decisions</span>
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 font-semibold">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface/70 text-primary shadow-card backdrop-blur">
                  <f.icon size={20} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <Orb size={340} float className="absolute -bottom-24 -right-20 opacity-70" />
        <p className="relative z-10 text-sm text-ink/70">Track your spending, grow your savings, stay in control.</p>
      </section>

      <section className="relative flex items-center justify-center px-5 py-10">
        <button className="icon-btn absolute right-4 top-4 border border-line bg-surface" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="w-full max-w-md animate-fadeUp">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Orb size={34} />
            <span className="text-xl font-extrabold">BachatBuddy</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-1.5 text-sm text-muted">{isLogin ? 'Log in to see your finances.' : 'Start tracking your money in under a minute.'}</p>

          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            {!isLogin && (
              <Field label="Full name">
                <input className="input" value={form.name} onChange={set('name')} autoComplete="name" placeholder="Your name" autoFocus />
              </Field>
            )}
            <Field label="Email">
              <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" autoFocus={isLogin} />
            </Field>
            <Field label="Password" hint={isLogin ? undefined : 'At least 8 characters'}>
              <div className="relative">
                <input
                  className="input pr-11" type={show ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="••••••••"
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {!isLogin && (
              <Field label="Currency">
                <select className="input" value={form.currency} onChange={set('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            )}
            {error && (
              <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad" role="alert">
                {error}
              </p>
            )}
            <button className="btn-primary w-full !py-3" disabled={busy}>
              {busy && <Spinner size={16} />}
              {isLogin ? 'Log in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link to={isLogin ? '/register' : '/login'} className="font-bold text-primary hover:underline">
              {isLogin ? 'Sign up' : 'Log in'}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}