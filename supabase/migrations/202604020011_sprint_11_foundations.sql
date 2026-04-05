create table if not exists public.workshop_members (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'mechanic',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workshop_members_role_check check (role in ('owner', 'admin', 'mechanic')),
  constraint workshop_members_workshop_email_unique unique (workshop_id, email)
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint commissions_status_check check (status in ('pending', 'calculated', 'paid', 'cancelled'))
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  code text,
  status text not null default 'draft',
  ordered_at date not null default current_date,
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint purchase_orders_status_check check (status in ('draft', 'sent', 'received', 'cancelled'))
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_cost numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_workshop_members_workshop_id on public.workshop_members(workshop_id);
create index if not exists idx_workshop_members_email on public.workshop_members(email);
create index if not exists idx_commissions_workshop_id on public.commissions(workshop_id);
create index if not exists idx_suppliers_workshop_id on public.suppliers(workshop_id);
create index if not exists idx_purchase_orders_workshop_id on public.purchase_orders(workshop_id);
create index if not exists idx_purchase_orders_supplier_id on public.purchase_orders(supplier_id);
create index if not exists idx_purchase_order_items_purchase_order_id on public.purchase_order_items(purchase_order_id);

drop trigger if exists set_workshop_members_updated_at on public.workshop_members;
create trigger set_workshop_members_updated_at
before update on public.workshop_members
for each row execute procedure public.set_updated_at();

drop trigger if exists set_commissions_updated_at on public.commissions;
create trigger set_commissions_updated_at
before update on public.commissions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute procedure public.set_updated_at();

drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at
before update on public.purchase_orders
for each row execute procedure public.set_updated_at();
