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
- `/app/work-orders`
- `/app/mechanics`
- `/app/calendar`
- `/app/inventory`
- `/app/finances`
- `/app/settings`

## Notes

- `proxy.ts` protects `/app/*` with a Sprint 0 session cookie placeholder.
- `/app/onboarding` is the Sprint 1 workshop setup flow and redirects into `/app/dashboard`.
- Auth forms use React Hook Form + Zod and are ready to be connected to Supabase Auth in Sprint 1.
- `lib/supabase` contains browser/server clients plus an admin client for server-side Sprint 1 data access.
- Run the SQL in [supabase/migrations/202604010001_sprint_1_foundation.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604010001_sprint_1_foundation.sql) and [supabase/migrations/202604010002_sprint_2_clients_vehicles.sql](C:\Users\l_a_b\Dropbox\PC\Documents\fixy-app\supabase\migrations\202604010002_sprint_2_clients_vehicles.sql) before testing onboarding and Sprint 2 CRUD flows.
- Module pages stay scaffolded, but now require a workshop profile before access.
