-- Calls deel 2-4: bedankmail, Fireflies-transcript (webhook) → Drive, lead bijwerken en analyse.
alter table public.calls add column if not exists thank_you_draft_id uuid references public.mail_drafts (id) on delete set null;
alter table public.calls add column if not exists fireflies_id text;
alter table public.calls add column if not exists transcript_url text;
alter table public.calls add column if not exists transcript_received_at timestamptz;
-- Analyse door Grok Bot: { samenvatting, goed[], beter[], score, tips[] }
alter table public.calls add column if not exists analysis jsonb;
-- Setter-opname: bestand in de Drive en de tijdelijke "iedereen met de link"-toestemming voor Fireflies.
alter table public.calls add column if not exists recording_file_id text;
alter table public.calls add column if not exists recording_public_permission text;

-- Elk transcript dat Fireflies meldt (webhook), ook als het niet (meteen) aan een call gekoppeld kan worden.
create table if not exists public.call_transcripts (
  fireflies_id text primary key,
  call_id uuid references public.calls (id) on delete set null,
  title text,
  meeting_link text,
  started_at timestamptz,
  attendees text[] not null default '{}',
  drive_url text,
  status text not null default 'ontvangen' check (status in ('ontvangen', 'ongekoppeld', 'gekoppeld', 'verwerkt', 'fout')),
  error text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.call_transcripts enable row level security;
drop policy if exists sales_only on public.call_transcripts;
create policy sales_only on public.call_transcripts for all to authenticated
  using (public.is_sales_user()) with check (public.is_sales_user());
