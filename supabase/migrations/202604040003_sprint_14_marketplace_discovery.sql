create table if not exists public.marketplace_inquiries (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  requester_name text not null,
  requester_phone text not null,
  requester_city text,
  requested_service text not null,
  vehicle_reference text,
  preferred_contact text not null default 'whatsapp',
  message text not null,
  source text not null default 'public_marketplace',
  status text not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_inquiries_preferred_contact_check
    check (preferred_contact in ('whatsapp', 'llamada')),
  constraint marketplace_inquiries_status_check
    check (status in ('new', 'contacted', 'closed'))
);

create table if not exists public.workshop_reviews (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  source text not null default 'fixy',
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  constraint workshop_reviews_status_check
    check (status in ('pending', 'approved', 'hidden'))
);

create index if not exists idx_marketplace_inquiries_workshop_id
  on public.marketplace_inquiries(workshop_id);

create index if not exists idx_marketplace_inquiries_status
  on public.marketplace_inquiries(status);

create index if not exists idx_workshop_reviews_workshop_id
  on public.workshop_reviews(workshop_id);

create index if not exists idx_workshop_reviews_status
  on public.workshop_reviews(status);

drop trigger if exists set_marketplace_inquiries_updated_at on public.marketplace_inquiries;
create trigger set_marketplace_inquiries_updated_at
before update on public.marketplace_inquiries
for each row execute procedure public.set_updated_at();
