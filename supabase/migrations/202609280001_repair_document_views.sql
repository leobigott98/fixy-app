-- One commercial source per repair, immutable issued revisions, and explicit
-- cost/sale separation for the three repair-document audiences.

alter table public.workshops
  add column if not exists tax_id text,
  add column if not exists document_terms text,
  add column if not exists warranty_terms text,
  add column if not exists default_quote_validity_days integer,
  add column if not exists default_tax_label text,
  add column if not exists default_tax_rate numeric(7,4);

alter table public.workshops
  drop constraint if exists workshops_default_quote_validity_days_check;
alter table public.workshops
  add constraint workshops_default_quote_validity_days_check
    check (default_quote_validity_days is null or default_quote_validity_days between 1 and 365);

alter table public.workshops
  drop constraint if exists workshops_default_tax_rate_check;
alter table public.workshops
  add constraint workshops_default_tax_rate_check
    check (default_tax_rate is null or default_tax_rate between 0 and 100);

alter table public.inventory_items
  alter column cost drop not null,
  alter column cost drop default;

alter table public.quotes
  add column if not exists document_number text,
  add column if not exists version integer not null default 1,
  add column if not exists issued_at timestamptz,
  add column if not exists valid_until date,
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists tax_status text not null default 'pending',
  add column if not exists tax_label text,
  add column if not exists tax_rate numeric(7,4),
  add column if not exists tax_amount numeric(12,2);

alter table public.quotes
  drop constraint if exists quotes_version_check;
alter table public.quotes
  add constraint quotes_version_check check (version > 0);

alter table public.quotes
  drop constraint if exists quotes_discount_amount_check;
alter table public.quotes
  add constraint quotes_discount_amount_check check (discount_amount >= 0);

alter table public.quotes
  drop constraint if exists quotes_tax_status_check;
alter table public.quotes
  add constraint quotes_tax_status_check
    check (tax_status in ('pending', 'applied', 'not_applicable'));

alter table public.quotes
  drop constraint if exists quotes_tax_rate_check;
alter table public.quotes
  add constraint quotes_tax_rate_check
    check (tax_rate is null or tax_rate between 0 and 100);

create unique index if not exists idx_quotes_document_number_per_workshop
  on public.quotes(workshop_id, document_number)
  where document_number is not null;

alter table public.quote_items
  add column if not exists work_group text not null default 'Trabajo general',
  add column if not exists unit_label text not null default 'unidad',
  add column if not exists unit_cost numeric(12,2),
  add column if not exists cost_source text,
  add column if not exists cost_captured_at timestamptz;

alter table public.quote_items
  drop constraint if exists quote_items_unit_cost_check;
alter table public.quote_items
  add constraint quote_items_unit_cost_check check (unit_cost is null or unit_cost >= 0);

create table if not exists public.quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  version integer not null,
  status text not null,
  snapshot jsonb not null,
  issued_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint quote_revisions_version_check check (version > 0),
  constraint quote_revisions_status_check check (status in ('sent', 'approved')),
  constraint quote_revisions_quote_version_unique unique (quote_id, version)
);

create index if not exists idx_quote_revisions_workshop_id
  on public.quote_revisions(workshop_id);

alter table public.work_orders
  add column if not exists quote_revision_id uuid references public.quote_revisions(id) on delete restrict,
  add column if not exists quote_version integer,
  add column if not exists quote_document_number text,
  add column if not exists plate_snapshot text,
  add column if not exists mileage_snapshot integer;

alter table public.work_order_services
  add column if not exists source_quote_item_id uuid references public.quote_items(id) on delete set null,
  add column if not exists work_group text not null default 'Trabajo general',
  add column if not exists unit_label text not null default 'servicio',
  add column if not exists unit_cost numeric(12,2);

alter table public.work_order_parts
  add column if not exists source_quote_item_id uuid references public.quote_items(id) on delete set null,
  add column if not exists work_group text not null default 'Trabajo general',
  add column if not exists unit_label text not null default 'unidad',
  add column if not exists unit_cost numeric(12,2);

alter table public.work_order_services
  drop constraint if exists work_order_services_unit_cost_check;
alter table public.work_order_services
  add constraint work_order_services_unit_cost_check check (unit_cost is null or unit_cost >= 0);

alter table public.work_order_parts
  drop constraint if exists work_order_parts_unit_cost_check;
alter table public.work_order_parts
  add constraint work_order_parts_unit_cost_check check (unit_cost is null or unit_cost >= 0);

-- Finanzas usa esta proyección incluso antes de necesitar acceso operativo a
-- la tabla base. Se conservan primero las columnas históricas de la vista y
-- se agregan al final solo datos de seguimiento no sensibles para compatibilidad.
create or replace view public.operation_work_order_financials
with (security_barrier = true)
as
select
  wo.id,
  wo.workshop_id,
  wo.client_id,
  wo.vehicle_id,
  wo.quote_id,
  wo.code,
  wo.title,
  wo.vehicle_label,
  wo.status,
  wo.promised_date,
  wo.completed_at,
  wo.total_amount,
  wo.created_at,
  wo.updated_at,
  wo.assigned_mechanic_id,
  wo.assigned_mechanic_name,
  wo.notes,
  wo.quote_version,
  wo.quote_document_number,
  wo.plate_snapshot,
  wo.mileage_snapshot
