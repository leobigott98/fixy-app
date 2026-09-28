-- Security group: OPERACION.
-- Depends on 202609230001_identity_policy_foundation.sql and
-- 202609230002_identity_membership_rls.sql.

create or replace function public.current_workshop_mechanic_id(target_workshop_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select wm.mechanic_id
  from public.workshop_members as wm
  join public.mechanics as m
    on m.id = wm.mechanic_id
   and m.workshop_id = wm.workshop_id
  where wm.workshop_id = target_workshop_id
    and wm.auth_user_id = auth.uid()
    and wm.is_active
    and wm.role = 'mechanic'
  limit 1;
$$;

comment on function public.current_workshop_mechanic_id(uuid) is
  'Returns the mechanic linked to the active auth.uid() membership, after validating that the mechanic belongs to the same workshop.';

create or replace function public.operation_relations_valid(
  target_workshop_id uuid,
  target_client_id uuid default null,
  target_vehicle_id uuid default null,
  target_quote_id uuid default null,
  target_mechanic_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.workshop_role(target_workshop_id) is not null
    and (
      target_client_id is null
      or exists (
        select 1
        from public.clients as c
        where c.id = target_client_id
          and c.workshop_id = target_workshop_id
      )
    )
    and (
      target_vehicle_id is null
      or exists (
        select 1
        from public.vehicles as v
        where v.id = target_vehicle_id
          and v.workshop_id = target_workshop_id
          and (target_client_id is null or v.client_id = target_client_id)
      )
    )
    and (
      target_quote_id is null
      or exists (
        select 1
        from public.quotes as q
        where q.id = target_quote_id
          and q.workshop_id = target_workshop_id
          and (target_client_id is null or q.client_id = target_client_id)
          and (target_vehicle_id is null or q.vehicle_id = target_vehicle_id)
      )
    )
    and (
      target_mechanic_id is null
      or exists (
        select 1
        from public.mechanics as m
        where m.id = target_mechanic_id
          and m.workshop_id = target_workshop_id
          and m.is_active
      )
    );
$$;

comment on function public.operation_relations_valid(uuid, uuid, uuid, uuid, uuid) is
  'Validates optional operation FKs against one workshop. It only answers for a workshop in which auth.uid() has an active role.';

create or replace function public.operation_quote_belongs_to_workshop(
  target_quote_id uuid,
  target_workshop_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.workshop_role(target_workshop_id) is not null
    and exists (
      select 1
      from public.quotes as q
      where q.id = target_quote_id
        and q.workshop_id = target_workshop_id
    );
$$;

create or replace function public.operation_work_order_belongs_to_workshop(
  target_work_order_id uuid,
  target_workshop_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.workshop_role(target_workshop_id) is not null
    and exists (
      select 1
      from public.work_orders as wo
      where wo.id = target_work_order_id
        and wo.workshop_id = target_workshop_id
    );
$$;

create or replace function public.operation_vehicle_belongs_to_workshop(
  target_vehicle_id uuid,
  target_workshop_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.workshop_role(target_workshop_id) is not null
    and exists (
      select 1
      from public.vehicles as v
      where v.id = target_vehicle_id
        and v.workshop_id = target_workshop_id
    );
$$;

revoke all on function public.current_workshop_mechanic_id(uuid) from public;
revoke all on function public.operation_relations_valid(uuid, uuid, uuid, uuid, uuid) from public;
revoke all on function public.operation_quote_belongs_to_workshop(uuid, uuid) from public;
revoke all on function public.operation_work_order_belongs_to_workshop(uuid, uuid) from public;
revoke all on function public.operation_vehicle_belongs_to_workshop(uuid, uuid) from public;
revoke all on function public.current_workshop_mechanic_id(uuid) from anon, authenticated, service_role;
revoke all on function public.operation_relations_valid(uuid, uuid, uuid, uuid, uuid) from anon, authenticated, service_role;
revoke all on function public.operation_quote_belongs_to_workshop(uuid, uuid) from anon, authenticated, service_role;
revoke all on function public.operation_work_order_belongs_to_workshop(uuid, uuid) from anon, authenticated, service_role;
revoke all on function public.operation_vehicle_belongs_to_workshop(uuid, uuid) from anon, authenticated, service_role;
grant execute on function public.current_workshop_mechanic_id(uuid) to authenticated;
grant execute on function public.operation_relations_valid(uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.operation_quote_belongs_to_workshop(uuid, uuid) to authenticated;
grant execute on function public.operation_work_order_belongs_to_workshop(uuid, uuid) to authenticated;
grant execute on function public.operation_vehicle_belongs_to_workshop(uuid, uuid) to authenticated;

alter table public.clients enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_services enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.work_order_status_history enable row level security;
alter table public.work_order_reference_photos enable row level security;
alter table public.appointments enable row level security;
alter table public.mechanics enable row level security;
alter table public.marketplace_inquiries enable row level security;

drop policy if exists clients_select_authorized on public.clients;
create policy clients_select_authorized on public.clients
for select to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'));

drop policy if exists clients_insert_authorized on public.clients;
create policy clients_insert_authorized on public.clients
for insert to authenticated
with check (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'));

drop policy if exists clients_update_authorized on public.clients;
create policy clients_update_authorized on public.clients
for update to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'))
with check (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'));

drop policy if exists clients_delete_owner_admin on public.clients;
create policy clients_delete_owner_admin on public.clients
for delete to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin'));

drop policy if exists vehicles_select_authorized on public.vehicles;
create policy vehicles_select_authorized on public.vehicles
for select to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'));

drop policy if exists vehicles_insert_authorized on public.vehicles;
create policy vehicles_insert_authorized on public.vehicles
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_relations_valid(workshop_id, client_id)
);

drop policy if exists vehicles_update_authorized on public.vehicles;
create policy vehicles_update_authorized on public.vehicles
for update to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'))
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_relations_valid(workshop_id, client_id)
);

drop policy if exists vehicles_delete_owner_admin on public.vehicles;
create policy vehicles_delete_owner_admin on public.vehicles
for delete to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin'));

drop policy if exists vehicle_photos_select_authorized on public.vehicle_photos;
create policy vehicle_photos_select_authorized on public.vehicle_photos
for select to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_vehicle_belongs_to_workshop(vehicle_id, workshop_id)
);

drop policy if exists vehicle_photos_insert_authorized on public.vehicle_photos;
create policy vehicle_photos_insert_authorized on public.vehicle_photos
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_vehicle_belongs_to_workshop(vehicle_id, workshop_id)
);

drop policy if exists vehicle_photos_update_authorized on public.vehicle_photos;
create policy vehicle_photos_update_authorized on public.vehicle_photos
for update to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_vehicle_belongs_to_workshop(vehicle_id, workshop_id)
)
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_vehicle_belongs_to_workshop(vehicle_id, workshop_id)
);

drop policy if exists vehicle_photos_delete_authorized on public.vehicle_photos;
create policy vehicle_photos_delete_authorized on public.vehicle_photos
for delete to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_vehicle_belongs_to_workshop(vehicle_id, workshop_id)
);

drop policy if exists quotes_select_authorized on public.quotes;
create policy quotes_select_authorized on public.quotes
for select to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'));

drop policy if exists quotes_insert_authorized on public.quotes;
create policy quotes_insert_authorized on public.quotes
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_relations_valid(workshop_id, client_id, vehicle_id)
);

