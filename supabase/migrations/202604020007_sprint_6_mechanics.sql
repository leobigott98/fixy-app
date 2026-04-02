create table if not exists public.mechanics (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'mecanico',
  is_active boolean not null default true,
  notes text,
  photo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mechanics_role_check
    check (role in ('mecanico', 'jefe_taller', 'recepcion', 'admin', 'apoyo', 'otro'))
);

create index if not exists idx_mechanics_workshop_id on public.mechanics(workshop_id);
create index if not exists idx_mechanics_active on public.mechanics(workshop_id, is_active);

alter table if exists public.work_orders
  add column if not exists assigned_mechanic_id uuid references public.mechanics(id) on delete set null;

create index if not exists idx_work_orders_assigned_mechanic_id on public.work_orders(assigned_mechanic_id);
