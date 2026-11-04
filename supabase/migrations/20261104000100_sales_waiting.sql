-- "Wachten op antwoord": momentopname per lead van de laatste mail (van ons, nog geen antwoord).
-- Wordt bijgewerkt vanuit Gmail (server, service role); pagina en MCP lezen enkel deze tabel.
create table if not exists public.sales_waiting (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  mailbox text not null,
  thread_id text not null,
  mail_id text not null,
  mail_at timestamptz not null,
  from_email text not null,
  from_name text not null default '',
  subject text not null default '',
  preview text not null default '',
  synced_at timestamptz not null default now()
);
alter table public.sales_waiting enable row level security;
drop policy if exists sales_only on public.sales_waiting;
create policy sales_only on public.sales_waiting for all to authenticated
  using (public.is_sales_user()) with check (public.is_sales_user());

-- Wanneer er voor het laatst met Gmail gesynchroniseerd werd (ook als er niemand wacht).
create table if not exists public.sales_sync_state (
  key text primary key,
  synced_at timestamptz,
  error text
);
alter table public.sales_sync_state enable row level security;
drop policy if exists sales_only on public.sales_sync_state;
create policy sales_only on public.sales_sync_state for all to authenticated
  using (public.is_sales_user()) with check (public.is_sales_user());
