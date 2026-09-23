begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(21);

insert into auth.users (
  id,
  aud,
  role,
  email,
  phone,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'identity-owner-a@example.invalid',
    '+580000000001',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'identity-owner-b@example.invalid',
    '+580000000002',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'identity-member-a@example.invalid',
    '+580000000003',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'identity-member-b@example.invalid',
    '+580000000004',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'identity-outsider@example.invalid',
    '+580000000005',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  );

insert into public.workshops (
  id,
  owner_email,
  owner_auth_user_id,
  owner_name,
  workshop_name,
  whatsapp_phone,
  city,
  workshop_type,
  opening_days,
  opens_at,
  closes_at,
  opening_hours_label,
  bay_count
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'identity-owner-a@example.invalid',
    '10000000-0000-0000-0000-000000000001',
    'Owner A',
    'Identity Workshop A',
    '+580000000011',
    'Caracas',
    'general',
    'Lunes a viernes',
    '08:00',
    '17:00',
    'Lunes a viernes, 8:00 - 17:00',
    2
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'identity-owner-b@example.invalid',
    '10000000-0000-0000-0000-000000000002',
    'Owner B',
    'Identity Workshop B',
    '+580000000012',
    'Valencia',
    'general',
    'Lunes a sabado',
    '08:00',
    '17:00',
    'Lunes a sabado, 8:00 - 17:00',
    3
  );

insert into public.workshop_members (
  id,
  workshop_id,
  auth_user_id,
  email,
  phone,
  full_name,
  role,
  is_active
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'identity-member-a@example.invalid',
    '+580000000003',
    'Member A',
    'admin',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    'identity-member-a@example.invalid',
    '+580000000003',
    'Member A',
    'recepcion',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    'identity-member-b@example.invalid',
    '+580000000004',
    'Member B',
    'mechanic',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    'identity-member-b@example.invalid',
    '+580000000004',
    'Member B',
    'mechanic',
    false
  );

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select extensions.ok(
  public.is_active_workshop_member('20000000-0000-0000-0000-000000000001'),
  'owner A belongs to workshop A'
);
select extensions.is(
  public.workshop_role('20000000-0000-0000-0000-000000000001'),
  'owner',
  'owner A receives the authoritative owner role'
);
select extensions.ok(
  not public.is_active_workshop_member('20000000-0000-0000-0000-000000000002'),
  'owner A does not belong to workshop B'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select extensions.ok(
  public.is_active_workshop_member('20000000-0000-0000-0000-000000000001'),
  'member A belongs to workshop A'
);
select extensions.is(
  public.workshop_role('20000000-0000-0000-0000-000000000001'),
  'admin',
  'member A has the role stored for workshop A and is not promoted to owner'
);
select extensions.ok(
  public.is_active_workshop_member('20000000-0000-0000-0000-000000000002'),
  'the same Auth user may also belong to workshop B'
);
select extensions.is(
  public.workshop_role('20000000-0000-0000-0000-000000000002'),
  'recepcion',
  'roles remain scoped to their workshop'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select extensions.ok(
  public.is_active_workshop_member('20000000-0000-0000-0000-000000000002'),
  'member B belongs to workshop B'
);
select extensions.is(
  public.workshop_role('20000000-0000-0000-0000-000000000002'),
  'mechanic',
  'member B has its workshop B role'
);
select extensions.ok(
  not public.is_active_workshop_member('20000000-0000-0000-0000-000000000001'),
  'an inactive membership does not grant workshop A access'
);
select extensions.is(
  public.workshop_role('20000000-0000-0000-0000-000000000001'),
  null,
  'an inactive membership returns no role'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select extensions.ok(
  not public.is_active_workshop_member('20000000-0000-0000-0000-000000000001'),
  'an authenticated outsider cannot enter workshop A'
);
select extensions.is(
  public.workshop_role('20000000-0000-0000-0000-000000000002'),
  null,
  'an authenticated outsider cannot claim a workshop B role'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.is_active_workshop_member(uuid)',
    'EXECUTE'
  ),
  'authenticated may execute the membership helper'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.workshop_role(uuid)', 'EXECUTE'),
  'authenticated may execute the role helper'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.is_active_workshop_member(uuid)', 'EXECUTE'),
  'anon cannot execute the membership helper'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.workshop_role(uuid)', 'EXECUTE'),
  'anon cannot execute the role helper'
);
select extensions.ok(
  not has_function_privilege(
    'service_role',
    'public.is_active_workshop_member(uuid)',
    'EXECUTE'
  ),
  'service_role does not need the membership helper because it bypasses RLS'
);
select extensions.ok(
  not has_function_privilege('service_role', 'public.workshop_role(uuid)', 'EXECUTE'),
  'service_role does not need the role helper because it bypasses RLS'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'workshop_role'
      and pg_catalog.pg_get_function_arguments(p.oid) = 'target_workshop_id uuid'
  ),
  1,
  'the role helper accepts no caller-supplied user or role'
);
select extensions.is(
  (
    select p.proconfig
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'workshop_role'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'target_workshop_id uuid'
  ),
  array['search_path=""'],
  'the SECURITY DEFINER role helper has an empty search_path'
);

select * from extensions.finish();

rollback;
