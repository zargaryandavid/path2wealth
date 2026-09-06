// theme.js
// Every color and category the app uses lives here in ONE place.
// Want to change the look or add a category? This is the only file you touch.

export const COLORS = {
  background: '#F4F6FA',
  card: '#FFFFFF',
  header: '#0EA47A',      // the wealth-green top bar
  text: '#1C2430',
  textMuted: '#8A94A6',
  income: '#0EA47A',      // green = money in
  expense: '#E5484D',     // red   = money out
  border: '#ECEFF4',
};

// Categories your EXPENSES can fall into (shown in the donut chart).
// Each one has an emoji icon and its own color slice.
export const EXPENSE_CATEGORIES = [
  { key: 'food',       label: 'Food',       icon: 'food',            color: '#F5A623' },
  { key: 'transport',  label: 'Transport',  icon: 'car',             color: '#4C8DFF' },
  { key: 'shopping',   label: 'Shopping',   icon: 'shopping',        color: '#B15CFF' },
  { key: 'bills',      label: 'Bills',      icon: 'receipt',         color: '#FF6B6B' },
  { key: 'fun',        label: 'Fun',        icon: 'party-popper',    color: '#FF7AC6' },
  { key: 'health',     label: 'Health',     icon: 'pill',            color: '#2CC9B5' },
  { key: 'home',       label: 'Home',       icon: 'home-variant',    color: '#7C8CA3' },
  { key: 'rent',       label: 'Rent',       icon: 'key-variant',     color: '#5B6CFF' },
  { key: 'lease',      label: 'Lease',      icon: 'file-sign',       color: '#16A085' },
  { key: 'finance',    label: 'Finance',    icon: 'bank',            color: '#C0392B' },
  { key: 'insurance',  label: 'Insurance',  icon: 'shield-check',    color: '#3FB984' },
  { key: 'investment', label: 'Investment', icon: 'star',            color: '#4C8DFF' },
  { key: 'other',      label: 'Other',      icon: 'dots-horizontal', color: '#A0AAB8' },
];

// Categories your INCOME can come from.
export const INCOME_CATEGORIES = [
  { key: 'salary',    label: 'Salary',      icon: 'briefcase',       color: '#0EA47A' },
  { key: 'rent',      label: 'Rent',        icon: 'office-building',  color: '#3FB984' },
  { key: 'dividends', label: 'Dividends',   icon: 'chart-line',      color: '#2CC9B5' },
  { key: 'cd',        label: 'CD Interest', icon: 'percent',         color: '#4C8DFF' },
  { key: 'hysa',      label: 'HYSA',        icon: 'piggy-bank',      color: '#F5A623' },
  { key: 'bond',      label: 'Bond',        icon: 'note-text',       color: '#2CC9B5' },
  { key: 'bonus',     label: 'Bonus',       icon: 'gift',            color: '#B15CFF' },
  { key: 'freelance', label: 'Freelance',   icon: 'laptop',          color: '#FF7AC6' },
  { key: 'other',     label: 'Other',       icon: 'plus',            color: '#8FD0B0' },
];

// Given a transaction's type + category key, return its icon/label/color.
export function categoryInfo(type, key) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.key === key) || list[list.length - 1];
}

const CURRENCY_SYM = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'CHF ', CAD: 'C$', AUD: 'A$', AMD: '֏' };

export function currencySymbol(code) {
  return CURRENCY_SYM[code] || '$';
}

// Turns a number like 1234.5 into a tidy "$1,234.50" (or ֏ / € when currency is set).
export function formatMoney(amount, currency = 'USD') {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sym = currency && currency !== 'USD' ? currencySymbol(currency) : '$';
  return sign + sym + withCommas + '.' + decPart;
}

// Approximate AMD per 1 USD so dram-priced holdings don't get treated as dollars.
export const AMD_PER_USD = 387;

export function amountUsd(amount, currency) {
  const n = Number(amount) || 0;
  return currency === 'AMD' ? n / AMD_PER_USD : n;
}

export function holdingValueUsd(h) {
  const raw = (Number(h && h.qty) || 0) * (Number(h && h.price) || 0);
  return amountUsd(raw, h && h.currency);
}

// Groups a raw number string with commas: "150000" -> "150,000". Keeps up to 2 decimals.
export function groupDigits(v) {
  v = String(v).replace(/[^0-9.]/g, '');
  const p = v.split('.');
  p[0] = (p[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return p.length > 1 ? p[0] + '.' + p[1].slice(0, 2) : p[0];
}


// 1 -> '1st', 2 -> '2nd', 4 -> '4th', 21 -> '21st', etc.
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
