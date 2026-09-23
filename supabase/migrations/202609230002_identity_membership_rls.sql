-- RLS and least-privilege grants for the identity/membership boundary only.
-- Operational, finance, marketplace, owner-portal and storage tables are out of scope.

alter table private.identity_link_backfill_issues
  drop constraint if exists identity_link_backfill_issues_entity_type_check;

alter table private.identity_link_backfill_issues
  add constraint identity_link_backfill_issues_entity_type_check
  check (entity_type in ('workshop_owner', 'workshop_member', 'workshop_member_invite'));

alter table public.workshop_member_invites
  add column if not exists auth_user_id uuid;

comment on column public.workshop_member_invites.auth_user_id is
  'Auth identity allowed to accept this invitation. NULL invitations require one exact identity match during atomic acceptance.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workshop_member_invites'::regclass
      and conname = 'workshop_member_invites_auth_user_id_fkey'
  ) then
    alter table public.workshop_member_invites
      add constraint workshop_member_invites_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users(id)
      on delete set null;
  end if;
end;
$$;

-- Pending legacy invitations are linked only when exact email/phone identifiers
-- converge on one non-deleted Auth user. Names are never identity evidence.
with invite_candidates as (
  select distinct
    i.id as invite_id,
    u.id as auth_user_id
  from public.workshop_member_invites as i
  join auth.users as u
    on u.deleted_at is null
   and (
     (
       nullif(lower(btrim(i.email)), '') is not null
       and nullif(lower(btrim(u.email)), '') = nullif(lower(btrim(i.email)), '')
     )
     or (
       nullif(btrim(i.phone), '') is not null
       and nullif(btrim(u.phone), '') = nullif(btrim(i.phone), '')
     )
   )
  where i.auth_user_id is null
    and i.status = 'pending'
),
invite_resolutions as (
  select
    i.id as invite_id,
    i.workshop_id,
    count(ic.auth_user_id) as candidate_count,
    coalesce(
      array_agg(ic.auth_user_id order by ic.auth_user_id)
        filter (where ic.auth_user_id is not null),
      '{}'::uuid[]
    ) as candidate_auth_user_ids
  from public.workshop_member_invites as i
  left join invite_candidates as ic on ic.invite_id = i.id
  where i.auth_user_id is null
    and i.status = 'pending'
  group by i.id, i.workshop_id
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
  'workshop_member_invite',
  i.id,
  i.workshop_id,
  case
    when r.candidate_count = 0 then 'no_exact_auth_match'
    else 'ambiguous_auth_match'
  end,
  i.email,
  i.phone,
  r.candidate_auth_user_ids
from invite_resolutions as r
join public.workshop_member_invites as i on i.id = r.invite_id
where r.candidate_count <> 1
on conflict do nothing;

with invite_candidates as (
  select distinct
    i.id as invite_id,
    u.id as auth_user_id
  from public.workshop_member_invites as i
  join auth.users as u
    on u.deleted_at is null
   and (
     (
       nullif(lower(btrim(i.email)), '') is not null
       and nullif(lower(btrim(u.email)), '') = nullif(lower(btrim(i.email)), '')
     )
     or (
       nullif(btrim(i.phone), '') is not null
       and nullif(btrim(u.phone), '') = nullif(btrim(i.phone), '')
     )
   )
  where i.auth_user_id is null
    and i.status = 'pending'
),
safe_invite_resolutions as (
  select
    invite_id,
    min(auth_user_id::text)::uuid as auth_user_id
  from invite_candidates
  group by invite_id
  having count(*) = 1
)
update public.workshop_member_invites as i
set auth_user_id = r.auth_user_id
from safe_invite_resolutions as r
where i.id = r.invite_id
  and i.auth_user_id is null;

create index if not exists idx_workshop_member_invites_auth_user_id
  on public.workshop_member_invites(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists idx_workshops_owner_auth_user_unique
  on public.workshops(owner_auth_user_id)
  where owner_auth_user_id is not null;

alter table public.workshops
  alter column owner_auth_user_id set default auth.uid();

-- A legacy/member row carrying role='owner' never grants access. Ownership is
-- derived exclusively from workshops.owner_auth_user_id.
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
          and wm.role <> 'owner'
      )
    );
$$;

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
        and wm.role <> 'owner'
    )
  end;
$$;

revoke all on function public.is_active_workshop_member(uuid) from public;
revoke all on function public.is_active_workshop_member(uuid)
  from anon, authenticated, service_role;
