-- Spraakbot: live praten met het dashboard (OpenAI Realtime). Enkel de server schrijft (service role);
-- het team leest mee voor het overzicht in Instellingen.

-- Chatberichten die uit een spraakgesprek komen, krijgen een 🎙 in de chat.
alter table public.ai_chat add column if not exists via text check (via in ('spraak'));

-- Eén rij met de instellingen (daglimiet voor het hele team, stem, koers dollar → euro).
create table if not exists public.voice_settings (
  id int primary key default 1 check (id = 1),
  daily_limit_eur numeric(8, 2) not null default 2 check (daily_limit_eur >= 0 and daily_limit_eur <= 1000),
  voice text not null default 'marin',
  usd_to_eur numeric(6, 4) not null default 0.86 check (usd_to_eur > 0 and usd_to_eur < 5),
  updated_by text,
  updated_at timestamptz not null default now()
);
insert into public.voice_settings (id) values (1) on conflict (id) do nothing;

-- Eén rij per gesprek (van microfoon aan tot uit).
create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_name text,
  model text not null,
  voice text not null,
  page text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists voice_sessions_started_idx on public.voice_sessions (started_at desc);

-- Verbruik per antwoord (en per transcriptie), zoals OpenAI het meldt, met de kost in dollar.
create table if not exists public.voice_usage (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.voice_sessions(id) on delete cascade,
  user_email text not null,
  kind text not null check (kind in ('antwoord', 'transcriptie')),
  response_id text,
  model text not null,
  audio_in int not null default 0,
  audio_in_cached int not null default 0,
  text_in int not null default 0,
  text_in_cached int not null default 0,
  audio_out int not null default 0,
  text_out int not null default 0,
  -- Kost per soort (dollar): spraak_in, spraak_uit, tekst_in, tekst_uit, cache, transcriptie.
  cost jsonb not null default '{}'::jsonb,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists voice_usage_created_idx on public.voice_usage (created_at desc);
create unique index if not exists voice_usage_response_idx on public.voice_usage (response_id) where response_id is not null;

-- Elke toolaanroep van de spraakbot. Schrijf-tools wachten op bevestiging (status 'wacht').
create table if not exists public.voice_tool_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.voice_sessions(id) on delete cascade,
  user_email text not null,
  tool text not null,
  args jsonb,
  read_only boolean not null,
  status text not null check (status in ('uitgevoerd', 'mislukt', 'wacht', 'bezig', 'geannuleerd', 'verlopen')),
  -- Hoe bevestigd: 'stem' of 'knop' (enkel bij schrijf-tools).
  decided_via text check (decided_via in ('stem', 'knop')),
  result text,
  duur_ms int,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists voice_tool_calls_created_idx on public.voice_tool_calls (created_at desc);

alter table public.voice_settings enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.voice_usage enable row level security;
alter table public.voice_tool_calls enable row level security;
drop policy if exists voice_settings_team_read on public.voice_settings;
create policy voice_settings_team_read on public.voice_settings for select to authenticated using (public.is_team_member());
drop policy if exists voice_sessions_team_read on public.voice_sessions;
create policy voice_sessions_team_read on public.voice_sessions for select to authenticated using (public.is_team_member());
drop policy if exists voice_usage_team_read on public.voice_usage;
create policy voice_usage_team_read on public.voice_usage for select to authenticated using (public.is_team_member());
drop policy if exists voice_tool_calls_team_read on public.voice_tool_calls;
create policy voice_tool_calls_team_read on public.voice_tool_calls for select to authenticated using (public.is_team_member());
