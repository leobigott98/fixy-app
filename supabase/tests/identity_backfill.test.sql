begin;

create extension if not exists pgtap with schema extensions;

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
    '40000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'backfill-owner@example.invalid',
    '+580000000101',
    '',
    '{}'::jsonb,
    '{"full_name":"Owner Exact"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'backfill-member@example.invalid',
    '+580000000102',
    '',
    '{}'::jsonb,
    '{"full_name":"Member Exact"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'backfill-conflict-email@example.invalid',
    '+580000000103',
    '',
    '{}'::jsonb,
    '{"full_name":"Conflict Email"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'backfill-shared-target@example.invalid',
    '+580000000104',
    '',
    '{}'::jsonb,
    '{"full_name":"Shared Target"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'unrelated-contact@example.invalid',
    '+580000000105',
    '',
    '{}'::jsonb,
    '{"full_name":"Same Name Only"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  );

insert into public.workshops (
  id,
  owner_email,
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
    '50000000-0000-0000-0000-000000000001',
    '  BACKFILL-OWNER@example.invalid  ',
    'Owner Exact',
    'Backfill Workshop A',
    '+580000000111',
    'Caracas',
    'general',
    'Lunes a viernes',
    '08:00',
    '17:00',
    'Lunes a viernes, 8:00 - 17:00',
    2
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'owner-without-exact-auth@example.invalid',
    'Same Name Only',
    'Backfill Workshop B',
    '+580000000112',
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
  email,
  phone,
  full_name,
  role,
  is_active
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    ' BACKFILL-MEMBER@example.invalid ',
    null,
    'Member Exact',
    'admin',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    'backfill-conflict-email@example.invalid',
    '+580000000104',
    'Two Exact Identifiers',
    'recepcion',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000002',
    'name-only-contact@example.invalid',
    null,
    'Same Name Only',
    'finanzas',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000001',
    'backfill-shared-target@example.invalid',
    null,
    'Shared Target By Email',
    'mechanic',
    true
  ),
  (
    '60000000-0000-0000-0000-000000000005',
    '50000000-0000-0000-0000-000000000001',
    null,
    '+580000000104',
    'Shared Target By Phone',
    'mechanic',
    true
  );

\ir ../migrations/202609230001_identity_policy_foundation.sql

select extensions.plan(10);

select extensions.is(
  (
    select owner_auth_user_id
    from public.workshops
    where id = '50000000-0000-0000-0000-000000000001'
  ),
  '40000000-0000-0000-0000-000000000001'::uuid,
  'an owner is linked from one exact normalized email match'
);
select extensions.is(
  (
    select owner_auth_user_id
    from public.workshops
    where id = '50000000-0000-0000-0000-000000000002'
  ),
  null,
  'an owner without an exact identifier remains pending'
);
select extensions.ok(
  exists (
    select 1
    from private.identity_link_backfill_issues
    where entity_type = 'workshop_owner'
      and entity_id = '50000000-0000-0000-0000-000000000002'
      and issue_code = 'no_exact_auth_match'
  ),
  'an unresolved owner is documented'
);
select extensions.is(
  (
    select auth_user_id
    from public.workshop_members
    where id = '60000000-0000-0000-0000-000000000001'
  ),
  '40000000-0000-0000-0000-000000000002'::uuid,
  'a member is linked from one exact normalized email match'
);
select extensions.is(
  (
    select auth_user_id
    from public.workshop_members
    where id = '60000000-0000-0000-0000-000000000002'
  ),
  null,
  'a member whose exact email and phone identify different users remains pending'
);
select extensions.is(
  (
    select cardinality(candidate_auth_user_ids)
    from private.identity_link_backfill_issues
    where entity_type = 'workshop_member'
      and entity_id = '60000000-0000-0000-0000-000000000002'
      and issue_code = 'ambiguous_auth_match'
  ),
  2,
  'both candidates for an ambiguous member are documented'
);
select extensions.is(
  (
    select count(*)::integer
    from public.workshop_members
    where id in (
      '60000000-0000-0000-0000-000000000004',
      '60000000-0000-0000-0000-000000000005'
    )
      and auth_user_id is null
  ),
  2,
  'duplicate membership targets remain unlinked'
);
select extensions.is(
  (
    select count(*)::integer
    from private.identity_link_backfill_issues
    where entity_type = 'workshop_member'
      and entity_id in (
        '60000000-0000-0000-0000-000000000004',
        '60000000-0000-0000-0000-000000000005'
      )
      and issue_code = 'duplicate_membership_target'
  ),
  2,
  'every duplicate membership target is documented'
);
select extensions.is(
  (
    select auth_user_id
    from public.workshop_members
    where id = '60000000-0000-0000-0000-000000000003'
  ),
  null,
  'a matching display name never links a membership'
);
select extensions.ok(
  exists (
    select 1
    from private.identity_link_backfill_issues
    where entity_type = 'workshop_member'
      and entity_id = '60000000-0000-0000-0000-000000000003'
      and issue_code = 'no_exact_auth_match'
  ),
  'a name-only non-match is documented for manual resolution'
);

select * from extensions.finish();

rollback;
