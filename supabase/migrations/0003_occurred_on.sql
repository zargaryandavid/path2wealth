-- Payment date for one-time entries and first payment for repeating series.
alter table public.transactions
  add column if not exists occurred_on date;

update public.transactions
  set occurred_on = created_at::date
  where occurred_on is null;