drop policy if exists quotes_update_authorized on public.quotes;
create policy quotes_update_authorized on public.quotes
for update to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'))
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_relations_valid(workshop_id, client_id, vehicle_id)
);

drop policy if exists quotes_delete_owner_admin on public.quotes;
create policy quotes_delete_owner_admin on public.quotes
for delete to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin'));

drop policy if exists quote_items_select_authorized on public.quote_items;
create policy quote_items_select_authorized on public.quote_items
for select to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
);

drop policy if exists quote_items_insert_authorized on public.quote_items;
create policy quote_items_insert_authorized on public.quote_items
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
);

drop policy if exists quote_items_update_authorized on public.quote_items;
create policy quote_items_update_authorized on public.quote_items
for update to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
)
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
);

drop policy if exists quote_items_delete_authorized on public.quote_items;
create policy quote_items_delete_authorized on public.quote_items
for delete to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas')
  and public.operation_quote_belongs_to_workshop(quote_id, workshop_id)
);

drop policy if exists mechanics_select_authorized on public.mechanics;
create policy mechanics_select_authorized on public.mechanics
for select to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  or id = public.current_workshop_mechanic_id(workshop_id)
);

drop policy if exists mechanics_insert_authorized on public.mechanics;
create policy mechanics_insert_authorized on public.mechanics
for insert to authenticated
with check (public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller'));

drop policy if exists mechanics_update_authorized on public.mechanics;
create policy mechanics_update_authorized on public.mechanics
for update to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller'))
with check (public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller'));

drop policy if exists mechanics_delete_owner_admin on public.mechanics;
create policy mechanics_delete_owner_admin on public.mechanics
for delete to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin'));

drop policy if exists work_orders_select_authorized on public.work_orders;
create policy work_orders_select_authorized on public.work_orders
for select to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  or (
    public.workshop_role(workshop_id) = 'mechanic'
    and assigned_mechanic_id = public.current_workshop_mechanic_id(workshop_id)
  )
);

drop policy if exists work_orders_insert_authorized on public.work_orders;
create policy work_orders_insert_authorized on public.work_orders
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_relations_valid(
    workshop_id,
    client_id,
    vehicle_id,
    quote_id,
    assigned_mechanic_id
  )
);

