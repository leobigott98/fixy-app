alter table public.workshops
  add column if not exists gallery_image_urls text[] not null default '{}';
