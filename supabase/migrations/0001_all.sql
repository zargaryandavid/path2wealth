-- Combined schema. Same as ../schema.sql — run either file once in SQL Editor.
-- Safe to re-run: creates missing tables/columns, leaves existing data alone.

-- 1) PROFILES
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  age         text,
  gender      text,
  income      numeric,
  location    text,
  specialty   text,
  goal           text,
  alloc          jsonb,
  marital_status text,
  kids_qty       int,
  kids_ages      jsonb,
  updated_at     timestamptz default now()
);
alter table public.profiles add column if not exists alloc jsonb;
alter table public.profiles add column if not exists marital_status text;
alter table public.profiles add column if not exists kids_qty int;
alter table public.profiles add column if not exists kids_ages jsonb;
alter table public.profiles enable row level security;
drop policy if exists "profiles are private to owner" on public.profiles;
create policy "profiles are private to owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2) TRANSACTIONS
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
  property_value numeric,
  created_at     timestamptz default now()
);
alter table public.transactions add column if not exists occurred_on date;
alter table public.transactions add column if not exists property_value numeric;
update public.transactions
  set occurred_on = created_at::date
  where occurred_on is null;
alter table public.transactions enable row level security;
drop policy if exists "transactions are private to owner" on public.transactions;
create policy "transactions are private to owner" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists transactions_user_idx on public.transactions(user_id, created_at desc);

-- 3) SAVINGS ACCOUNTS
create table if not exists public.savings_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric default 0,
  kind text default 'savings',
  contributions numeric,
  created_at timestamptz default now()
);
alter table public.savings_accounts add column if not exists kind text default 'savings';
alter table public.savings_accounts add column if not exists contributions numeric;
alter table public.savings_accounts enable row level security;
drop policy if exists "savings are private to owner" on public.savings_accounts;
create policy "savings are private to owner" on public.savings_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) PORTFOLIO HOLDINGS
create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  name text not null,
  qty numeric default 0,
  price numeric default 0,
  yield numeric,
  cycle text,
  currency text default 'USD',
  coupon_start date,
  created_at timestamptz default now()
);
alter table public.portfolio_holdings add column if not exists coupon_start date;
alter table public.portfolio_holdings enable row level security;
drop policy if exists "holdings are private to owner" on public.portfolio_holdings;
create policy "holdings are private to owner" on public.portfolio_holdings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
