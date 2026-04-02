create table if not exists public.expense_assets (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  asset_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_expense_assets_expense_id on public.expense_assets(expense_id);
create index if not exists idx_expense_assets_workshop_id on public.expense_assets(workshop_id);

alter table if exists public.quotes
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_quotes_archived_at on public.quotes(archived_at);
create index if not exists idx_quotes_deleted_at on public.quotes(deleted_at);
