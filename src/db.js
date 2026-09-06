// db.js — reads/writes your data to Supabase. Every function is safe to call:
// if anything fails, the caller keeps working with in-memory data.
import { supabase } from './supabase';

// bond coupons are derived from your portfolio, so we never store them.
const paymentDate = (t) => t.occurredOn || (t.date && String(t.date).slice(0, 10)) || null;

const toDbTx = (uid, t) => ({
  user_id: uid, type: t.type, amount: t.amount, category: t.category,
  note: t.note || null, recurring: !!t.recurring,
  repeat_day: t.repeatDay ?? null, repeat_months: t.repeatMonths ?? null,
  occurred_on: paymentDate(t),
});
const fromDbTx = (r) => {
  const occurredOn = r.occurred_on || (r.created_at && String(r.created_at).slice(0, 10)) || null;
  return {
    id: r.id, type: r.type, amount: Number(r.amount), category: r.category,
    note: r.note || '', recurring: !!r.recurring, repeatDay: r.repeat_day,
    repeatMonths: r.repeat_months, occurredOn, date: occurredOn,
  };
};

export async function loadAll(uid) {
  const prof = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  const txs = await supabase.from('transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false });
  const p = prof.data;
  return {
    profile: p ? { age: p.age, gender: p.gender, income: p.income != null ? String(p.income) : '',
      location: p.location, specialty: p.specialty, goal: p.goal } : null,
    transactions: (txs.data || []).map(fromDbTx),
  };
}

export async function saveProfile(uid, p) {
  const income = parseFloat(String(p.income || '').replace(/[^0-9.]/g, ''));
  return supabase.from('profiles').upsert({
    id: uid, age: p.age || null, gender: p.gender || null,
    income: isNaN(income) ? null : income, location: p.location || null,
    specialty: p.specialty || null, goal: p.goal || null, updated_at: new Date().toISOString(),
  });
}

// Simple + reliable for an alpha: replace the user's rows with the current set.
export async function syncTransactions(uid, txs) {
  const real = txs.filter((t) => !t.bondId);
  await supabase.from('transactions').delete().eq('user_id', uid);
  if (real.length) await supabase.from('transactions').insert(real.map((t) => toDbTx(uid, t)));
}
