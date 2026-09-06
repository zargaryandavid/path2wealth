-- Monthly expenses for zargaryandavid@yahoo.com.
-- Run once in Supabase → SQL Editor (bypasses RLS; looks up the user by email).
-- Does not store account passwords.

alter table public.transactions
  add column if not exists occurred_on date;

do $$
declare
  uid uuid;
begin
  select id into uid
  from auth.users
  where email = 'zargaryandavid@yahoo.com'
  limit 1;

  if uid is null then
    raise exception 'No auth user with email zargaryandavid@yahoo.com';
  end if;

  delete from public.transactions
  where user_id = uid
    and type = 'expense'
    and note in (
      'House rent',
      'Car (Kolya)',
      'Car insurance',
      'Rent insurance (Progressive)',
      'Power',
      'Spectrum',
      'Mac (12-month, started Apr 2026)',
      'ChatGPT',
      'Fuel',
      'Gym (LA Fitness)'
    );

  insert into public.transactions (
    user_id, type, amount, category, note, recurring, repeat_day, repeat_months, occurred_on
  )
  values
    (uid, 'expense', 2975, 'home',      'House rent',                        true, 1, 12, date '2026-09-01'),
    (uid, 'expense',  420, 'transport', 'Car (Kolya)',                       true, 1, 12, date '2026-09-01'),
    (uid, 'expense',  190, 'bills',     'Car insurance',                     true, 1, 12, date '2026-09-01'),
    (uid, 'expense',   17, 'bills',     'Rent insurance (Progressive)',      true, 1, 12, date '2026-09-01'),
    (uid, 'expense',  190, 'bills',     'Power',                             true, 1, 12, date '2026-09-01'),
    (uid, 'expense',   58, 'bills',     'Spectrum',                          true, 1, 12, date '2026-09-01'),
    (uid, 'expense',  200, 'shopping',  'Mac (12-month, started Apr 2026)',  true, 1, 12, date '2026-09-01'),
    (uid, 'expense',   20, 'fun',       'ChatGPT',                           true, 1, 12, date '2026-09-01'),
    (uid, 'expense',  400, 'transport', 'Fuel',                              true, 1, 12, date '2026-09-01'),
    (uid, 'expense',   39, 'health',    'Gym (LA Fitness)',                  true, 1, 12, date '2026-09-01');
end $$;
