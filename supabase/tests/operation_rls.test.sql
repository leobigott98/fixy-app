begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(54);

insert into auth.users (
  id, aud, role, email, phone, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'operation-owner-a@example.invalid', '+580000000301', '', '{}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), false, false),
  ('71000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'operation-owner-b@example.invalid', '+580000000302', '', '{}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), false, false),
  ('71000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'operation-admin@example.invalid', '+580000000303', '', '{}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), false, false),
  ('71000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'operation-jt@example.invalid', '+580000000304', '', '{}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), false, false),
  ('71000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'operation-rec@example.invalid', '+580000000305', '', '{}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), false, false),
  ('71000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'operation-fin@example.invalid', '+580000000306', '', '{}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), false, false),
  ('71000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'operation-mechanic@example.invalid', '+580000000307', '', '{}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), false, false),
  ('71000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'operation-outsider@example.invalid', '+580000000308', '', '{}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), false, false);

insert into public.workshops (
  id, owner_auth_user_id, owner_email, owner_name, workshop_name,
  whatsapp_phone, city, workshop_type, opening_days, opens_at, closes_at,
  opening_hours_label, bay_count
)
values
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'operation-owner-a@example.invalid', 'Owner A', 'Operation Workshop A', '+580000000311', 'Caracas', 'general', 'Lunes a viernes', '08:00', '17:00', 'Lunes a viernes', 3),
  ('72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 'operation-owner-b@example.invalid', 'Owner B', 'Operation Workshop B', '+580000000312', 'Valencia', 'general', 'Lunes a viernes', '08:00', '17:00', 'Lunes a viernes', 2);

insert into public.mechanics (id, workshop_id, full_name, phone, role, notes)
values
  ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Mechanic A', '+580000000321', 'mecanico', 'Private A'),
  ('73000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 'Mechanic A2', '+580000000322', 'mecanico', 'Private A2'),
  ('73000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', 'Mechanic B', '+580000000323', 'mecanico', 'Private B');

insert into public.workshop_members (
  id, workshop_id, auth_user_id, email, full_name, role, mechanic_id, is_active
)
values
  ('74000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000003', 'operation-admin@example.invalid', 'Admin A', 'admin', null, true),
  ('74000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000004', 'operation-jt@example.invalid', 'JT A', 'jefe_taller', null, true),
  ('74000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000005', 'operation-rec@example.invalid', 'Reception A', 'recepcion', null, true),
  ('74000000-0000-0000-0000-000000000004', '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000006', 'operation-fin@example.invalid', 'Finance A', 'finanzas', null, true),
  ('74000000-0000-0000-0000-000000000005', '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000007', 'operation-mechanic@example.invalid', 'Mechanic A', 'mechanic', '73000000-0000-0000-0000-000000000001', true);

insert into public.clients (id, workshop_id, full_name, phone)
values
  ('75000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Client A', '+580000000331'),
  ('75000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'Client B', '+580000000332');

insert into public.vehicles (id, workshop_id, client_id, vehicle_label, plate)
values
  ('76000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', 'Vehicle A', 'AAA001'),
  ('76000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000002', 'Vehicle B', 'BBB002');

insert into public.vehicle_photos (id, vehicle_id, workshop_id, photo_url)
values
  ('77000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'https://example.invalid/a.jpg'),
  ('77000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'https://example.invalid/b.jpg');

insert into public.quotes (id, workshop_id, client_id, vehicle_id, title, status, total_amount)
values
  ('78000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', 'Quote A', 'approved', 100),
  ('78000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000002', 'Quote B', 'approved', 200);

insert into public.quote_items (id, quote_id, workshop_id, item_type, description, line_total)
values
  ('79000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'labor', 'Labor A', 100),
  ('79000000-0000-0000-0000-000000000002', '78000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'labor', 'Labor B', 200);

insert into public.work_orders (
  id, workshop_id, client_id, vehicle_id, quote_id, code, title, status,
  total_amount, assigned_mechanic_id
)
values
  ('7a000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001', 'RLS-A-1', 'Order A assigned', 'en_reparacion', 100, '73000000-0000-0000-0000-000000000001'),
  ('7a000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', null, 'RLS-A-2', 'Order A other', 'diagnostico_pendiente', 50, '73000000-0000-0000-0000-000000000002'),
  ('7a000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000002', '78000000-0000-0000-0000-000000000002', 'RLS-B-1', 'Order B', 'en_reparacion', 200, '73000000-0000-0000-0000-000000000003');

insert into public.work_order_services (id, work_order_id, workshop_id, description, line_total)
values
  ('7b000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Service A', 100),
  ('7b000000-0000-0000-0000-000000000002', '7a000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', 'Service B', 200);

insert into public.work_order_parts (id, work_order_id, workshop_id, description, line_total)
values
  ('7c000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Part A', 10),
  ('7c000000-0000-0000-0000-000000000002', '7a000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', 'Part B', 20);

insert into public.work_order_reference_photos (id, work_order_id, workshop_id, photo_url)
values
  ('7d000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'https://example.invalid/order-a.jpg'),
  ('7d000000-0000-0000-0000-000000000002', '7a000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', 'https://example.invalid/order-b.jpg');

insert into public.appointments (
  id, workshop_id, client_id, vehicle_id, assigned_mechanic_id,
  appointment_date, appointment_time, appointment_type, status
)
values
  ('7e000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', current_date, '09:00', 'ingreso_servicio', 'confirmada'),
  ('7e000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000002', current_date, '10:00', 'ingreso_servicio', 'confirmada'),
  ('7e000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000003', current_date, '11:00', 'ingreso_servicio', 'confirmada');

insert into public.marketplace_inquiries (
  id, workshop_id, requester_name, requester_phone, requested_service, message
)
values
  ('7f000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Requester A', '+580000000341', 'Service A', 'Inquiry A'),
  ('7f000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'Requester B', '+580000000342', 'Service B', 'Inquiry B');

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'clients', 'vehicles', 'vehicle_photos', 'quotes', 'quote_items',
        'work_orders', 'work_order_services', 'work_order_parts',
        'work_order_status_history', 'work_order_reference_photos',
        'appointments', 'mechanics', 'marketplace_inquiries'
      )
      and c.relrowsecurity
  ),
  13,
  'RLS is enabled on every operation table'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.clients', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.vehicles', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.vehicle_photos', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.quotes', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.quote_items', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.work_orders', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.work_order_services', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.work_order_parts', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.work_order_status_history', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.work_order_reference_photos', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.appointments', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.mechanics', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon', 'public.marketplace_inquiries', 'SELECT,INSERT,UPDATE,DELETE'),
  'anon has no direct operation-table privileges'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.operation_mechanic_profiles', 'SELECT')
  and not has_table_privilege('anon', 'public.operation_work_order_financials', 'SELECT')
  and not has_table_privilege('anon', 'public.operation_client_options', 'SELECT')
  and not has_table_privilege('anon', 'public.operation_vehicle_options', 'SELECT')
  and not has_table_privilege('anon', 'public.operation_quote_options', 'SELECT'),
  'anon cannot read operation projections'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.clients', 'TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege('authenticated', 'public.work_orders', 'TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege('authenticated', 'public.mechanics', 'TRUNCATE,REFERENCES,TRIGGER'),
  'authenticated has no structural operation privileges'
);

set local role anon;
select extensions.throws_ok(
  'select * from public.marketplace_inquiries',
  '42501',
  null,
  'anon cannot enumerate marketplace inquiries'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","email":"operation-owner-a@example.invalid","role":"authenticated"}', true);
set local role authenticated;

select extensions.is((select count(*) from public.clients), 1::bigint, 'owner A sees only workshop A clients');
select extensions.is((select full_name from public.clients), 'Client A', 'owner A reads its client details');
select extensions.throws_ok(
  $$insert into public.vehicles (workshop_id, client_id, vehicle_label) values ('72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000002', 'Cross tenant')$$,
  '42501', null, 'a vehicle cannot reference a client from workshop B'
);
select extensions.throws_ok(
  $$insert into public.vehicle_photos (workshop_id, vehicle_id, photo_url) values ('72000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000002', 'https://example.invalid/cross.jpg')$$,
  '42501', null, 'a vehicle photo cannot reference a vehicle from workshop B'
);
select extensions.throws_ok(
  $$insert into public.quotes (workshop_id, client_id, vehicle_id, title) values ('72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000002', 'Cross tenant')$$,
  '42501', null, 'a quote cannot reference a vehicle from workshop B'
);
select extensions.throws_ok(
  $$insert into public.quote_items (workshop_id, quote_id, item_type, description) values ('72000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000002', 'labor', 'Cross tenant')$$,
  '42501', null, 'a quote item cannot reference a quote from workshop B'
);
select extensions.throws_ok(
  $$insert into public.work_orders (workshop_id, client_id, vehicle_id, assigned_mechanic_id, title, status) values ('72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000003', 'Cross mechanic', 'diagnostico_pendiente')$$,
  '42501', null, 'a work order cannot assign a mechanic from workshop B'
);
select extensions.throws_ok(
  $$insert into public.work_order_services (workshop_id, work_order_id, description) values ('72000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000003', 'Cross tenant')$$,
  '42501', null, 'a service cannot reference a work order from workshop B'
);
select extensions.throws_ok(
  $$insert into public.appointments (workshop_id, client_id, vehicle_id, appointment_date, appointment_time, appointment_type) values ('72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000002', current_date, '12:00', 'ingreso_servicio')$$,
  '42501', null, 'an appointment cannot reference a vehicle from workshop B'
);
select extensions.is((select count(*) from public.marketplace_inquiries), 1::bigint, 'owner A sees only workshop A inquiries');
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000003","email":"operation-admin@example.invalid","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select count(*) from public.clients), 1::bigint, 'admin reads clients in the same workshop');
select extensions.isnt_empty($$update public.clients set notes = 'Admin update' where id = '75000000-0000-0000-0000-000000000001' returning id$$, 'admin updates a same-workshop client');
insert into public.clients (id, workshop_id, full_name) values ('75000000-0000-0000-0000-000000000099', '72000000-0000-0000-0000-000000000001', 'Delete me');
select extensions.isnt_empty($$delete from public.clients where id = '75000000-0000-0000-0000-000000000099' returning id$$, 'admin deletes a same-workshop client');
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000004","email":"operation-jt@example.invalid","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select count(*) from public.clients), 0::bigint, 'jefe_taller cannot browse client rows');
select extensions.ok(
  (select count(*) from public.operation_client_options) = 1
  and (select count(*) from public.operation_vehicle_options) = 1
  and (select count(*) from public.operation_quote_options) = 1
  and (select whatsapp_phone is null from public.operation_client_options limit 1),
  'jefe_taller receives isolated narrow selectors without private client contact data'
);
select extensions.is((select count(*) from public.mechanics), 2::bigint, 'jefe_taller sees same-workshop mechanic directory rows');
select extensions.is((select phone from public.operation_mechanic_profiles where id = '73000000-0000-0000-0000-000000000001'), '+580000000321', 'jefe_taller can read the private mechanic profile projection');
select extensions.lives_ok($$insert into public.mechanics (workshop_id, full_name, role) values ('72000000-0000-0000-0000-000000000001', 'Mechanic JT', 'mecanico')$$, 'jefe_taller can create a mechanic in its workshop');
select extensions.lives_ok($$insert into public.work_orders (id, workshop_id, client_id, vehicle_id, code, title, status) values ('7a000000-0000-0000-0000-000000000099', '72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', 'RLS-A-JT', 'JT order', 'diagnostico_pendiente')$$, 'jefe_taller can create a valid work order');
select extensions.isnt_empty($$update public.work_orders set status = 'en_reparacion' where id = '7a000000-0000-0000-0000-000000000099' returning id$$, 'jefe_taller can update a work order');
select extensions.is_empty($$delete from public.work_orders where id = '7a000000-0000-0000-0000-000000000099' returning id$$, 'jefe_taller cannot delete work orders');
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000005","email":"operation-rec@example.invalid","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select count(*) from public.clients), 1::bigint, 'reception reads same-workshop clients');
select extensions.is((select count(*) from public.mechanics), 3::bigint, 'reception sees only the safe mechanic directory rows');
select extensions.throws_ok('select phone from public.mechanics', '42501', null, 'reception cannot read mechanic phone from the base table');
select extensions.lives_ok($$insert into public.quotes (workshop_id, client_id, vehicle_id, title) values ('72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', 'Reception quote')$$, 'reception creates a valid quote');
select extensions.isnt_empty($$update public.marketplace_inquiries set status = 'contacted' where id = '7f000000-0000-0000-0000-000000000001' returning id$$, 'reception updates an inquiry for its workshop');
select extensions.lives_ok($$insert into public.appointments (workshop_id, client_id, vehicle_id, appointment_date, appointment_time, appointment_type) values ('72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', current_date, '13:00', 'ingreso_servicio')$$, 'reception creates a valid appointment');
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000006","email":"operation-fin@example.invalid","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select count(*) from public.clients), 1::bigint, 'finance reads same-workshop clients');
select extensions.is((select count(*) from public.work_orders), 0::bigint, 'finance cannot read full work-order rows');
select extensions.is((select count(*) from public.operation_work_order_financials where code like 'RLS-A-%'), 3::bigint, 'finance reads the narrow same-workshop work-order projection');
select extensions.lives_ok($$insert into public.quotes (workshop_id, client_id, vehicle_id, title) values ('72000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', 'Finance quote')$$, 'finance creates a valid quote');
select extensions.is((select count(*) from public.appointments), 3::bigint, 'finance reads same-workshop appointments');
select extensions.is_empty($$update public.appointments set status = 'cancelada' where id = '7e000000-0000-0000-0000-000000000001' returning id$$, 'finance cannot update appointments');
select extensions.is_empty($$update public.marketplace_inquiries set status = 'closed' where id = '7f000000-0000-0000-0000-000000000001' returning id$$, 'finance cannot update marketplace inquiries');
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000007","email":"operation-mechanic@example.invalid","role":"authenticated"}', true);
set local role authenticated;
select extensions.is(public.current_workshop_mechanic_id('72000000-0000-0000-0000-000000000001'), '73000000-0000-0000-0000-000000000001'::uuid, 'mechanic identity is derived from the active membership');
select extensions.is((select count(*) from public.mechanics), 1::bigint, 'mechanic sees only its own safe base profile');
select extensions.is((select notes from public.operation_mechanic_profiles), 'Private A', 'mechanic can read its own private profile projection');
select extensions.is((select count(*) from public.work_orders), 1::bigint, 'mechanic sees only its assigned work order');
select extensions.is((select code from public.work_orders), 'RLS-A-1', 'mechanic cannot see another assignment in the same workshop');
select extensions.is((select count(*) from public.work_order_services), 1::bigint, 'mechanic sees children of its assigned work order only');
select extensions.is_empty($$update public.work_orders set status = 'completada' where id = '7a000000-0000-0000-0000-000000000001' returning id$$, 'mechanic cannot directly transition a work order');
select extensions.is((select count(*) from public.appointments), 1::bigint, 'mechanic sees only its assigned appointment');
select extensions.throws_ok($$insert into public.work_order_status_history (work_order_id, workshop_id, to_status) values ('7a000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'en_reparacion')$$, '42501', null, 'mechanic cannot append status history without a controlled transition');
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000002","email":"operation-owner-b@example.invalid","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select full_name from public.clients), 'Client B', 'owner B sees only workshop B client');
select extensions.is((select code from public.work_orders), 'RLS-B-1', 'owner B sees only workshop B work order');
select extensions.is((select count(*) from public.marketplace_inquiries where id = '7f000000-0000-0000-0000-000000000001'), 0::bigint, 'owner B cannot see workshop A inquiry');
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","email":"operation-owner-a@example.invalid","role":"authenticated"}', true);
set local role authenticated;
select extensions.lives_ok($$insert into public.work_order_status_history (work_order_id, workshop_id, from_status, to_status, note) values ('7a000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'diagnostico_pendiente', 'en_reparacion', 'Valid append')$$, 'authorized staff can append matching status history');
select extensions.throws_ok($$update public.work_order_status_history set note = 'rewritten' where work_order_id = '7a000000-0000-0000-0000-000000000001'$$, '42501', null, 'status history is not updateable');
select extensions.throws_ok($$delete from public.work_order_status_history where work_order_id = '7a000000-0000-0000-0000-000000000001'$$, '42501', null, 'status history is not deletable');
reset role;

select * from extensions.finish();

rollback;
