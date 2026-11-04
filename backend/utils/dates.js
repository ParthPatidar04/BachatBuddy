// All dates are handled in UTC. The client sends calendar dates (YYYY-MM-DD),
// which parse to UTC midnight, so "a day" is always one consistent bucket.
export const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export const startOfDayUTC = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);
export const isoDay = (d) => d.toISOString().slice(0, 10);

export const monthKey = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
export const monthStart = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
};
export const shiftMonth = (key, n) => {
  const d = monthStart(key);
  return monthKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
};
// `to` is exclusive
export const monthRange = (key) => ({ from: monthStart(key), to: monthStart(shiftMonth(key, 1)) });

export const monthsBetween = (from, toExclusive) => {
  const out = [];
  const last = monthKey(new Date(toExclusive.getTime() - 1));
  for (let k = monthKey(from); k <= last; k = shiftMonth(k, 1)) out.push(k);
  return out;
};

export const weekStart = (d) => {
  const x = startOfDayUTC(d);
  return addDays(x, -((x.getUTCDay() + 6) % 7)); // Monday
};
export const weeksBetween = (from, toExclusive) => {
  const out = [];
  for (let w = weekStart(from); w < toExclusive; w = addDays(w, 7)) out.push(isoDay(w));
  return out;
};

const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

// anchorDay keeps "31st of every month" stable after a short month clamps to the 28th/30th
export const addInterval = (date, frequency, anchorDay) => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addDays(date, 7);
    case 'monthly': {
      const ny = y + Math.floor((m + 1) / 12);
      const nm = (m + 1) % 12;
      return new Date(Date.UTC(ny, nm, Math.min(anchorDay, daysInMonth(ny, nm))));
    }
    case 'yearly':
      return new Date(Date.UTC(y + 1, m, Math.min(anchorDay, daysInMonth(y + 1, m))));
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
};