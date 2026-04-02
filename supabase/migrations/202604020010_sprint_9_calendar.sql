create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  appointment_date date not null,
  appointment_time time not null,
  appointment_type text not null,
  status text not null default 'pendiente',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint appointments_type_check check (appointment_type in ('ingreso_servicio', 'visita_taller')),
  constraint appointments_status_check check (status in ('pendiente', 'confirmada', 'completada', 'cancelada'))
);

create index if not exists idx_appointments_workshop_date on public.appointments(workshop_id, appointment_date, appointment_time);
create index if not exists idx_appointments_client_id on public.appointments(client_id);
create index if not exists idx_appointments_vehicle_id on public.appointments(vehicle_id);

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
before update on public.appointments
for each row execute procedure public.set_updated_at();
