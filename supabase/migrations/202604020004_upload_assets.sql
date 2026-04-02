insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fixy-assets',
  'fixy-assets',
  true,
  10485760,
  array['image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table if exists public.payments
  add column if not exists proof_url text;

create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  photo_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.work_order_reference_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  photo_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_vehicle_photos_vehicle_id on public.vehicle_photos(vehicle_id);
create index if not exists idx_work_order_reference_photos_work_order_id on public.work_order_reference_photos(work_order_id);
