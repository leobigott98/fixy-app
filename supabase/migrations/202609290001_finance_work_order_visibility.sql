-- Finanzas puede consultar el estado y los importes de las órdenes, pero no
-- crearlas, editarlas ni cambiar su etapa. Esta migración incremental evita
-- depender de que una migración anterior vuelva a ejecutarse.

-- Algunas instalaciones pudieron aplicar la migración de documentos antes de
-- que estos snapshots fueran incorporados. La migración debe ser autosuficiente
-- para poder recrear la vista financiera en ambos casos.
alter table public.work_orders
  add column if not exists quote_version integer,
  add column if not exists quote_document_number text,
  add column if not exists plate_snapshot text,
  add column if not exists mileage_snapshot integer;

drop policy if exists work_orders_select_authorized on public.work_orders;
create policy work_orders_select_authorized on public.work_orders
for select to authenticated
using (
  public.workshop_role(workshop_id) in ('owner', 'admin', 'jefe_taller', 'recepcion', 'finanzas')
  or (
    public.workshop_role(workshop_id) = 'mechanic'
    and assigned_mechanic_id = public.current_workshop_mechanic_id(workshop_id)
  )
);

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

comment on view public.operation_work_order_financials is
  'Read-only order status and sale/payment context for owner, admin and finance roles.';
