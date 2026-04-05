alter table public.workshops
  add column if not exists public_description text,
  add column if not exists public_address text,
  add column if not exists public_contact_phone text,
  add column if not exists public_contact_email text,
  add column if not exists public_slug text,
  add column if not exists public_services text[] not null default '{}',
  add column if not exists profile_visibility text not null default 'private',
  add column if not exists verification_status text not null default 'not_requested';

create unique index if not exists idx_workshops_public_slug_unique
  on public.workshops(public_slug)
  where public_slug is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workshops_profile_visibility_check'
  ) then
    alter table public.workshops
      add constraint workshops_profile_visibility_check
      check (profile_visibility in ('private', 'public'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'workshops_verification_status_check'
  ) then
    alter table public.workshops
      add constraint workshops_verification_status_check
      check (verification_status in ('not_requested', 'pending', 'verified'));
  end if;
end
$$;
