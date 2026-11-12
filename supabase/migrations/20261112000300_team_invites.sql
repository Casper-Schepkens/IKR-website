-- Per teamlid: naar welk adres uitnodigingen voor weeklies en calls gaan (bv. een persoonlijke agenda).
-- Enkel via de server (service role); geen directe toegang.
create table if not exists public.team_profiles (
  email text primary key,
  invite_email text check (char_length(invite_email) <= 320),
  updated_at timestamptz not null default now()
);
alter table public.team_profiles enable row level security;