drop policy if exists work_orders_update_authorized on public.work_orders;
create policy work_orders_update_authorized on public.work_orders
for update to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion'))
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_relations_valid(
    workshop_id,
    client_id,
    vehicle_id,
    quote_id,
    assigned_mechanic_id
  )
);

drop policy if exists work_orders_delete_owner_admin on public.work_orders;
create policy work_orders_delete_owner_admin on public.work_orders
for delete to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin'));

drop policy if exists work_order_services_select_authorized on public.work_order_services;
create policy work_order_services_select_authorized on public.work_order_services
for select to authenticated
using (
  public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
  and (
    public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
    or exists (
      select 1 from public.work_orders as wo
      where wo.id = work_order_id
        and wo.workshop_id = workshop_id
        and wo.assigned_mechanic_id = public.current_workshop_mechanic_id(workshop_id)
    )
  )
);

drop policy if exists work_order_services_insert_authorized on public.work_order_services;
create policy work_order_services_insert_authorized on public.work_order_services
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists work_order_services_update_authorized on public.work_order_services;
create policy work_order_services_update_authorized on public.work_order_services
for update to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
)
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists work_order_services_delete_authorized on public.work_order_services;
create policy work_order_services_delete_authorized on public.work_order_services
for delete to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists work_order_parts_select_authorized on public.work_order_parts;
create policy work_order_parts_select_authorized on public.work_order_parts
for select to authenticated
using (
  public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
  and (
    public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
    or exists (
      select 1 from public.work_orders as wo
      where wo.id = work_order_id
        and wo.workshop_id = workshop_id
        and wo.assigned_mechanic_id = public.current_workshop_mechanic_id(workshop_id)
    )
  )
);

drop policy if exists work_order_parts_insert_authorized on public.work_order_parts;
create policy work_order_parts_insert_authorized on public.work_order_parts
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists work_order_parts_update_authorized on public.work_order_parts;
create policy work_order_parts_update_authorized on public.work_order_parts
for update to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
)
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists work_order_parts_delete_authorized on public.work_order_parts;
create policy work_order_parts_delete_authorized on public.work_order_parts
for delete to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists work_order_status_history_select_authorized on public.work_order_status_history;
create policy work_order_status_history_select_authorized on public.work_order_status_history
for select to authenticated
using (
  public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
  and (
    public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
    or exists (
      select 1 from public.work_orders as wo
      where wo.id = work_order_id
        and wo.workshop_id = workshop_id
        and wo.assigned_mechanic_id = public.current_workshop_mechanic_id(workshop_id)
    )
  )
);

drop policy if exists work_order_status_history_insert_authorized on public.work_order_status_history;
create policy work_order_status_history_insert_authorized on public.work_order_status_history
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
  and exists (
    select 1 from public.work_orders as wo
    where wo.id = work_order_id
      and wo.workshop_id = workshop_id
      and wo.status = to_status
  )
);

