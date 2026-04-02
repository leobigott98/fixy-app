alter table if exists public.work_orders
  add column if not exists completed_at timestamptz;

create index if not exists idx_work_orders_vehicle_completed_at
  on public.work_orders(vehicle_id, completed_at);
