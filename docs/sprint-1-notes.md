# Sprint 1 continuation

## Priority sequence

1. Replace the mock session cookie with real Supabase Auth.
2. Keep workshop onboarding, but switch ownership from email cookie to auth user id.
3. Expand the dashboard from workshop profile + counts into real workload monitoring.
4. Build clients, vehicles and quotes as the first real modules.
5. Connect WhatsApp-friendly actions from clients, quotes and work orders.

## Product decisions already made in Sprint 0

- Spanish-first copy
- mobile-first navigation
- desktop sidebar plus mobile bottom nav
- visual cards over table-heavy admin patterns
- auth and app areas separated by route groups
- reusable module scaffold to keep future screens consistent
- workshop onboarding and profile editing reuse the same form and Supabase persistence logic

## Suggested Sprint 1 data work

- Extend the current schema for `workshop_members`, `quote_items`, `work_order_services`, `work_order_parts`
- Replace the temporary server-side admin access with user auth + row-level security
- Create a workshop-scoped `auth user -> workshop member -> workshop` access model
- Seed a small demo workspace for local UI iteration

## First real flows to ship

- signup -> create workshop -> dashboard
- create client + vehicle together
- create quote with line items
- send quote via WhatsApp-friendly summary
- approve quote -> create work order
