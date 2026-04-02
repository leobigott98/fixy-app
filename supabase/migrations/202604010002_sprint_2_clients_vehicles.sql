alter table if exists public.clients
  add column if not exists email text;

alter table if exists public.vehicles
  add column if not exists mileage integer,
  add column if not exists vin text;

create index if not exists idx_clients_email on public.clients(email);
create index if not exists idx_vehicles_client_id on public.vehicles(client_id);
create index if not exists idx_vehicles_plate on public.vehicles(plate);
