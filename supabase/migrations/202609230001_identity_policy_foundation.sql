-- Identity foundation for future RLS policies. This migration deliberately does
-- not enable RLS or add policies for the rest of the application tables.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.identity_link_backfill_issues (
  entity_type text not null check (entity_type in ('workshop_owner', 'workshop_member')),
  entity_id uuid not null,
  workshop_id uuid not null,
  issue_code text not null check (
    issue_code in ('no_exact_auth_match', 'ambiguous_auth_match', 'duplicate_membership_target')
  ),
  source_email text,
  source_phone text,
  candidate_auth_user_ids uuid[] not null default '{}',
  recorded_at timestamptz not null default timezone('utc', now()),
  primary key (entity_type, entity_id, issue_code)
);

comment on table private.identity_link_backfill_issues is
  'Rows that could not be linked safely to auth.users by exact normalized email or exact phone. Resolve manually; never infer identity from a name.';

revoke all on table private.identity_link_backfill_issues from public;
revoke all on table private.identity_link_backfill_issues from anon, authenticated;

alter table public.workshops
  add column if not exists owner_auth_user_id uuid;

alter table public.workshop_members
  add column if not exists auth_user_id uuid;

comment on column public.workshops.owner_auth_user_id is
  'Authoritative Auth identity for the workshop owner. NULL means the legacy record still needs an unambiguous link.';

comment on column public.workshop_members.auth_user_id is
  'Authoritative Auth identity for this membership. Email and phone remain contact fields only.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workshops'::regclass
      and conname = 'workshops_owner_auth_user_id_fkey'
  ) then
    alter table public.workshops
      add constraint workshops_owner_auth_user_id_fkey
      foreign key (owner_auth_user_id)
      references auth.users(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workshop_members'::regclass
      and conname = 'workshop_members_auth_user_id_fkey'
  ) then
    alter table public.workshop_members
      add constraint workshop_members_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users(id)
      on delete set null;
  end if;
end;
$$;

-- Owner backfill: a case-insensitive, trimmed email must identify exactly one
-- non-deleted Auth user. Names and other profile fields are intentionally ignored.
with owner_candidates as (
  select distinct
    w.id as workshop_id,
    u.id as auth_user_id
  from public.workshops as w
  join auth.users as u
    on nullif(lower(btrim(u.email)), '') = nullif(lower(btrim(w.owner_email)), '')
   and u.deleted_at is null
  where w.owner_auth_user_id is null
),
owner_resolutions as (
  select
    w.id as workshop_id,
    count(oc.auth_user_id) as candidate_count,
    coalesce(
      array_agg(oc.auth_user_id order by oc.auth_user_id)
        filter (where oc.auth_user_id is not null),
      '{}'::uuid[]
    ) as candidate_auth_user_ids
  from public.workshops as w
  left join owner_candidates as oc on oc.workshop_id = w.id
  where w.owner_auth_user_id is null
  group by w.id
)
insert into private.identity_link_backfill_issues (
  entity_type,
  entity_id,
  workshop_id,
  issue_code,
  source_email,
  candidate_auth_user_ids
)
select
  'workshop_owner',
  w.id,
  w.id,
  case
    when r.candidate_count = 0 then 'no_exact_auth_match'
    else 'ambiguous_auth_match'
  end,
  w.owner_email,
  r.candidate_auth_user_ids
from owner_resolutions as r
join public.workshops as w on w.id = r.workshop_id
where r.candidate_count <> 1
on conflict do nothing;

with owner_candidates as (
  select distinct
    w.id as workshop_id,
    u.id as auth_user_id
  from public.workshops as w
  join auth.users as u
    on nullif(lower(btrim(u.email)), '') = nullif(lower(btrim(w.owner_email)), '')
   and u.deleted_at is null
  where w.owner_auth_user_id is null
),
owner_resolutions as (
  select
    workshop_id,
    min(auth_user_id::text)::uuid as auth_user_id
  from owner_candidates
  group by workshop_id
  having count(*) = 1
)
update public.workshops as w
set owner_auth_user_id = r.auth_user_id
from owner_resolutions as r
where w.id = r.workshop_id
  and w.owner_auth_user_id is null;

-- Member backfill: exact normalized email and exact trimmed phone are combined.
-- If the two identifiers point to different users, or more than one row in the
-- same workshop would target one Auth user, every affected row remains NULL.
with member_candidates as (
  select distinct
    wm.id as member_id,
    wm.workshop_id,
    u.id as auth_user_id
  from public.workshop_members as wm
  join auth.users as u
    on u.deleted_at is null
   and (
     (
       nullif(lower(btrim(wm.email)), '') is not null
       and nullif(lower(btrim(u.email)), '') = nullif(lower(btrim(wm.email)), '')
     )
     or (
       nullif(btrim(wm.phone), '') is not null
       and nullif(btrim(u.phone), '') = nullif(btrim(wm.phone), '')
     )
   )
  where wm.auth_user_id is null
),
member_resolutions as (
  select
    wm.id as member_id,
    wm.workshop_id,
    count(mc.auth_user_id) as candidate_count,
    coalesce(
      array_agg(mc.auth_user_id order by mc.auth_user_id)
        filter (where mc.auth_user_id is not null),
      '{}'::uuid[]
    ) as candidate_auth_user_ids
  from public.workshop_members as wm
  left join member_candidates as mc on mc.member_id = wm.id
  where wm.auth_user_id is null
  group by wm.id, wm.workshop_id
)
insert into private.identity_link_backfill_issues (
  entity_type,
  entity_id,
  workshop_id,
  issue_code,
  source_email,
  source_phone,
  candidate_auth_user_ids
)
select
  'workshop_member',
  wm.id,
  wm.workshop_id,
  case
    when r.candidate_count = 0 then 'no_exact_auth_match'
    else 'ambiguous_auth_match'
  end,
  wm.email,
  wm.phone,
  r.candidate_auth_user_ids
