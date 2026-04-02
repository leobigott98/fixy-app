alter table if exists public.payments
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists status text not null default 'paid',
  add column if not exists method text not null default 'cash',
  add column if not exists notes text;

alter table if exists public.payments
  drop constraint if exists payments_status_check;

alter table if exists public.payments
  add constraint payments_status_check
    check (status in ('pending', 'partial', 'paid', 'overdue', 'cancelled'));

alter table if exists public.payments
  drop constraint if exists payments_method_check;

alter table if exists public.payments
  add constraint payments_method_check
    check (method in ('cash', 'bank_transfer', 'pago_movil', 'zelle', 'card', 'other'));

update public.payments
set client_id = work_orders.client_id
from public.work_orders
where payments.work_order_id = work_orders.id
  and payments.client_id is null;

update public.payments
set client_id = quotes.client_id
from public.quotes
where payments.quote_id = quotes.id
  and payments.client_id is null;

create index if not exists idx_payments_client_id on public.payments(client_id);
create index if not exists idx_payments_work_order_id on public.payments(work_order_id);
create index if not exists idx_payments_paid_at on public.payments(paid_at);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  amount numeric(12,2) not null default 0,
  category text not null,
  spent_at date not null default current_date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint expenses_category_check
    check (category in ('repuestos', 'nomina', 'servicios', 'transporte', 'herramientas', 'operacion', 'other'))
);

create index if not exists idx_expenses_workshop_id on public.expenses(workshop_id);
create index if not exists idx_expenses_work_order_id on public.expenses(work_order_id);
create index if not exists idx_expenses_spent_at on public.expenses(spent_at);
