alter table public.workshop_reviews
  add column if not exists title text not null default 'Experiencia con el taller',
  add column if not exists workshop_response text,
  add column if not exists workshop_response_at timestamptz;

update public.workshop_reviews
set status = 'approved',
    published_at = coalesce(published_at, created_at)
where status = 'pending';
