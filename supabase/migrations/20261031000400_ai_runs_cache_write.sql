-- Kostenoverzicht: ook cache-schrijftokens bijhouden (1,25× de inputprijs).
alter table public.ai_runs add column if not exists cache_write_tokens int;
create index if not exists ai_runs_created_idx on public.ai_runs(created_at desc);
