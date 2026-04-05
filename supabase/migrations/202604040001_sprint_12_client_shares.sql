alter table public.quotes
  add column if not exists public_share_token uuid default gen_random_uuid(),
  add column if not exists public_share_enabled boolean not null default false,
  add column if not exists public_shared_at timestamptz;

alter table public.work_orders
  add column if not exists public_share_token uuid default gen_random_uuid(),
  add column if not exists public_share_enabled boolean not null default false,
  add column if not exists public_shared_at timestamptz;

update public.quotes
set public_share_token = gen_random_uuid()
where public_share_token is null;

update public.work_orders
set public_share_token = gen_random_uuid()
where public_share_token is null;

create unique index if not exists quotes_public_share_token_key
  on public.quotes(public_share_token);

create unique index if not exists work_orders_public_share_token_key
  on public.work_orders(public_share_token);
