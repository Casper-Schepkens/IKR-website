-- Koppelingen per teamlid: eigen mailbox (alleen lezen) en, apart, agenda('s) (alleen lezen).
-- Mail en agenda mogen een ander Google-account zijn. Het refresh token staat VERSLEUTELD
-- (AES-256-GCM, sleutel IKR_TOKEN_KEY in Vercel). Enkel de server leest deze tabel (service role):
-- RLS aan zonder policies, dus geen toegang vanuit de browser.
create table if not exists public.team_google (
  id uuid primary key default gen_random_uuid(),
  member_email text not null,
  kind text not null check (kind in ('mail', 'agenda')),
  google_email text not null,
  refresh_token_enc text not null,
  scopes text not null,
  -- agenda: alle agenda's van het account [{id, naam, primair}] en de gekozen id's
  calendars jsonb not null default '[]'::jsonb,
  selected_calendars text[] not null default '{}',
  status text not null default 'ok' check (status in ('ok', 'opnieuw_koppelen')),
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_email, kind)
);
alter table public.team_google enable row level security;
