alter table if exists public.workshop_members
  alter column email drop not null;

alter table if exists public.workshop_members
  add column if not exists phone text,
  add column if not exists mechanic_id uuid references public.mechanics(id) on delete set null;

alter table if exists public.workshop_members
  drop constraint if exists workshop_members_role_check;

alter table if exists public.workshop_members
  add constraint workshop_members_role_check
    check (role in ('owner', 'admin', 'jefe_taller', 'recepcion', 'finanzas', 'mechanic'));

drop index if exists idx_workshop_members_email;
drop index if exists workshop_members_workshop_email_unique;
alter table if exists public.workshop_members
  drop constraint if exists workshop_members_workshop_email_unique;

create unique index if not exists idx_workshop_members_workshop_email_unique
  on public.workshop_members(workshop_id, email)
  where email is not null;

create unique index if not exists idx_workshop_members_workshop_phone_unique
  on public.workshop_members(workshop_id, phone)
  where phone is not null;

create index if not exists idx_workshop_members_email on public.workshop_members(email);
create index if not exists idx_workshop_members_phone on public.workshop_members(phone);
create index if not exists idx_workshop_members_mechanic_id on public.workshop_members(mechanic_id);

create table if not exists public.workshop_member_invites (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  full_name text not null,
  role text not null default 'mechanic',
  email text,
  phone text,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  invited_by_name text not null,
  message text,
  status text not null default 'pending',
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workshop_member_invites_role_check
    check (role in ('admin', 'jefe_taller', 'recepcion', 'finanzas', 'mechanic')),
  constraint workshop_member_invites_status_check
    check (status in ('pending', 'accepted', 'cancelled')),
  constraint workshop_member_invites_contact_check
    check (coalesce(nullif(email, ''), nullif(phone, '')) is not null)
);

create index if not exists idx_workshop_member_invites_workshop_id
  on public.workshop_member_invites(workshop_id);

create index if not exists idx_workshop_member_invites_email
  on public.workshop_member_invites(email);

create index if not exists idx_workshop_member_invites_phone
  on public.workshop_member_invites(phone);

drop trigger if exists set_workshop_member_invites_updated_at on public.workshop_member_invites;
create trigger set_workshop_member_invites_updated_at
before update on public.workshop_member_invites
for each row execute procedure public.set_updated_at();

alter table if exists public.appointments
  add column if not exists assigned_mechanic_id uuid references public.mechanics(id) on delete set null;

create index if not exists idx_appointments_assigned_mechanic_id
  on public.appointments(assigned_mechanic_id);
