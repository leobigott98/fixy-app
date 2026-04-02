create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null unique,
  owner_name text not null,
  workshop_name text not null,
  whatsapp_phone text not null,
  city text not null,
  workshop_type text not null,
  opening_days text not null,
  opens_at time not null,
  closes_at time not null,
  opening_hours_label text not null,
  bay_count integer not null check (bay_count > 0),
  logo_url text,
  preferred_currency text not null default 'USD',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  full_name text not null,
  phone text,
  whatsapp_phone text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  vehicle_label text,
  plate text,
  make text,
  model text,
  vehicle_year integer,
  color text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  title text not null default 'Presupuesto',
  status text not null default 'draft',
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quotes_status_check check (status in ('draft', 'sent', 'approved', 'rejected'))
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  code text,
  title text not null default 'Orden de trabajo',
  vehicle_label text,
  status text not null default 'received',
  promised_date date,
  total_amount numeric(12,2) not null default 0,
  bay_slot integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint work_orders_status_check
    check (status in ('received', 'diagnosis', 'in_progress', 'waiting_parts', 'ready', 'delivered'))
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  paid_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_clients_workshop_id on public.clients(workshop_id);
create index if not exists idx_vehicles_workshop_id on public.vehicles(workshop_id);
create index if not exists idx_quotes_workshop_id on public.quotes(workshop_id);
create index if not exists idx_work_orders_workshop_id on public.work_orders(workshop_id);
create index if not exists idx_payments_workshop_id on public.payments(workshop_id);

drop trigger if exists set_workshops_updated_at on public.workshops;
create trigger set_workshops_updated_at
before update on public.workshops
for each row execute procedure public.set_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute procedure public.set_updated_at();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
before update on public.vehicles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
before update on public.quotes
for each row execute procedure public.set_updated_at();

drop trigger if exists set_work_orders_updated_at on public.work_orders;
create trigger set_work_orders_updated_at
before update on public.work_orders
for each row execute procedure public.set_updated_at();
