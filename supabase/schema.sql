-- Path2Wealth database schema. Run this once in Supabase → SQL Editor.
-- It creates two tables and locks them down so each user only sees their own data.

-- 1) PROFILES — one row per user (their onboarding answers)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  age         text,
  gender      text,
  income      numeric,
  location    text,
  specialty   text,
  goal        text,
  updated_at  timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles are private to owner" on public.profiles;
create policy "profiles are private to owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2) TRANSACTIONS — every income/expense entry
create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null check (type in ('income','expense')),
  amount         numeric not null,
  category       text not null,
  note           text,
  recurring      boolean default false,
  repeat_day     int,
  repeat_months  int,
  occurred_on    date,
  created_at     timestamptz default now()
);
alter table public.transactions enable row level security;
drop policy if exists "transactions are private to owner" on public.transactions;
create policy "transactions are private to owner" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists transactions_user_idx on public.transactions(user_id, created_at desc);
