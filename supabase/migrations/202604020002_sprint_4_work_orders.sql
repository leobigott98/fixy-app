alter table if exists public.work_orders
  add column if not exists assigned_mechanic_name text,
  add column if not exists notes text;

alter table if exists public.work_orders
  drop constraint if exists work_orders_status_check;

alter table if exists public.work_orders
  add constraint work_orders_status_check
    check (
      status in (
        'presupuesto_pendiente',
        'diagnostico_pendiente',
        'en_reparacion',
        'listo_para_entrega',
        'completada',
        'cancelada'
      )
    );

create table if not exists public.work_order_services (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.work_order_parts (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.work_order_status_history (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_work_order_services_work_order_id on public.work_order_services(work_order_id);
create index if not exists idx_work_order_parts_work_order_id on public.work_order_parts(work_order_id);
create index if not exists idx_work_order_status_history_work_order_id on public.work_order_status_history(work_order_id);
