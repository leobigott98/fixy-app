# Fixy

Sprint 0 foundation for a modern, mobile-first workshop operating system.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Supabase scaffolding
- React Hook Form
- Zod

## Recommended structure

```text
app/
  (marketing)/
  (auth)/
  (app)/
components/
  auth/
  brand/
  layout/
  shared/
  ui/
lib/
  auth/
  supabase/
docs/
```

## Included routes

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/app`
- `/app/onboarding`
- `/app/dashboard`
- `/app/clients`
- `/app/clients/new`
- `/app/clients/[id]`
- `/app/clients/[id]/edit`
- `/app/vehicles`
- `/app/vehicles/new`
- `/app/vehicles/[id]`
- `/app/vehicles/[id]/edit`
- `/app/quotes`
- `/app/quotes/new`
- `/app/quotes/[id]`
- `/app/quotes/[id]/document`
- `/app/quotes/[id]/edit`
- `/app/work-orders`
- `/app/work-orders/new`
- `/app/work-orders/[id]`
- `/app/work-orders/[id]/document`
- `/app/work-orders/[id]/edit`
- `/app/mechanics`
- `/app/mechanics/new`
- `/app/mechanics/[id]`
- `/app/mechanics/[id]/edit`
- `/app/calendar`
- `/app/calendar/new`
- `/app/calendar/[id]/edit`
- `/app/inventory`
- `/app/inventory/new`
- `/app/inventory/[id]/edit`
- `/app/suppliers`
- `/app/suppliers/new`
- `/app/suppliers/[id]/edit`
- `/app/purchase-orders`
- `/app/purchase-orders/new`
- `/app/purchase-orders/[id]/edit`
- `/app/reports`
- `/app/finances`
- `/app/finances/payments/new`
- `/app/finances/payments/[id]/receipt`
- `/app/finances/expenses/new`
- `/app/settings`
- `/presupuestos/[token]`
- `/presupuestos/[token]/documento`
- `/ordenes/[token]`
- `/ordenes/[token]/documento`

## Notes

- `proxy.ts` protects `/app/*` with a Sprint 0 session cookie placeholder.
- `proxy.ts` also persists the global `cards/table` list preference in a cookie when the user changes it from any module.
- `/app/onboarding` is the Sprint 1 workshop setup flow and redirects into `/app/dashboard`.
- `/app/calendar` now supports day, week, and month operational views for appointments.
- Client, quote, and work-order detail pages now expose WhatsApp deep links with prefilled operational templates.
- Sprint 11 adds lightweight foundations for workshop roles, suppliers, purchase orders, commissions, and simple reports.
- Sprint 12 adds secure public share links for quote approval, work-order status tracking, and client-facing document pages.
- Auth forms use React Hook Form + Zod and are ready to be connected to Supabase Auth in Sprint 1.
- `lib/supabase` contains browser/server clients plus an admin client for server-side Sprint 1 data access.
- Run the SQL in [supabase/migrations/202604010001_sprint_1_foundation.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604010001_sprint_1_foundation.sql), [supabase/migrations/202604010002_sprint_2_clients_vehicles.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604010002_sprint_2_clients_vehicles.sql), [supabase/migrations/202604020001_sprint_3_quotes.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020001_sprint_3_quotes.sql), [supabase/migrations/202604020002_sprint_4_work_orders.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020002_sprint_4_work_orders.sql), [supabase/migrations/202604020003_sprint_5_finances.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020003_sprint_5_finances.sql), [supabase/migrations/202604020004_upload_assets.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020004_upload_assets.sql), [supabase/migrations/202604020005_logo_png_svg.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020005_logo_png_svg.sql), [supabase/migrations/202604020006_expense_assets_and_quote_lifecycle.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020006_expense_assets_and_quote_lifecycle.sql), [supabase/migrations/202604020007_sprint_6_mechanics.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020007_sprint_6_mechanics.sql), [supabase/migrations/202604020008_sprint_7_vehicle_history.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020008_sprint_7_vehicle_history.sql), [supabase/migrations/202604020009_sprint_8_inventory.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020009_sprint_8_inventory.sql), [supabase/migrations/202604020010_sprint_9_calendar.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020010_sprint_9_calendar.sql), [supabase/migrations/202604020011_sprint_11_foundations.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020011_sprint_11_foundations.sql), and [supabase/migrations/202604040001_sprint_12_client_shares.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604040001_sprint_12_client_shares.sql) before testing onboarding plus Sprint 2/3/4/5/6/7/8/9/11/12 flows.
- Module pages stay scaffolded, but now require a workshop profile before access.

## Datos demo locales

El comando `seed:demo` crea identidades reales en Supabase Auth local y datos ficticios
repetibles para probar los permisos, el flujo de presupuestos y las vistas Kanban, Cards y
Tabla de ordenes. No forma parte del arranque de Next.js, de las migraciones ni de un deploy.

1. Levanta Supabase local desde este repositorio y aplica las migraciones existentes. Para una
   base local descartable ejecuta `supabase start` y luego
   `supabase db reset --local --no-seed`. Si necesitas conservar datos locales, usa
   `supabase migration up --local` en lugar del reset. El flag `--no-seed` evita cualquier seed
   automatico; los datos demo solo se crean con el comando explicito del paso 3.
2. Copia en `.env.local` la URL, la anon key y la service-role key mostradas por
   `supabase status`. La URL debe ser exactamente `http://127.0.0.1:54321` o
   `http://localhost:54321`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key local>
   SUPABASE_SERVICE_ROLE_KEY=<service-role key local>
   FIXY_SEED_PASSWORD=<una contrasena local de al menos 12 caracteres>
   ```

3. Ejecuta `npm run seed:demo`. El comando comprueba Auth y el esquema antes de escribir,
   crea o reutiliza solamente sus UUID/correos reservados y autentica cada cuenta al final.
4. Ejecuta `npm run dev`, abre `http://127.0.0.1:3000/login` e inicia sesion con cualquiera
   de estas cuentas y el valor de `FIXY_SEED_PASSWORD`:

   - `dueno@fixy.example.com` — propietario de `DEMO Fixy`.
   - `admin@fixy.example.com` — administrador.
   - `finanzas@fixy.example.com` — finanzas.
   - `mecanico@fixy.example.com` — mecanico con una orden asignada.
   - `mecanico2@fixy.example.com` — segundo mecanico con una orden terminada.
   - `cliente@fixy.example.com` — propietario de vehiculo en el portal de clientes.
   - `dueno.otro@fixy.example.com` — propietario de `DEMO Fixy Aislado`, para comprobar
     separacion entre talleres.

   Propietario y administrador conservan la politica MFA real de la aplicacion: en su primer
   acceso local deben registrar un factor TOTP en `/mfa`; el seed no la evita.

5. Vuelve a ejecutar `npm run seed:demo` cuando quieras restaurar los valores demo. Los
   registros usan UUID estables y las cuentas se reconocen por una marca privada de Auth, por
   lo que no se duplican. El comando nunca elimina datos ajenos. Si se corta durante el poblado,
   ejecútalo de nuevo; las identidades nuevas se eliminan al fallar y los registros demo
   parciales se completan por `upsert` en la siguiente ejecucion.

El escenario principal incluye presupuestos borrador, enviado y aprobado; ordenes en varias
etapas; el trabajo combinado de frenos y aceite por USD 193; inventario con costos conocidos;
un repuesto bajo minimo; pago parcial; gasto de repuestos; comision del mecanico; proveedor; y
un item sin enlace de inventario que representa costo desconocido. El esquema actual no guarda
un costo por linea de presupuesto/orden ni un margen calculado: el costo directo demostrable se
compone de USD 77 en repuestos mas USD 37 de comision (USD 114), sin registrar el costo
desconocido como cero.
