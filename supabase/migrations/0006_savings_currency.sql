-- Currency on each savings account (USD, AMD, …).
alter table public.savings_accounts
  add column if not exists currency text default 'USD';
