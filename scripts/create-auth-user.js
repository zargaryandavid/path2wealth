#!/usr/bin/env node
// Local only. Uses the service_role key to create a confirmed Auth user
// so you can Sign in without a confirmation email.
// Never put SUPABASE_SERVICE_ROLE_KEY in EXPO_PUBLIC_* — it would ship in the app.
//
//   node scripts/create-auth-user.js email@example.com 'their-password'
//
// Key: Supabase Dashboard → Project Settings → API → service_role
// Add it to .env.local (gitignored):
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const file = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] == null) process.env[k] = v;
  }
}

loadEnv();

const email = String(process.argv[2] || '').trim();
const password = String(process.argv[3] || '');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!email || password.length < 6) {
  console.error('Usage: node scripts/create-auth-user.js email@example.com \'password\'');
  process.exit(1);
}
if (!url || !service) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (String(service).startsWith('sb_publishable_') || String(service).includes('anon')) {
  console.error('Need the service_role secret, not the publishable/anon key.');
  process.exit(1);
}

const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) {
    console.log('Created and confirmed:', data.user && data.user.email);
    console.log('They can Sign in in the app with that email and password. No code email needed.');
    return;
  }
  const msg = String(error.message || '');
  if (/already/i.test(msg) || error.status === 422) {
    const { data: users, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) {
      console.error(msg);
      process.exit(1);
    }
    const existing = (users.users || []).find((u) => String(u.email || '').toLowerCase() === email.toLowerCase());
    if (!existing) {
      console.error(msg);
      process.exit(1);
    }
    const { error: upErr } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (upErr) {
      console.error(upErr.message);
      process.exit(1);
    }
    console.log('User already existed. Password reset and email marked confirmed:', email);
    return;
  }
  console.error(msg);
  process.exit(1);
})();
