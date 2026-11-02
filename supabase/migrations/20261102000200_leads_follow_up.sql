-- Opvolging (stap 7 van de sales-workflow) en context per lead.
alter table public.leads
  add column if not exists next_action text,
  add column if not exists follow_up_on date,
  add column if not exists notes text;
create index if not exists leads_follow_up_idx on public.leads (follow_up_on) where follow_up_on is not null;
