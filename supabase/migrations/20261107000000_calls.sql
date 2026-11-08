-- Calls (sales): setter calls (telefoon, opname via Record-knop) en sales calls (Google Meet + Fireflies).
-- Ingepland via de inbox ("Verstuur en plan in agenda"), via de Calls-pagina of geregistreerd door Grok Bot.
-- Bewaart ook de uitkomst (afgerond / no-show / geannuleerd) zodat de cijfers op te vragen zijn.
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (kind in ('setter', 'sales')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'gepland' check (status in ('gepland', 'afgerond', 'no_show', 'geannuleerd')),
  meet_url text,
  calendar_event_id text,
  calendar_error text,
  -- true = de lead kreeg een agenda-uitnodiging vanuit het dashboard
  invited boolean not null default false,
  recording_url text,
  started_at timestamptz,
  fireflies_added_at timestamptz,
  finished_at timestamptz,
  note text,
  created_by text,
  created_via text not null default 'dashboard' check (created_via in ('dashboard', 'inbox', 'grokbot', 'agenda')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calls_ends_after_start check (ends_at > starts_at)
);
create index if not exists calls_starts_idx on public.calls (starts_at);
create index if not exists calls_lead_idx on public.calls (lead_id);
-- Eén call per agenda-item (detectie uit de contact-agenda maakt geen dubbels).
create unique index if not exists calls_event_key on public.calls (calendar_event_id) where calendar_event_id is not null;
alter table public.calls enable row level security;
drop policy if exists sales_only on public.calls;
create policy sales_only on public.calls for all to authenticated
  using (public.is_sales_user()) with check (public.is_sales_user());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calls') then
    alter publication supabase_realtime add table public.calls;
  end if;
end $$;
