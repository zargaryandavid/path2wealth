// db.js — reads/writes your data to Supabase. Every function is safe to call:
// if anything fails, the caller keeps working with in-memory data.
import { supabase } from './supabase';

// bond coupons are derived from your portfolio, so we never store them.
const paymentDate = (t) => t.occurredOn || (t.date && String(t.date).slice(0, 10)) || null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toDbTx = (uid, t) => {
  const id = String(t.id || '').split('@')[0];
  const row = {
    user_id: uid, type: t.type, amount: t.amount, category: t.category,
    note: t.note || null, recurring: !!t.recurring,
    repeat_day: t.repeatDay ?? null, repeat_months: t.repeatMonths ?? null,
    occurred_on: paymentDate(t),
    property_value: t.propertyValue != null ? t.propertyValue : null,
  };
  if (UUID.test(id)) row.id = id;
  return row;
};
const fromDbTx = (r) => {
  const occurredOn = r.occurred_on || (r.created_at && String(r.created_at).slice(0, 10)) || null;
  return {
    id: r.id, type: r.type, amount: Number(r.amount), category: r.category,
    note: r.note || '', recurring: !!r.recurring, repeatDay: r.repeat_day,
    repeatMonths: r.repeat_months, occurredOn, date: occurredOn,
    propertyValue: r.property_value != null ? Number(r.property_value) : undefined,
  };
};

function newId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const idOrNew = (id) => (UUID.test(String(id || '')) ? String(id) : newId());

const toDbSaving = (uid, a) => ({
  id: idOrNew(a.id), user_id: uid, name: a.name || 'Account',
  balance: Number(a.balance) || 0, kind: a.kind || 'savings',
  contributions: a.contributions != null ? Number(a.contributions) : null,
});
const fromDbSaving = (r) => ({
  id: r.id, name: r.name, balance: Number(r.balance) || 0,
  kind: r.kind || 'savings',
  contributions: r.contributions != null ? Number(r.contributions) : undefined,
});

const toDbHolding = (uid, h) => ({
  id: idOrNew(h.id), user_id: uid, kind: h.kind || 'Stock', name: h.name || 'Holding',
  qty: Number(h.qty) || 0, price: Number(h.price) || 0,
  yield: h.yield != null ? Number(h.yield) : null,
  cycle: h.cycle || null, currency: h.currency || 'USD',
  coupon_start: h.couponStart || null,
});
const fromDbHolding = (r) => ({
  id: r.id, kind: r.kind, name: r.name,
  qty: Number(r.qty) || 0, price: Number(r.price) || 0,
  yield: r.yield != null ? Number(r.yield) : undefined,
  cycle: r.cycle || undefined, currency: r.currency || 'USD',
  couponStart: r.coupon_start || undefined,
});

async function replaceUserRows(table, uid, rows, stripExtra) {
  const existing = await supabase.from(table).select('id').eq('user_id', uid);
  if (existing.error) return { error: existing.error, items: null };
  const keep = new Set(rows.map((r) => r.id));
  const stale = (existing.data || []).map((r) => r.id).filter((id) => !keep.has(id));
  if (stale.length) {
    const { error } = await supabase.from(table).delete().in('id', stale);
    if (error) return { error, items: null };
  }
  if (!rows.length) return { error: null, items: [] };
  let { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error && stripExtra) {
    ({ error } = await supabase.from(table).upsert(rows.map(stripExtra), { onConflict: 'id' }));
  }
  return { error, items: error ? null : rows };
}

