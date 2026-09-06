-- Savings accounts (Emergency Fund, HYSA, ...).
create table if not exists public.savings_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, balance numeric default 0,
  created_at timestamptz default now()
);
alter table public.savings_accounts enable row level security;
drop policy if exists "savings are private to owner" on public.savings_accounts;
create policy "savings are private to owner" on public.savings_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Portfolio holdings (stocks, precious metals/paper, bonds).
create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, name text not null,
  qty numeric default 0, price numeric default 0,
  yield numeric, cycle text, currency text default 'USD',
  created_at timestamptz default now()
);
alter table public.portfolio_holdings enable row level security;
drop policy if exists "holdings are private to owner" on public.portfolio_holdings;
create policy "holdings are private to owner" on public.portfolio_holdings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
