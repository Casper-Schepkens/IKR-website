-- Log van wat Grokbot (via /api/mcp) leest en wijzigt. Enkel de server schrijft; Casper leest mee.
create table if not exists public.bot_actions (
  id uuid primary key default gen_random_uuid(),
  bot text not null default 'grokbot',
  tool text not null,
  args jsonb,
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists bot_actions_created_idx on public.bot_actions (created_at desc);
alter table public.bot_actions enable row level security;
drop policy if exists bot_actions_sales_read on public.bot_actions;
create policy bot_actions_sales_read on public.bot_actions for select to authenticated using (public.is_sales_user());
