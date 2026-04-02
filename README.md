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
- `/app/dashboard`
- `/app/clients`
- `/app/vehicles`
- `/app/quotes`
- `/app/work-orders`
- `/app/mechanics`
- `/app/calendar`
- `/app/inventory`
- `/app/finances`
- `/app/settings`

## Notes

- `middleware.ts` protects `/app/*` with a Sprint 0 session cookie placeholder.
- Auth forms use React Hook Form + Zod and are ready to be connected to Supabase Auth in Sprint 1.
- `lib/supabase` already contains browser/server client factories.
- Module pages are scaffolded with shared visual foundations so Sprint 1 can focus on data and workflows.