from member_resolutions as r
join public.workshop_members as wm on wm.id = r.member_id
where r.candidate_count <> 1
on conflict do nothing;

with member_candidates as (
  select distinct
    wm.id as member_id,
    wm.workshop_id,
    u.id as auth_user_id
  from public.workshop_members as wm
  join auth.users as u
    on u.deleted_at is null
   and (
     (
       nullif(lower(btrim(wm.email)), '') is not null
       and nullif(lower(btrim(u.email)), '') = nullif(lower(btrim(wm.email)), '')
     )
     or (
       nullif(btrim(wm.phone), '') is not null
       and nullif(btrim(u.phone), '') = nullif(btrim(wm.phone), '')
     )
   )
  where wm.auth_user_id is null
),
single_candidate_members as (
  select
    member_id,
    workshop_id,
    min(auth_user_id::text)::uuid as auth_user_id
  from member_candidates
  group by member_id, workshop_id
  having count(*) = 1
),
duplicate_targets as (
  select workshop_id, auth_user_id
  from single_candidate_members
  group by workshop_id, auth_user_id
  having count(*) > 1
)
insert into private.identity_link_backfill_issues (
  entity_type,
  entity_id,
  workshop_id,
  issue_code,
  source_email,
  source_phone,
  candidate_auth_user_ids
)
select
  'workshop_member',
  wm.id,
  wm.workshop_id,
  'duplicate_membership_target',
  wm.email,
  wm.phone,
  array[scm.auth_user_id]
from single_candidate_members as scm
join duplicate_targets as dt
  on dt.workshop_id = scm.workshop_id
 and dt.auth_user_id = scm.auth_user_id
join public.workshop_members as wm on wm.id = scm.member_id
on conflict do nothing;

with member_candidates as (
  select distinct
    wm.id as member_id,
    wm.workshop_id,
    u.id as auth_user_id
  from public.workshop_members as wm
  join auth.users as u
    on u.deleted_at is null
   and (
     (
       nullif(lower(btrim(wm.email)), '') is not null
       and nullif(lower(btrim(u.email)), '') = nullif(lower(btrim(wm.email)), '')
     )
     or (
       nullif(btrim(wm.phone), '') is not null
       and nullif(btrim(u.phone), '') = nullif(btrim(wm.phone), '')
     )
   )
  where wm.auth_user_id is null
),
single_candidate_members as (
  select
    member_id,
    workshop_id,
    min(auth_user_id::text)::uuid as auth_user_id
  from member_candidates
  group by member_id, workshop_id
  having count(*) = 1
),
duplicate_targets as (
  select workshop_id, auth_user_id
  from single_candidate_members
  group by workshop_id, auth_user_id
  having count(*) > 1
),
safe_resolutions as (
  select scm.*
  from single_candidate_members as scm
  left join duplicate_targets as dt
    on dt.workshop_id = scm.workshop_id
   and dt.auth_user_id = scm.auth_user_id
  where dt.auth_user_id is null
)
update public.workshop_members as wm
set auth_user_id = sr.auth_user_id
from safe_resolutions as sr
where wm.id = sr.member_id
  and wm.auth_user_id is null;

create index if not exists idx_workshops_owner_auth_user_id
  on public.workshops(owner_auth_user_id)
  where owner_auth_user_id is not null;

create unique index if not exists idx_workshop_members_workshop_auth_user_unique
  on public.workshop_members(workshop_id, auth_user_id)
  where auth_user_id is not null;

create or replace function public.is_active_workshop_member(target_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_workshop_id is not null
    and auth.uid() is not null
    and (
      exists (
        select 1
        from public.workshops as w
        where w.id = target_workshop_id
          and w.owner_auth_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.workshop_members as wm
        where wm.workshop_id = target_workshop_id
          and wm.auth_user_id = auth.uid()
          and wm.is_active
      )
    );
$$;

comment on function public.is_active_workshop_member(uuid) is
  'Checks active membership for auth.uid(). The caller cannot supply or impersonate another Auth user.';

create or replace function public.workshop_role(target_workshop_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_workshop_id is null or auth.uid() is null then null
    when exists (
      select 1
      from public.workshops as w
      where w.id = target_workshop_id
        and w.owner_auth_user_id = auth.uid()
    ) then 'owner'
    else (
      select wm.role
      from public.workshop_members as wm
      where wm.workshop_id = target_workshop_id
        and wm.auth_user_id = auth.uid()
        and wm.is_active
    )
  end;
$$;

comment on function public.workshop_role(uuid) is
  'Returns the authoritative active role for auth.uid() in one workshop. Owner identity takes precedence; no role or user claim is accepted as input.';

revoke all on function public.is_active_workshop_member(uuid) from public;
revoke all on function public.is_active_workshop_member(uuid) from anon, authenticated, service_role;
grant execute on function public.is_active_workshop_member(uuid) to authenticated;

revoke all on function public.workshop_role(uuid) from public;
revoke all on function public.workshop_role(uuid) from anon, authenticated, service_role;
grant execute on function public.workshop_role(uuid) to authenticated;