export async function loadAll(uid) {
  const prof = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  const txs = await supabase.from('transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false });
  const sav = await supabase.from('savings_accounts').select('*').eq('user_id', uid).order('created_at', { ascending: true });
  const hold = await supabase.from('portfolio_holdings').select('*').eq('user_id', uid).order('created_at', { ascending: true });
  const p = prof.data;
  return {
    profile: p ? { age: p.age, gender: p.gender, income: p.income != null ? String(p.income) : '',
      location: p.location, specialty: p.specialty, goal: p.goal,
      maritalStatus: p.marital_status || '',
      kidsQty: p.kids_qty != null ? Number(p.kids_qty) : 0,
      kidsAges: Array.isArray(p.kids_ages) ? p.kids_ages.map(String) : [],
    } : null,
    alloc: p && p.alloc && typeof p.alloc === 'object' ? p.alloc : null,
    transactions: (txs.data || []).map(fromDbTx),
    savingsAccounts: (sav.data || []).map(fromDbSaving),
    portfolio: (hold.data || []).map(fromDbHolding),
  };
}

export async function saveProfile(uid, p, alloc) {
  const income = parseFloat(String(p.income || '').replace(/[^0-9.]/g, ''));
  const row = {
    id: uid, age: p.age || null, gender: p.gender || null,
    income: isNaN(income) ? null : income, location: p.location || null,
    specialty: p.specialty || null, goal: p.goal || null,
    marital_status: p.maritalStatus || null,
    kids_qty: p.kidsQty != null ? Number(p.kidsQty) || 0 : null,
    kids_ages: Array.isArray(p.kidsAges) ? p.kidsAges : [],
    updated_at: new Date().toISOString(),
  };
  if (alloc) row.alloc = alloc;
  let res = await supabase.from('profiles').upsert(row);
  if (res.error && /alloc|marital_status|kids_qty|kids_ages/.test(String(res.error.message || ''))) {
    const { alloc: _a, marital_status: _m, kids_qty: _k, kids_ages: _ages, ...without } = row;
    res = await supabase.from('profiles').upsert(without);
  }
  return res;
}

export async function syncSavings(uid, accounts) {
  const rows = (accounts || []).map((a) => toDbSaving(uid, a));
  const res = await replaceUserRows('savings_accounts', uid, rows, ({ kind, contributions, ...r }) => r);
  return {
    error: res.error,
    rewritten: !res.error && rows.some((r, i) => r.id !== String(accounts[i] && accounts[i].id)),
    items: res.error ? null : rows.map(fromDbSaving),
  };
}

export async function syncPortfolio(uid, holdings) {
  const rows = (holdings || []).map((h) => toDbHolding(uid, h));
  const res = await replaceUserRows('portfolio_holdings', uid, rows, ({ coupon_start, ...r }) => r);
  return {
    error: res.error,
    rewritten: !res.error && rows.some((r, i) => r.id !== String(holdings[i] && holdings[i].id)),
    items: res.error ? null : rows.map(fromDbHolding),
  };
}

async function writeRows(tableRows) {
  const withId = tableRows.filter((r) => r.id);
  const withoutId = tableRows.filter((r) => !r.id);
  let error = null;
  if (withId.length) {
    ({ error } = await supabase.from('transactions').upsert(withId, { onConflict: 'id' }));
    if (error && /occurred_on|property_value/.test(String(error.message || ''))) {
      ({ error } = await supabase.from('transactions').upsert(withId.map(({ occurred_on, property_value, ...r }) => r), { onConflict: 'id' }));
    }
  }
  if (!error && withoutId.length) {
    ({ error } = await supabase.from('transactions').insert(withoutId));
    if (error && /occurred_on|property_value/.test(String(error.message || ''))) {
      ({ error } = await supabase.from('transactions').insert(withoutId.map(({ occurred_on, property_value, ...r }) => r)));
    }
  }
  return { error };
}

export async function syncTransactions(uid, txs) {
  const real = txs.filter((t) => !t.bondId);
  const rows = real.map((t) => toDbTx(uid, t));
  const keep = new Set(rows.filter((r) => r.id).map((r) => r.id));
  const existing = await supabase.from('transactions').select('id').eq('user_id', uid);
  if (existing.error) return { error: existing.error };
  const stale = (existing.data || []).map((r) => r.id).filter((id) => !keep.has(id));
  if (stale.length) {
    const { error } = await supabase.from('transactions').delete().in('id', stale);
    if (error) return { error };
  }
  if (!rows.length) return { error: null };
  return writeRows(rows);
}
