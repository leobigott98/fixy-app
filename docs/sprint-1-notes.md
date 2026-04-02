# Sprint 1 continuation

## Priority sequence

1. Replace the mock session cookie with real Supabase Auth.
2. Add workshop setup after signup.
3. Implement the first operational dashboard backed by real data.
4. Build clients, vehicles and quotes as the first real modules.
5. Connect WhatsApp-friendly actions from clients, quotes and work orders.

## Product decisions already made in Sprint 0

- Spanish-first copy
- mobile-first navigation
- desktop sidebar plus mobile bottom nav
- visual cards over table-heavy admin patterns
- auth and app areas separated by route groups
- reusable module scaffold to keep future screens consistent

## Suggested Sprint 1 data work

- Create Supabase schema for `workshops`, `workshop_members`, `clients`, `vehicles`, `quotes`, `quote_items`
- Add row-level security from the start
- Create a workshop-scoped `profile -> workshop -> member` access model
- Seed a small demo workspace for local UI iteration

## First real flows to ship

- signup -> create workshop -> dashboard
- create client + vehicle together
- create quote with line items
- send quote via WhatsApp-friendly summary
- approve quote -> create work order
