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
- `/app/calendar`
- `/app/inventory`
- `/app/finances`
- `/app/finances/payments/new`
- `/app/finances/payments/[id]/receipt`
- `/app/finances/expenses/new`
- `/app/settings`

## Notes

- `proxy.ts` protects `/app/*` with a Sprint 0 session cookie placeholder.
- `/app/onboarding` is the Sprint 1 workshop setup flow and redirects into `/app/dashboard`.
- Auth forms use React Hook Form + Zod and are ready to be connected to Supabase Auth in Sprint 1.
- `lib/supabase` contains browser/server clients plus an admin client for server-side Sprint 1 data access.
- Run the SQL in [supabase/migrations/202604010001_sprint_1_foundation.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604010001_sprint_1_foundation.sql), [supabase/migrations/202604010002_sprint_2_clients_vehicles.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604010002_sprint_2_clients_vehicles.sql), [supabase/migrations/202604020001_sprint_3_quotes.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020001_sprint_3_quotes.sql), [supabase/migrations/202604020002_sprint_4_work_orders.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020002_sprint_4_work_orders.sql), [supabase/migrations/202604020003_sprint_5_finances.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020003_sprint_5_finances.sql), [supabase/migrations/202604020004_upload_assets.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020004_upload_assets.sql), [supabase/migrations/202604020005_logo_png_svg.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020005_logo_png_svg.sql), and [supabase/migrations/202604020006_expense_assets_and_quote_lifecycle.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604020006_expense_assets_and_quote_lifecycle.sql) before testing onboarding plus Sprint 2/3/4/5 flows.
- Module pages stay scaffolded, but now require a workshop profile before access.
