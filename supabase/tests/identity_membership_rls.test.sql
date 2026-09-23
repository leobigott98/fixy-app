begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(35);

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
    '70000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'rls-owner-a@example.invalid',
    '+580000000201',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'rls-owner-b@example.invalid',
    '+580000000202',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'rls-member@example.invalid',
    '+580000000203',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  ),
  (
    '70000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'rls-outsider@example.invalid',
    '+580000000204',
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    false,
    false
  );

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('workshops', 'workshop_members', 'workshop_member_invites')
      and c.relrowsecurity
  ),
  3,
  'RLS is enabled on the three identity tables'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.workshops', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.workshop_members', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege(
    'anon',
    'public.workshop_member_invites',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'anon has no direct identity-table privileges'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.workshops', 'TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege(
    'authenticated',
    'public.workshop_members',
    'TRUNCATE,REFERENCES,TRIGGER'
  )
  and not has_table_privilege(
    'authenticated',
    'public.workshop_member_invites',
    'TRUNCATE,REFERENCES,TRIGGER'
  ),
  'authenticated has no structural table privileges'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","email":"rls-owner-a@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.lives_ok(
  $$
    insert into public.workshops (
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
    values (
      'rls-owner-a@example.invalid',
      'RLS Owner A',
      'RLS Workshop A',
      '+580000000211',
      'Caracas',
      'general',
      'Lunes a viernes',
      '08:00',
      '17:00',
      'Lunes a viernes, 8:00 - 17:00',
      2
    )
  $$,
  'an authenticated user may create its own workshop once'
);
reset role;

select id as workshop_a_id
from public.workshops
where workshop_name = 'RLS Workshop A'
\gset

select extensions.is(
  (
    select owner_auth_user_id
    from public.workshops
    where id = :'workshop_a_id'
  ),
  '70000000-0000-0000-0000-000000000001'::uuid,
  'own workshop creation binds owner_auth_user_id from auth.uid()'
);

set local role authenticated;
select extensions.throws_ok(
  $$
    insert into public.workshops (
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
    values (
      'rls-owner-a@example.invalid',
      'RLS Owner A',
      'RLS Workshop A duplicate',
      '+580000000212',
      'Caracas',
      'general',
      'Lunes a viernes',
      '08:00',
      '17:00',
      'Lunes a viernes, 8:00 - 17:00',
      1
    )
  $$,
  '23505',
  null,
  'the same Auth identity cannot create a second workshop'
);
select extensions.throws_ok(
  $$
    insert into public.workshops (
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
    values (
      'rls-owner-b@example.invalid',
      '70000000-0000-0000-0000-000000000002',
      'Spoofed Owner',
      'RLS Spoofed Workshop',
      '+580000000213',
      'Caracas',
      'general',
      'Lunes a viernes',
      '08:00',
      '17:00',
      'Lunes a viernes, 8:00 - 17:00',
      1
    )
  $$,
  '42501',
  null,
  'a user cannot create a workshop owned by another Auth identity'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000002","email":"rls-owner-b@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.lives_ok(
  $$
    insert into public.workshops (
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
    values (
      'rls-owner-b@example.invalid',
      'RLS Owner B',
      'RLS Workshop B',
      '+580000000214',
      'Valencia',
      'general',
      'Lunes a sabado',
      '08:00',
      '17:00',
      'Lunes a sabado, 8:00 - 17:00',
      3
    )
  $$,
  'a second Auth identity may create its own workshop'
);
reset role;

select id as workshop_b_id
from public.workshops
where workshop_name = 'RLS Workshop B'
\gset

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","email":"rls-owner-a@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.is(
  (select count(*) from public.workshops),
  1::bigint,
  'an owner sees its workshop but not another workshop'
);
select extensions.lives_ok(
  format(
    $sql$
      insert into public.workshop_member_invites (
        workshop_id,
        full_name,
        role,
        email,
        invited_by_name
      )
      values (
        %L,
        'RLS Member',
        'recepcion',
        'rls-member@example.invalid',
        'RLS Owner A'
      )
    $sql$,
    :'workshop_a_id'
  ),
  'the owner may create a pending team invitation'
);
reset role;

select id as invite_member_id
from public.workshop_member_invites
where workshop_id = :'workshop_a_id'
  and email = 'rls-member@example.invalid'
\gset

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000003","email":"rls-member@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.is(
  (select count(*) from public.workshop_member_invites),
  0::bigint,
  'the recipient cannot browse an unlinked invitation'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000004","email":"rls-outsider@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.throws_ok(
  format(
    'select public.accept_workshop_member_invite(%L)',
    :'invite_member_id'
  ),
  '42501',
  null,
  'a different authenticated user cannot accept the invitation'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000003","email":"rls-member@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.lives_ok(
  format(
    'select public.accept_workshop_member_invite(%L)',
    :'invite_member_id'
  ),
  'the exact invitation recipient may accept atomically'
);
reset role;

select extensions.ok(
  exists (
    select 1
    from public.workshop_member_invites
    where id = :'invite_member_id'
      and auth_user_id = '70000000-0000-0000-0000-000000000003'
      and status = 'accepted'
      and accepted_at is not null
  ),
  'acceptance links and closes the invitation'
);
select extensions.ok(
  exists (
    select 1
    from public.workshop_members
    where workshop_id = :'workshop_a_id'
      and auth_user_id = '70000000-0000-0000-0000-000000000003'
      and role = 'recepcion'
      and is_active
  ),
  'acceptance copies the owner-selected role into an active membership'
);

set local role authenticated;
select extensions.is(
  (select count(*) from public.workshops),
  1::bigint,
  'the new member sees only its workshop'
);
select extensions.is(
  (select count(*) from public.workshop_members),
  1::bigint,
  'the member sees only its own membership row'
);
select extensions.is_empty(
  $$
    update public.workshop_members
    set role = 'admin'
    where auth_user_id = auth.uid()
    returning id
  $$,
  'a member cannot promote itself by editing its membership row'
);
select extensions.is(
  public.workshop_role(:'workshop_a_id'),
  'recepcion',
  'the failed self-promotion leaves the authoritative role unchanged'
);
select extensions.throws_ok(
  format(
    'update public.workshop_members set auth_user_id = %L where auth_user_id = auth.uid()',
    '70000000-0000-0000-0000-000000000004'
  ),
  '42501',
  null,
  'a member has no grant to rewrite the Auth identity link'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","email":"rls-owner-a@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.isnt_empty(
  $$
    update public.workshop_members
    set role = 'admin'
    where auth_user_id = '70000000-0000-0000-0000-000000000003'
    returning id
  $$,
  'the authoritative owner may change a member role'
);
insert into public.workshop_member_invites (
  workshop_id,
  auth_user_id,
  full_name,
  role,
  email,
  invited_by_name
)
values (
  :'workshop_a_id',
  '70000000-0000-0000-0000-000000000003',
  'RLS Member stale invitation',
  'admin',
  'rls-member@example.invalid',
  'RLS Owner A'
);
reset role;

select id as stale_member_invite_id
from public.workshop_member_invites
where workshop_id = :'workshop_a_id'
  and auth_user_id = '70000000-0000-0000-0000-000000000003'
  and status = 'pending'
\gset

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000003","email":"rls-member@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.throws_ok(
  format(
    'update public.workshops set owner_auth_user_id = %L where id = %L',
    '70000000-0000-0000-0000-000000000003',
    :'workshop_a_id'
  ),
  '42501',
  null,
  'an admin has no column grant to take workshop ownership'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","email":"rls-owner-a@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.isnt_empty(
  $$
    update public.workshop_members
    set is_active = false
    where auth_user_id = '70000000-0000-0000-0000-000000000003'
    returning id
  $$,
  'the owner may revoke a membership'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000003","email":"rls-member@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.ok(
  not public.is_active_workshop_member(:'workshop_a_id'),
  'revocation immediately removes active membership'
);
select extensions.is(
  public.workshop_role(:'workshop_a_id'),
  null,
  'revocation removes the effective role'
);
select extensions.is(
  (select count(*) from public.workshops),
  0::bigint,
  'a revoked member can no longer read the workshop'
);
select extensions.is_empty(
  $$
    update public.workshop_members
    set full_name = 'Revoked self edit'
    where auth_user_id = auth.uid()
    returning id
  $$,
  'a revoked member cannot edit its membership'
);
select extensions.is(
  (select count(*) from public.workshop_members),
  1::bigint,
  'a revoked member may still read its own inactive row'
);
select extensions.throws_ok(
  format(
    'select public.accept_workshop_member_invite(%L)',
    :'stale_member_invite_id'
  ),
  '42501',
  null,
  'a stale invitation cannot reactivate a revoked membership'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","email":"rls-owner-a@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.lives_ok(
  format(
    $sql$
      insert into public.workshop_member_invites (
        workshop_id,
        auth_user_id,
        full_name,
        role,
        email,
        invited_by_name
      )
      values (
        %L,
        '70000000-0000-0000-0000-000000000004',
        'RLS Outsider',
        'finanzas',
        'rls-outsider@example.invalid',
        'RLS Owner A'
      )
    $sql$,
    :'workshop_a_id'
  ),
  'the owner may create a linked invitation for cancellation'
);
reset role;

select id as cancelled_invite_id
from public.workshop_member_invites
where workshop_id = :'workshop_a_id'
  and auth_user_id = '70000000-0000-0000-0000-000000000004'
  and status = 'pending'
\gset

set local role authenticated;
select extensions.isnt_empty(
  format(
    'update public.workshop_member_invites set status = ''cancelled'' where id = %L returning id',
    :'cancelled_invite_id'
  ),
  'the owner may cancel a pending invitation'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000004","email":"rls-outsider@example.invalid","role":"authenticated"}',
  true
);
set local role authenticated;
select extensions.throws_ok(
  format(
    'select public.accept_workshop_member_invite(%L)',
    :'cancelled_invite_id'
  ),
  '42501',
  null,
  'a cancelled invitation cannot be accepted'
);
reset role;

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.accept_workshop_member_invite(uuid)',
    'EXECUTE'
  ),
  'authenticated may execute the narrow invitation transition'
);
select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.accept_workshop_member_invite(uuid)',
    'EXECUTE'
  ),
  'anon cannot execute invitation acceptance'
);
select extensions.ok(
  not has_function_privilege(
    'service_role',
    'public.accept_workshop_member_invite(uuid)',
    'EXECUTE'
  ),
  'service_role does not need the invitation RPC because it bypasses RLS'
);

select * from extensions.finish();

rollback;
