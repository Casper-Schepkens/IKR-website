-- Boekingspagina (/boek): leads boeken zelf een kennismakingscall bij IKnowRight.
-- Beschikbaarheid per teamlid (vaste weekuren + uitzonderingen per datum), optioneel vrij/bezet uit
-- gekoppelde agenda's, toewijzing volgens een instelbare volgorde. De publieke pagina leest NIETS
-- rechtstreeks uit deze tabellen: de server berekent de vrije momenten (service role) en geeft enkel
-- tijdstippen terug, zonder namen of agenda-inhoud. Geen enkele policy voor anon.

-- Nodig voor de exclusion constraint (geen twee boekingen tegelijk voor hetzelfde teamlid).
create extension if not exists btree_gist with schema extensions;

-- Soorten calls die je kan boeken (nu enkel "Kennismakingscall", 45 min).
create table if not exists public.booking_call_types (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(name) between 2 and 80),
  minutes int not null check (minutes between 10 and 240),
  -- Welk soort call het in het dashboard wordt (bepaalt ook de fase van de lead).
  call_kind text not null default 'sales' check (call_kind in ('setter', 'sales')),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.booking_call_types (id, name, minutes, call_kind) values ('kennismaking', 'Kennismakingscall', 45, 'sales')
on conflict (id) do nothing;

-- Eén rij met de algemene instellingen.
create table if not exists public.booking_settings (
  id boolean primary key default true check (id),
  -- Volgorde bij meerdere vrije teamleden (eerste wint).
  priority text[] not null default array['casper@iknowright.be', 'cedric@iknowright.be', 'milan@iknowright.be'],
  horizon_days int not null default 21 check (horizon_days between 1 and 90),
  step_minutes int not null default 15 check (step_minutes in (5, 10, 15, 20, 30, 60)),
  confirm_subject text not null default 'Onze kennismakingscall op {dag} {datum}',
  confirm_template text not null default E'Hey {voornaam},\n\nIk ben {teamlid} van IKnowRight. Ik zit {dag} {datum} om {uur} samen met jou. Hier is de link nog eens: {meet_link}\n\nTot dan!\n{teamlid}',
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into public.booking_settings (id) values (true) on conflict (id) do nothing;

-- Per teamlid: doet mee, meldingsadres, vrij/bezet uit de agenda.
create table if not exists public.booking_members (
  member_email text primary key references public.team_members (email) on delete cascade,
  active boolean not null default true,
  -- Leeg = het IKR-adres van het teamlid.
  notify_email text check (notify_email is null or notify_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  -- Vrij/bezet lezen uit de gekoppelde agenda's (booking_busy_sources). Standaard aan en strikt: is de
  -- agenda niet leesbaar, dan krijgt dit teamlid geen boekingen (liever geen lead dan een dubbele afspraak).
  use_busy boolean not null default true,
  busy_error text,
  busy_checked_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.booking_members (member_email)
select email from public.team_members on conflict (member_email) do nothing;

-- Vaste weekuren. weekday: 1 = maandag … 7 = zondag (ISO). Lokale Brusselse tijd.
create table if not exists public.booking_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  member_email text not null references public.team_members (email) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint booking_weekly_hours_order check (end_time > start_time)
);
create index if not exists booking_weekly_hours_member_idx on public.booking_weekly_hours (member_email, weekday);

-- Uitzonderingen voor één datum (het vaste schema blijft ongewijzigd).
-- add = extra blok; remove = blok schrappen (zonder uren = de hele dag niet beschikbaar).
create table if not exists public.booking_exceptions (
  id uuid primary key default gen_random_uuid(),
  member_email text not null references public.team_members (email) on delete cascade,
  day date not null,
  kind text not null check (kind in ('add', 'remove')),
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  created_by text,
  constraint booking_exceptions_times check (
    (start_time is null and end_time is null and kind = 'remove')
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);
create index if not exists booking_exceptions_member_day_idx on public.booking_exceptions (member_email, day);

-- Agenda's waaruit we enkel vrij/bezet lezen. provider bepaalt hoe:
--   contact_agenda = items in de contact@-agenda waarvoor het teamlid uitgenodigd is (bestaande koppeling)
--   team_agenda    = de eigen agenda-koppeling van het teamlid (Mijn koppelingen; mag ook een persoonlijk
--                    Google-account zijn), met de gekozen agenda's of calendar_ids
-- Later bij te voegen (bv. ical) zonder de tabel te wijzigen: enkel een nieuwe provider in de code.
create table if not exists public.booking_busy_sources (
  id uuid primary key default gen_random_uuid(),
  member_email text not null references public.team_members (email) on delete cascade,
  provider text not null check (provider ~ '^[a-z_]{2,40}$'),
  label text,
  -- Optioneel: ander account / andere agenda's dan de standaard van de provider.
  account_email text,
  calendar_ids text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (member_email, provider, account_email)
);

-- Standaard: de contact-agenda (weeklies, calls) en de eigen agenda-koppeling van elk teamlid.
insert into public.booking_busy_sources (member_email, provider)
select m.email, p.provider from public.team_members m cross join (values ('contact_agenda'), ('team_agenda')) as p(provider)
on conflict do nothing;

-- De boekingen zelf. De exclusion constraint maakt het onmogelijk dat twee bevestigde boekingen van
-- hetzelfde teamlid overlappen, ook bij gelijktijdige requests.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  call_type_id text not null references public.booking_call_types (id),
  member_email text not null references public.team_members (email),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'bevestigd' check (status in ('bevestigd', 'geannuleerd')),
  name text not null check (length(name) between 2 and 120),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  company text not null check (length(company) between 1 and 160),
  phone text not null check (length(phone) between 6 and 40),
  lead_id uuid references public.leads (id) on delete set null,
  call_id uuid references public.calls (id) on delete set null,
  calendar_owner text,
  calendar_event_id text,
  meet_url text,
  calendar_error text,
  lead_error text,
  notify_error text,
  confirm_error text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_ends_after_start check (ends_at > starts_at),
  constraint bookings_no_overlap exclude using gist (
    member_email with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'bevestigd')
);
create index if not exists bookings_starts_idx on public.bookings (starts_at);
create index if not exists bookings_ip_idx on public.bookings (ip_hash, created_at);

-- Pogingen per (gehasht) IP, voor rate limiting over serverinstanties heen.
create table if not exists public.booking_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists booking_attempts_ip_idx on public.booking_attempts (ip_hash, created_at desc);

-- Eigenaar (teamlid) van een lead en een call.
alter table public.leads add column if not exists owner text references public.team_members (email) on delete set null;
alter table public.calls add column if not exists owner text references public.team_members (email) on delete set null;
create index if not exists calls_owner_starts_idx on public.calls (owner, starts_at) where owner is not null;
alter table public.calls drop constraint if exists calls_created_via_check;
alter table public.calls add constraint calls_created_via_check check (created_via in ('dashboard', 'inbox', 'grokbot', 'agenda', 'boeking'));

-- RLS: enkel het team (dashboard). Geen policies voor anon: /boek gaat via de server.
do $$
declare t text;
begin
  foreach t in array array['booking_call_types', 'booking_settings', 'booking_members', 'booking_weekly_hours',
                           'booking_exceptions', 'booking_busy_sources', 'bookings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists team_only on public.%I', t);
    execute format('create policy team_only on public.%I for all to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
  end loop;
end $$;
alter table public.booking_attempts enable row level security;
-- booking_attempts: geen policies (enkel de service role).
