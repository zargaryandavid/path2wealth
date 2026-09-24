-- Select EVERYTHING in this file (Cmd+A / Ctrl+A), then Run in SQL Editor.
-- Do not run one line. Line 12 is not valid SQL by itself.
--
-- 1) Change REPLACE_WITH_PASSWORD to the real password (6+ chars)
-- 2) Select all → Run

create extension if not exists pgcrypto;

do $$
declare
  new_id uuid := gen_random_uuid();
  user_email text := 'gevv.asatryan@gmail.com';
  user_pass text := 'REPLACE_WITH_PASSWORD';
  existing_id uuid;
begin
  if user_pass = 'REPLACE_WITH_PASSWORD' or length(user_pass) < 6 then
    raise exception 'Set user_pass to the real password (6+ characters), then select the WHOLE script and Run.';
  end if;

  select id into existing_id from auth.users where email = user_email limit 1;

  if existing_id is not null then
    update auth.users
    set
      encrypted_password = crypt(user_pass, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmation_token = '',
      updated_at = now()
    where id = existing_id;

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    )
    select
      gen_random_uuid(),
      existing_id,
      jsonb_build_object('sub', existing_id::text, 'email', user_email, 'email_verified', true),
      'email',
      existing_id::text,
      now(),
      now(),
      now()
    where not exists (
      select 1 from auth.identities i
      where i.user_id = existing_id and i.provider = 'email'
    );

    raise notice 'Updated existing user % (password + confirmed)', user_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_pass, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', user_email, 'email_verified', true),
    'email',
    new_id::text,
    now(),
    now(),
    now()
  );

  raise notice 'Created confirmed user %', user_email;
end $$;