grant execute on function public.is_active_workshop_member(uuid) to authenticated;

revoke all on function public.workshop_role(uuid) from public;
revoke all on function public.workshop_role(uuid)
  from anon, authenticated, service_role;
grant execute on function public.workshop_role(uuid) to authenticated;

create or replace function public.accept_workshop_member_invite(target_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_auth_user_id uuid := auth.uid();
  invitation public.workshop_member_invites%rowtype;
  exact_candidate_count integer;
  exact_candidate_id uuid;
  existing_membership_is_active boolean;
  accepted_member_id uuid;
begin
  if current_auth_user_id is null then
    raise exception 'Invitation is not available for the current user.'
      using errcode = '42501';
  end if;

  select i.*
  into invitation
  from public.workshop_member_invites as i
  where i.id = target_invite_id
  for update;

  if not found or invitation.status <> 'pending' or invitation.role = 'owner' then
    raise exception 'Invitation is not available for the current user.'
      using errcode = '42501';
  end if;

  if invitation.auth_user_id is null then
    select
      count(*)::integer,
      min(candidate.id::text)::uuid
    into exact_candidate_count, exact_candidate_id
    from (
      select distinct u.id
      from auth.users as u
      where u.deleted_at is null
        and (
          (
            nullif(lower(btrim(invitation.email)), '') is not null
            and nullif(lower(btrim(u.email)), '') =
              nullif(lower(btrim(invitation.email)), '')
          )
          or (
            nullif(btrim(invitation.phone), '') is not null
            and nullif(btrim(u.phone), '') = nullif(btrim(invitation.phone), '')
          )
        )
    ) as candidate;

    if exact_candidate_count <> 1 or exact_candidate_id <> current_auth_user_id then
      raise exception 'Invitation is not available for the current user.'
        using errcode = '42501';
    end if;

    update public.workshop_member_invites
    set auth_user_id = current_auth_user_id
    where id = invitation.id;
  elsif invitation.auth_user_id <> current_auth_user_id then
    raise exception 'Invitation is not available for the current user.'
      using errcode = '42501';
  end if;

  select wm.is_active
  into existing_membership_is_active
  from public.workshop_members as wm
  where wm.workshop_id = invitation.workshop_id
    and wm.auth_user_id = current_auth_user_id
  for update;

  if existing_membership_is_active = false then
    raise exception 'Invitation is not available for the current user.'
      using errcode = '42501';
  end if;

  insert into public.workshop_members (
    workshop_id,
    auth_user_id,
    email,
    phone,
    full_name,
    role,
    mechanic_id,
    is_active
  )
  values (
    invitation.workshop_id,
    current_auth_user_id,
    nullif(lower(btrim(invitation.email)), ''),
    nullif(btrim(invitation.phone), ''),
    invitation.full_name,
    invitation.role,
    invitation.mechanic_id,
    true
  )
  on conflict (workshop_id, auth_user_id)
    where auth_user_id is not null
  do update set
    email = excluded.email,
    phone = excluded.phone,
    full_name = excluded.full_name,
    role = excluded.role,
    mechanic_id = excluded.mechanic_id,
    is_active = true,
    updated_at = timezone('utc', now())
  returning id into accepted_member_id;

  update public.workshop_member_invites
  set
    auth_user_id = current_auth_user_id,
    status = 'accepted',
    accepted_at = timezone('utc', now())
  where id = invitation.id;

  return accepted_member_id;
end;
$$;

comment on function public.accept_workshop_member_invite(uuid) is
  'Atomically accepts one pending invitation for auth.uid(); role and workshop are copied from the owner-created invitation and cannot be supplied by the caller.';

revoke all on function public.accept_workshop_member_invite(uuid) from public;
revoke all on function public.accept_workshop_member_invite(uuid)
  from anon, authenticated, service_role;
grant execute on function public.accept_workshop_member_invite(uuid) to authenticated;

alter table public.workshops enable row level security;
alter table public.workshop_members enable row level security;
alter table public.workshop_member_invites enable row level security;

drop policy if exists workshops_select_identity on public.workshops;
create policy workshops_select_identity
on public.workshops
for select
to authenticated
using (public.is_active_workshop_member(id));

drop policy if exists workshops_insert_own on public.workshops;
create policy workshops_insert_own
on public.workshops
for insert
to authenticated
with check (
  owner_auth_user_id = auth.uid()
  and nullif(lower(btrim(owner_email)), '') =
    nullif(lower(btrim(auth.jwt() ->> 'email')), '')
);

drop policy if exists workshops_update_owner_admin on public.workshops;
create policy workshops_update_owner_admin
on public.workshops
for update
to authenticated
using (public.workshop_role(id) in ('owner', 'admin'))
with check (public.workshop_role(id) in ('owner', 'admin'));

drop policy if exists workshop_members_select_owner_or_self on public.workshop_members;
create policy workshop_members_select_owner_or_self
on public.workshop_members
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.workshop_role(workshop_id) = 'owner'
);

