-- Ideeën die extern (bv. door de Grok-bot) uitgewerkt worden
alter table public.content_ideas
  add column if not exists dev_status text check (dev_status in ('requested','failed')),
  add column if not exists dev_provider text,
  add column if not exists dev_requested_at timestamptz;
