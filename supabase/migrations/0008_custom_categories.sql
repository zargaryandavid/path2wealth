alter table public.profiles add column if not exists custom_income jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists custom_expense jsonb default '[]'::jsonb;
