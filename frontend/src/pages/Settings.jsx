import { useState } from 'react';
import { KeyRound, LogOut, Moon, Plus, Sun, User, Wallet, X } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, Field, PageHeader, Segmented, Spinner } from '../components/ui';
import { CURRENCIES } from '../utils/constants';

function ProfileCard() {
  const { user, setUser } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [currency, setCurrency] = useState(user.currency);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== user.name || currency !== user.currency;

  const save = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('Name must be at least 2 characters');
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name: name.trim(), currency });
      setUser(res.data.user);
      bump();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <CardHeader title="Profile" subtitle="Your name and display currency" />
      <form onSubmit={save} className="space-y-4" noValidate>
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
        <Field label="Email"><input className="input opacity-70" value={user.email} disabled /></Field>
        <Field label="Currency" hint="Only changes how amounts are shown. Existing values are not converted.">
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <button className="btn-primary" disabled={!dirty || saving}>{saving && <Spinner size={16} />} Save changes</button>
      </form>
    </Card>
  );
}

function AccountsCard() {
  const { user, setUser } = useAuth();
  const { bump } = useData();
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (accounts, okMsg) => {
    setBusy(true);
    try {
      const res = await api.put('/auth/profile', { accounts });
      setUser(res.data.user);
      bump();
      toast.success(okMsg);
      return true;
    } catch (err) {
      toast.error(errMsg(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) return;
    if (user.accounts.some((a) => a.toLowerCase() === v.toLowerCase())) return toast.error('That account already exists');
    if (await save([...user.accounts, v], 'Account added')) setName('');
  };

  return (
    <Card className="p-5">
      <CardHeader title="Accounts" subtitle="Used when you add transactions. Removing one keeps old transactions as they are." />
      <ul className="mb-4 flex flex-wrap gap-2">
        {user.accounts.map((a) => (
          <li key={a} className="chip !px-3 !py-1.5 border border-line bg-surface2 text-sm">
            <Wallet size={13} className="text-primary" /> {a}
            <button className="ml-1 text-muted hover:text-bad disabled:opacity-40" disabled={busy || user.accounts.length <= 1} onClick={() => save(user.accounts.filter((x) => x !== a), 'Account removed')} aria-label={`Remove ${a}`}>
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="New account, e.g. Savings Bank" aria-label="New account name" />
        <button className="btn-soft shrink-0" disabled={busy || !name.trim()}><Plus size={16} /> Add</button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (f.newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (f.newPassword !== f.confirm) return toast.error('New passwords do not match');
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
      toast.success('Password updated');
      setF({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <CardHeader title="Change password" />
      <form onSubmit={save} className="space-y-4" noValidate>
        <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="New password"><input className="input" type="password" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} /></Field>
          <Field label="Confirm new password"><input className="input" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} /></Field>
        </div>
        <button className="btn-primary" disabled={saving || !f.currentPassword || !f.newPassword}>{saving ? <Spinner size={16} /> : <KeyRound size={16} />} Update password</button>
      </form>
    </Card>
  );
}

export default function Settings() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" subtitle="Manage your profile, appearance and security" />
      <ProfileCard />
      <Card className="p-5">
        <CardHeader title="Appearance" subtitle="Your choice is remembered on this device" />
        <Segmented value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">{theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />} Currently using {theme} mode</p>
      </Card>
      <AccountsCard />
      <PasswordCard />
      <Card className="flex items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3"><User size={20} className="text-primary" /><p className="text-sm font-semibold">Sign out of this device</p></div>
        <button className="btn-ghost" onClick={logout}><LogOut size={16} /> Log out</button>
      </Card>
    </div>
  );
}