from public.work_orders as wo
where public.workshop_role(wo.workshop_id) in ('owner', 'admin', 'finanzas');

revoke all on table public.operation_work_order_financials from public, anon, authenticated;
grant select on table public.operation_work_order_financials to authenticated;

alter table public.quote_revisions enable row level security;

drop policy if exists quote_revisions_select_internal on public.quote_revisions;
create policy quote_revisions_select_internal on public.quote_revisions
for select to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
);

drop policy if exists quote_revisions_insert_quote_managers on public.quote_revisions;
create policy quote_revisions_insert_quote_managers on public.quote_revisions
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
);

drop policy if exists quote_revisions_update_quote_managers on public.quote_revisions;
create policy quote_revisions_update_quote_managers on public.quote_revisions
for update to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
)
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
);

revoke all on table public.quote_revisions from public, anon, authenticated;
grant select, insert, update on table public.quote_revisions to authenticated;

-- Keep internal amounts out of mechanic/reception network responses even when
-- a caller addresses PostgREST directly. Internal readers use the guarded view.
revoke select on table public.quote_items from authenticated;
grant select (
  id, quote_id, workshop_id, inventory_item_id, item_type, description,
  work_group, quantity, unit_label, unit_price, line_total, sort_order, created_at
) on table public.quote_items to authenticated;

drop policy if exists work_orders_select_authorized on public.work_orders;
create policy work_orders_select_authorized on public.work_orders
for select to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion', 'finanzas'));

create or replace view public.operation_mechanic_work_orders
with (security_barrier = true)
as
select
  wo.id, wo.workshop_id, wo.quote_id, wo.code, wo.title, wo.vehicle_label,
  wo.status, wo.promised_date, wo.assigned_mechanic_id, wo.assigned_mechanic_name,
  wo.notes, wo.quote_version, wo.quote_document_number, wo.plate_snapshot, wo.mileage_snapshot,
  wo.created_at, wo.updated_at
from public.work_orders as wo
where public.workshop_role(wo.workshop_id) = 'mechanic'
  and wo.assigned_mechanic_id = public.current_workshop_mechanic_id(wo.workshop_id);

revoke all on table public.operation_mechanic_work_orders from public, anon, authenticated;
grant select on table public.operation_mechanic_work_orders to authenticated;

create or replace view public.operation_quote_options
with (security_barrier = true)
as
select
  q.id, q.workshop_id, q.client_id, q.vehicle_id, q.title, q.status,
  q.total_amount, q.approved_at, q.document_number, q.version
from public.quotes as q
where public.workshop_role(q.workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion');

revoke all on table public.operation_quote_options from public, anon, authenticated;
grant select on table public.operation_quote_options to authenticated;

revoke select on table public.work_order_services from authenticated;
grant select (
  id, work_order_id, workshop_id, source_quote_item_id, description,
  work_group, quantity, unit_label, sort_order, created_at
) on table public.work_order_services to authenticated;

revoke select on table public.work_order_parts from authenticated;
grant select (
  id, work_order_id, workshop_id, inventory_item_id, source_quote_item_id,
  description, work_group, quantity, unit_label, sort_order, created_at
) on table public.work_order_parts to authenticated;

create or replace view public.operation_work_order_service_financials
with (security_barrier = true)
as
select s.id, s.work_order_id, s.workshop_id, s.source_quote_item_id,
  s.description, s.work_group, s.quantity, s.unit_label, s.unit_price,
  s.line_total, s.sort_order, s.created_at
from public.work_order_services as s
where public.workshop_role(s.workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion', 'finanzas');

create or replace view public.operation_work_order_part_financials
with (security_barrier = true)
as
select p.id, p.work_order_id, p.workshop_id, p.inventory_item_id,
  p.source_quote_item_id, p.description, p.work_group, p.quantity,
  p.unit_label, p.unit_price, p.line_total, p.sort_order, p.created_at
from public.work_order_parts as p
where public.workshop_role(p.workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion', 'finanzas');

revoke all on table public.operation_work_order_service_financials from public, anon, authenticated;
revoke all on table public.operation_work_order_part_financials from public, anon, authenticated;
grant select on table public.operation_work_order_service_financials to authenticated;
grant select on table public.operation_work_order_part_financials to authenticated;

create or replace view public.internal_quote_item_costs
with (security_barrier = true)
as
select
  qi.id,
  qi.quote_id,
  qi.workshop_id,
  qi.item_type,
  qi.unit_cost,
  qi.cost_source,
  qi.cost_captured_at
from public.quote_items as qi
where public.workshop_role(qi.workshop_id) in ('owner', 'admin', 'finanzas');

revoke all on table public.internal_quote_item_costs from public, anon, authenticated;
grant select on table public.internal_quote_item_costs to authenticated;

comment on view public.internal_quote_item_costs is
  'Cost-only quote projection restricted to owner, admin and finance roles.';

comment on table public.quote_revisions is
  'Immutable issued quote snapshots. Client-impacting edits create a new quote version; accepted versions are never overwritten.';
comment on column public.quote_items.unit_cost is
  'Applied direct unit cost snapshot. NULL means unknown; zero is an explicit known zero cost.';
comment on column public.work_order_services.unit_cost is
  'Applied mechanic/direct labor unit cost snapshot. Never expose through mechanic projections.';
comment on column public.work_order_parts.unit_cost is
  'Applied material unit cost snapshot. Never expose through mechanic projections.';