drop policy if exists work_order_reference_photos_select_authorized on public.work_order_reference_photos;
create policy work_order_reference_photos_select_authorized on public.work_order_reference_photos
for select to authenticated
using (
  public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
  and (
    public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
    or exists (
      select 1 from public.work_orders as wo
      where wo.id = work_order_id
        and wo.workshop_id = workshop_id
        and wo.assigned_mechanic_id = public.current_workshop_mechanic_id(workshop_id)
    )
  )
);

drop policy if exists work_order_reference_photos_insert_authorized on public.work_order_reference_photos;
create policy work_order_reference_photos_insert_authorized on public.work_order_reference_photos
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists work_order_reference_photos_update_authorized on public.work_order_reference_photos;
create policy work_order_reference_photos_update_authorized on public.work_order_reference_photos
for update to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
)
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists work_order_reference_photos_delete_authorized on public.work_order_reference_photos;
create policy work_order_reference_photos_delete_authorized on public.work_order_reference_photos
for delete to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_work_order_belongs_to_workshop(work_order_id, workshop_id)
);

drop policy if exists appointments_select_authorized on public.appointments;
create policy appointments_select_authorized on public.appointments
for select to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion', 'finanzas')
  or (
    public.workshop_role(workshop_id) = 'mechanic'
    and assigned_mechanic_id = public.current_workshop_mechanic_id(workshop_id)
  )
);

drop policy if exists appointments_insert_authorized on public.appointments;
create policy appointments_insert_authorized on public.appointments
for insert to authenticated
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_relations_valid(
    workshop_id,
    client_id,
    vehicle_id,
    null,
    assigned_mechanic_id
  )
);

drop policy if exists appointments_update_authorized on public.appointments;
create policy appointments_update_authorized on public.appointments
for update to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion'))
with check (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion')
  and public.operation_relations_valid(
    workshop_id,
    client_id,
    vehicle_id,
    null,
    assigned_mechanic_id
  )
);

drop policy if exists appointments_delete_authorized on public.appointments;
create policy appointments_delete_authorized on public.appointments
for delete to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion'));

drop policy if exists marketplace_inquiries_select_authorized on public.marketplace_inquiries;
create policy marketplace_inquiries_select_authorized on public.marketplace_inquiries
for select to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion', 'finanzas'));

drop policy if exists marketplace_inquiries_update_authorized on public.marketplace_inquiries;
create policy marketplace_inquiries_update_authorized on public.marketplace_inquiries
for update to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion'))
with check (public.workshop_role(workshop_id) in ('owner', 'admin', 'recepcion'));

drop policy if exists marketplace_inquiries_delete_owner_admin on public.marketplace_inquiries;
create policy marketplace_inquiries_delete_owner_admin on public.marketplace_inquiries
for delete to authenticated
using (public.workshop_role(workshop_id) in ('owner', 'admin'));

-- The private mechanic view is deliberately explicit. Reception can use the
-- base table's safe columns for selectors, but phone and notes only appear here
-- for management roles or the linked mechanic's own profile.
create or replace view public.operation_mechanic_profiles
with (security_barrier = true)
as
select
  m.id,
  m.workshop_id,
  m.full_name,
  m.phone,
  m.role,
  m.is_active,
  m.notes,
  m.photo_url,
  m.created_at,
  m.updated_at
from public.mechanics as m
where
  public.workshop_role(m.workshop_id) in ('owner', 'admin', 'jefe_taller')
  or m.id = public.current_workshop_mechanic_id(m.workshop_id);

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
  wo.updated_at
from public.work_orders as wo
where public.workshop_role(wo.workshop_id) in ('owner', 'admin', 'finanzas');

-- Work-order and appointment forms are available to jefe_taller, while the
-- base client, vehicle and quote rows are not. These projections expose only
-- the relationship keys and labels needed to validate and populate selectors.
create or replace view public.operation_client_options
with (security_barrier = true)
as
select
  c.id,
  c.workshop_id,
  c.full_name,
  case
    when public.workshop_role(c.workshop_id) in ('owner', 'admin', 'recepcion')
      then c.whatsapp_phone
    else null::text
  end as whatsapp_phone
