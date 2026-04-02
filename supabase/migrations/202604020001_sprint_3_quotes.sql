alter table if exists public.quotes
  add column if not exists subtotal numeric(12,2) not null default 0,
  add column if not exists notes text,
  add column if not exists sent_at timestamptz,
  add column if not exists approved_at timestamptz;

alter table if exists public.quotes
  drop constraint if exists quotes_status_check;

alter table if exists public.quotes
  add constraint quotes_status_check
    check (status in ('draft', 'sent', 'approved', 'rejected', 'expired'));

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  item_type text not null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint quote_items_item_type_check check (item_type in ('labor', 'part'))
);

create index if not exists idx_quote_items_quote_id on public.quote_items(quote_id);
create index if not exists idx_quote_items_workshop_id on public.quote_items(workshop_id);
