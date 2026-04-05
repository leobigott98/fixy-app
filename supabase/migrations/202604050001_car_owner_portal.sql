create table if not exists public.owner_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  full_name text not null,
  email text,
  phone text not null,
  city text,
  avatar_url text,
  preferred_contact text not null default 'whatsapp',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint owner_profiles_preferred_contact_check
    check (preferred_contact in ('whatsapp', 'llamada', 'correo'))
);

create table if not exists public.owner_vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.owner_profiles(id) on delete cascade,
  nickname text,
  plate text,
  make text not null,
  model text not null,
  vehicle_year integer,
  color text,
  mileage integer,
  vin text,
  photo_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.owner_appointment_requests (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.owner_profiles(id) on delete cascade,
  owner_vehicle_id uuid references public.owner_vehicles(id) on delete set null,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  marketplace_inquiry_id uuid references public.marketplace_inquiries(id) on delete set null,
  requested_date date not null,
  requested_time time not null,
  service_needed text not null,
  issue_summary text not null,
  contact_channel text not null default 'whatsapp',
  status text not null default 'solicitada',
  workshop_response_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint owner_appointment_requests_contact_channel_check
    check (contact_channel in ('whatsapp', 'llamada', 'correo')),
  constraint owner_appointment_requests_status_check
    check (status in ('solicitada', 'confirmada', 'completada', 'cancelada'))
);

create table if not exists public.owner_service_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.owner_profiles(id) on delete cascade,
  owner_vehicle_id uuid not null references public.owner_vehicles(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete set null,
  workshop_name text not null,
  mechanic_name text,
  service_date date not null,
  delivered_at date,
  service_type text not null,
  description text not null,
  parts_used text[] not null default '{}',
  total_cost numeric(12,2) not null default 0,
  currency text not null default 'USD',
  duration_hours numeric(8,2),
  photo_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint owner_service_records_currency_check
    check (currency in ('USD', 'VES', 'USD_VES'))
);

alter table public.workshop_reviews
add column if not exists owner_profile_id uuid references public.owner_profiles(id) on delete set null;

alter table public.workshop_reviews
add column if not exists owner_vehicle_id uuid references public.owner_vehicles(id) on delete set null;

create index if not exists idx_owner_profiles_auth_user_id on public.owner_profiles(auth_user_id);
create index if not exists idx_owner_vehicles_owner_profile_id on public.owner_vehicles(owner_profile_id);
create index if not exists idx_owner_appointment_requests_owner_profile_id on public.owner_appointment_requests(owner_profile_id);
create index if not exists idx_owner_appointment_requests_workshop_id on public.owner_appointment_requests(workshop_id);
create index if not exists idx_owner_service_records_owner_profile_id on public.owner_service_records(owner_profile_id);
create index if not exists idx_owner_service_records_owner_vehicle_id on public.owner_service_records(owner_vehicle_id);

drop trigger if exists set_owner_profiles_updated_at on public.owner_profiles;
create trigger set_owner_profiles_updated_at
before update on public.owner_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_owner_vehicles_updated_at on public.owner_vehicles;
create trigger set_owner_vehicles_updated_at
before update on public.owner_vehicles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_owner_appointment_requests_updated_at on public.owner_appointment_requests;
create trigger set_owner_appointment_requests_updated_at
before update on public.owner_appointment_requests
for each row execute procedure public.set_updated_at();

drop trigger if exists set_owner_service_records_updated_at on public.owner_service_records;
create trigger set_owner_service_records_updated_at
before update on public.owner_service_records
for each row execute procedure public.set_updated_at();