from public.clients as c
where public.workshop_role(c.workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion');

create or replace view public.operation_vehicle_options
with (security_barrier = true)
as
select
  v.id,
  v.workshop_id,
  v.client_id,
  v.vehicle_label,
  v.plate,
  v.make,
  v.model,
  v.vehicle_year,
  v.updated_at
from public.vehicles as v
where public.workshop_role(v.workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion');

create or replace view public.operation_quote_options
with (security_barrier = true)
as
select
  q.id,
  q.workshop_id,
  q.client_id,
  q.vehicle_id,
  q.title,
  q.status,
  q.total_amount,
  q.approved_at
from public.quotes as q
where public.workshop_role(q.workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion');

revoke all on table public.clients from anon, authenticated;
revoke all on table public.vehicles from anon, authenticated;
revoke all on table public.vehicle_photos from anon, authenticated;
revoke all on table public.quotes from anon, authenticated;
revoke all on table public.quote_items from anon, authenticated;
revoke all on table public.work_orders from anon, authenticated;
revoke all on table public.work_order_services from anon, authenticated;
revoke all on table public.work_order_parts from anon, authenticated;
revoke all on table public.work_order_status_history from anon, authenticated;
revoke all on table public.work_order_reference_photos from anon, authenticated;
revoke all on table public.appointments from anon, authenticated;
revoke all on table public.mechanics from anon, authenticated;
revoke all on table public.marketplace_inquiries from anon, authenticated;
revoke all on table public.operation_mechanic_profiles from public, anon, authenticated;
revoke all on table public.operation_work_order_financials from public, anon, authenticated;
revoke all on table public.operation_client_options from public, anon, authenticated;
revoke all on table public.operation_vehicle_options from public, anon, authenticated;
revoke all on table public.operation_quote_options from public, anon, authenticated;

grant select, insert, update, delete on table public.clients to authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.vehicle_photos to authenticated;
grant select, insert, update, delete on table public.quotes to authenticated;
grant select, insert, update, delete on table public.quote_items to authenticated;
grant select, insert, update, delete on table public.work_orders to authenticated;
grant select, insert, update, delete on table public.work_order_services to authenticated;
grant select, insert, update, delete on table public.work_order_parts to authenticated;
grant select, insert on table public.work_order_status_history to authenticated;
grant select, insert, update, delete on table public.work_order_reference_photos to authenticated;
grant select, insert, update, delete on table public.appointments to authenticated;
grant select, delete on table public.marketplace_inquiries to authenticated;
grant update (status) on table public.marketplace_inquiries to authenticated;

grant select (
  id,
  workshop_id,
  full_name,
  role,
  is_active,
  photo_url,
  created_at,
  updated_at
) on table public.mechanics to authenticated;
grant insert (
  workshop_id,
  full_name,
  phone,
  role,
  is_active,
  notes,
  photo_url
) on table public.mechanics to authenticated;
grant update (
  full_name,
  phone,
  role,
  is_active,
  notes,
  photo_url
) on table public.mechanics to authenticated;
grant delete on table public.mechanics to authenticated;

grant select on table public.operation_mechanic_profiles to authenticated;
grant select on table public.operation_work_order_financials to authenticated;
grant select on table public.operation_client_options to authenticated;
grant select on table public.operation_vehicle_options to authenticated;
grant select on table public.operation_quote_options to authenticated;

comment on view public.operation_mechanic_profiles is
  'Private mechanic profile projection. Predicate is evaluated from auth.uid(); reception is intentionally excluded from phone and notes.';
comment on view public.operation_work_order_financials is
  'Narrow financial projection for finance members; excludes notes, share tokens and operational child rows.';
comment on view public.operation_client_options is
  'Narrow client selector for work orders and appointments. Jefe_taller never receives the contact number.';
comment on view public.operation_vehicle_options is
  'Narrow vehicle selector for work orders and appointments; excludes VIN, mileage, color and notes.';
comment on view public.operation_quote_options is
  'Narrow quote selector for work orders; excludes notes, share tokens and lifecycle metadata not required by the form.';