drop policy if exists workshop_members_insert_owner on public.workshop_members;
create policy workshop_members_insert_owner
on public.workshop_members
for insert
to authenticated
with check (
  public.workshop_role(workshop_id) = 'owner'
  and (
    role <> 'owner'
    or exists (
      select 1
      from public.workshops as w
      where w.id = workshop_id
        and w.owner_auth_user_id = auth_user_id
    )
  )
);

drop policy if exists workshop_members_update_owner on public.workshop_members;
create policy workshop_members_update_owner
on public.workshop_members
for update
to authenticated
using (public.workshop_role(workshop_id) = 'owner')
with check (
  public.workshop_role(workshop_id) = 'owner'
  and (
    role <> 'owner'
    or exists (
      select 1
      from public.workshops as w
      where w.id = workshop_id
        and w.owner_auth_user_id = auth_user_id
    )
  )
);

drop policy if exists workshop_members_delete_owner on public.workshop_members;
create policy workshop_members_delete_owner
on public.workshop_members
for delete
to authenticated
using (public.workshop_role(workshop_id) = 'owner');

drop policy if exists workshop_member_invites_select_owner_or_recipient
  on public.workshop_member_invites;
create policy workshop_member_invites_select_owner_or_recipient
on public.workshop_member_invites
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.workshop_role(workshop_id) = 'owner'
);

drop policy if exists workshop_member_invites_insert_owner
  on public.workshop_member_invites;
create policy workshop_member_invites_insert_owner
on public.workshop_member_invites
for insert
to authenticated
with check (
  public.workshop_role(workshop_id) = 'owner'
  and role <> 'owner'
  and status = 'pending'
  and accepted_at is null
);

drop policy if exists workshop_member_invites_update_owner
  on public.workshop_member_invites;
create policy workshop_member_invites_update_owner
on public.workshop_member_invites
for update
to authenticated
using (public.workshop_role(workshop_id) = 'owner')
with check (
  public.workshop_role(workshop_id) = 'owner'
  and role <> 'owner'
);

drop policy if exists workshop_member_invites_delete_owner
  on public.workshop_member_invites;
create policy workshop_member_invites_delete_owner
on public.workshop_member_invites
for delete
to authenticated
using (public.workshop_role(workshop_id) = 'owner');

revoke all on table public.workshops from anon, authenticated;
revoke all on table public.workshop_members from anon, authenticated;
revoke all on table public.workshop_member_invites from anon, authenticated;

grant select on table public.workshops to authenticated;
grant insert (
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
  bay_count,
  logo_url,
  preferred_currency,
  public_description,
  public_address,
  public_contact_phone,
  public_contact_email,
  public_slug,
  public_services,
  profile_visibility,
  gallery_image_urls
) on table public.workshops to authenticated;
grant update (
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
  bay_count,
  logo_url,
  preferred_currency,
  public_description,
  public_address,
  public_contact_phone,
  public_contact_email,
  public_slug,
  public_services,
  profile_visibility,
  gallery_image_urls
) on table public.workshops to authenticated;

grant select on table public.workshop_members to authenticated;
grant insert (
  workshop_id,
  auth_user_id,
  email,
  phone,
  full_name,
  role,
  mechanic_id,
  is_active
) on table public.workshop_members to authenticated;
grant update (
  email,
  phone,
  full_name,
  role,
  mechanic_id,
  is_active
) on table public.workshop_members to authenticated;
grant delete on table public.workshop_members to authenticated;

grant select on table public.workshop_member_invites to authenticated;
grant insert (
  workshop_id,
  auth_user_id,
  full_name,
  role,
  email,
  phone,
  mechanic_id,
  invited_by_name,
  message
) on table public.workshop_member_invites to authenticated;
grant update (
  full_name,
  role,
  email,
  phone,
  mechanic_id,
  invited_by_name,
  message,
  status
) on table public.workshop_member_invites to authenticated;
grant delete on table public.workshop_member_invites to authenticated;
