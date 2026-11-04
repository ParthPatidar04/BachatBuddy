// Money is stored as Number rounded to 2 decimals; every aggregate result is
// re-rounded with round2() so floating point noise never reaches the client.
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const pct = (part, whole) => (whole > 0 ? round2((part / whole) * 100) : 0);

// null means "no previous value to compare against"
export const changePct = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : null;
  return round2(((current - previous) / previous) * 100);
};

export const formatMoney = (amount, currency = 'INR') =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount);

// For PDFs: the built-in PDF fonts have no glyph for symbols like the rupee sign
export const formatPlain = (amount, currency = 'INR') =>
  `${currency} ${Number(amount).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;