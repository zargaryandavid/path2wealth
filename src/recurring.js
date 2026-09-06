// Date-only helpers for one-time entries and monthly repeating series.
// All calendar / payment dates are local YYYY-MM-DD strings (never UTC timestamps).

export function todayKey(d = new Date()) {
  return toKey(d);
}

export function toKey(d) {
  const dt = d instanceof Date ? d : parseKey(d);
  if (!dt) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseKey(key) {
  if (!key) return null;
  if (key instanceof Date) {
    if (Number.isNaN(key.getTime())) return null;
    return new Date(key.getFullYear(), key.getMonth(), key.getDate());
  }
  const s = String(key);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(key, delta) {
  const d = parseKey(key) || new Date();
  d.setDate(d.getDate() + delta);
  return toKey(d);
}

export function formatKey(key) {
  const d = parseKey(key);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function dateInMonth(year, monthIndex, day) {
  const last = daysInMonth(year, monthIndex);
  return toKey(new Date(year, monthIndex, Math.min(Math.max(1, day), last)));
}

/** First payment on or after `from` for a given day-of-month. */
export function firstPaymentOn(repeatDay, from = new Date()) {
  const start = parseKey(from) || new Date();
  const day = Math.min(Math.max(1, Number(repeatDay) || 1), 31);
  const thisMonth = dateInMonth(start.getFullYear(), start.getMonth(), day);
  if (thisMonth >= toKey(start)) return thisMonth;
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return dateInMonth(next.getFullYear(), next.getMonth(), day);
}

export function expandSeries(t) {
  const months = Math.min(36, Math.max(1, Number(t.repeatMonths) || 12));
  const day = Math.min(Math.max(1, Number(t.repeatDay) || 1), 31);
  const startKey = t.occurredOn || t.date || firstPaymentOn(day);
  const start = parseKey(startKey);
  if (!start) return [];
  let offset = 0;
  if (dateInMonth(start.getFullYear(), start.getMonth(), day) < toKey(start)) offset = 1;
  const dates = [];
  for (let i = 0; i < months; i += 1) {
    dates.push(dateInMonth(start.getFullYear(), start.getMonth() + offset + i, day));
  }
  return dates;
}

function asOccurrence(t, occurredOn) {
  return {
    ...t,
    seriesId: t.id,
    id: `${t.id}@${occurredOn}`,
    occurredOn,
    date: occurredOn,
  };
}

export function postedOccurrences(transactions, today = todayKey()) {
  const out = [];
  for (const t of transactions) {
    if (t.recurring) {
      for (const d of expandSeries(t)) {
        if (d <= today) out.push(asOccurrence(t, d));
      }
    } else {
      const d = t.occurredOn || toKey(t.date) || today;
      if (d <= today) out.push({ ...t, occurredOn: d, date: d });
    }
  }
  out.sort((a, b) => String(b.occurredOn).localeCompare(String(a.occurredOn)));
  return out;
}

export function calendarItems(transactions) {
  const out = [];
  for (const t of transactions) {
    if (t.recurring) {
      for (const d of expandSeries(t)) out.push(asOccurrence(t, d));
    } else {
      const d = t.occurredOn || toKey(t.date);
      if (d) out.push({ ...t, occurredOn: d, date: d });
    }
  }
  return out;
}

export function seriesIdOf(t) {
  return t.seriesId || t.id;
}
