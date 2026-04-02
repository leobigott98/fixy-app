create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  name text not null,
  description text,
  stock_quantity numeric(12,2) not null default 0,
  low_stock_threshold numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  reference_sale_price numeric(12,2) not null default 0,
  sku text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null,
  quantity_delta numeric(12,2) not null,
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint inventory_movements_movement_type_check
    check (movement_type in ('initial_stock', 'manual_adjustment', 'work_order_usage'))
);

alter table if exists public.quote_items
  add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete set null;

alter table if exists public.work_order_parts
  add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete set null;

create index if not exists idx_inventory_items_workshop_id on public.inventory_items(workshop_id);
create index if not exists idx_inventory_items_name on public.inventory_items(workshop_id, name);
create index if not exists idx_inventory_movements_inventory_item_id on public.inventory_movements(inventory_item_id);
create index if not exists idx_quote_items_inventory_item_id on public.quote_items(inventory_item_id);
create index if not exists idx_work_order_parts_inventory_item_id on public.work_order_parts(inventory_item_id);
