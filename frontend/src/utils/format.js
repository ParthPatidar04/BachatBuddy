// Dates from the API are UTC midnight, so they are always displayed in UTC
// (otherwise a user west of UTC would see the previous day).
export const makeMoneyFormatter = (currency = 'INR') => {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const full = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const compact = new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 });
  const fmt = (n) => full.format(Number(n) || 0);
  fmt.compact = (n) => compact.format(Number(n) || 0);
  fmt.symbol = full.formatToParts(0).find((p) => p.type === 'currency')?.value || currency;
  return fmt;
};

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const monthLongFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatDate = (d) => (d ? dateFmt.format(new Date(d)) : '-');
export const formatShortDate = (d) => (d ? shortFmt.format(new Date(d)) : '-');

// "2026-11" -> "Nov" (or "Nov 26" when the range crosses years)
export const monthLabel = (key, withYear = false) => {
  const d = new Date(`${key}-01T00:00:00Z`);
  return withYear ? `${monthFmt.format(d)} ${String(d.getUTCFullYear()).slice(2)}` : monthFmt.format(d);
};
export const monthLongLabel = (key) => monthLongFmt.format(new Date(`${key}-01T00:00:00Z`));

const pad = (n) => String(n).padStart(2, '0');
// value for <input type="date"> from the user's LOCAL today
export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const currentMonthKey = () => todayInput().slice(0, 7);
export const shiftMonthKey = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};
export const addDaysInput = (input, n) => {
  const d = new Date(`${input}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const pctText = (v) => (v === null || v === undefined ? 'new' : `${v > 0 ? '+' : ''}${v}%`);
export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || '?';

export const relativeDays = (n) =>
  n < 0 ? `${Math.abs(n)} day${n === -1 ? '' : 's'} overdue` : n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : `In ${n} days`;