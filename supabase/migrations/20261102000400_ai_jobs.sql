-- AI-taken als wachtrij. Nu voert de Claude API ze meteen uit (engine 'api'); later kan een
-- worker op een eigen server (Claude Code) de taken met status 'pending' oppikken.
create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  -- Waar de taak over gaat, bv. 'gmail:<message-id>', zodat dezelfde taak niet twee keer loopt.
  ref text,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'error', 'waiting_limit')),
  output jsonb,
  error text,
  engine text,
  model text,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  cache_write_tokens int,
  cost_usd numeric(10, 5),
  created_by text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists ai_jobs_status_idx on public.ai_jobs (status, created_at);
create unique index if not exists ai_jobs_ref_key on public.ai_jobs (type, ref) where ref is not null;
alter table public.ai_jobs enable row level security;
-- Sales-AI: enkel Casper leest mee; schrijven gebeurt server-side met de service role.
drop policy if exists ai_jobs_sales_read on public.ai_jobs;
create policy ai_jobs_sales_read on public.ai_jobs for select to authenticated using (public.is_sales_user());
