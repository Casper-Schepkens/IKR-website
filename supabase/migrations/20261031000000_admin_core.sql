-- IKR Admin — kernschema
-- Draai dit in Supabase (SQL Editor of `supabase db push`).
-- Alle tabellen staan achter RLS: alleen ingelogde IKR-admins (zie is_ikr_admin) mogen lezen/schrijven.
-- Server-side jobs (cron, formulieren, webhooks) gebruiken de service role en omzeilen RLS.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Toegang
-- ─────────────────────────────────────────────────────────────

create table if not exists public.admin_users (
  email text primary key,
  name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Wie in /admin mag. Adressen op @iknowright.be mogen altijd; andere adressen (bv. gmail) moeten hier staan.';

create or replace function public.is_ikr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'email') ilike '%@iknowright.be'
    or exists (
      select 1 from public.admin_users au
      where lower(au.email) = lower(auth.jwt() ->> 'email') and au.active
    ),
    false
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- CRM
-- ─────────────────────────────────────────────────────────────

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  stage text not null default 'lead'
    check (stage in ('lead','sales_call','ideas','proposal','signed','shoot_planned','editing','live','churned')),
  stage_changed_at timestamptz not null default now(),
  owner text,                       -- 'casper' | 'cedric' | vrij
  source text,                      -- 'contactformulier' | 'pricingformulier' | 'doorverwezen' | ...
  sector text,
  website text,
  tiktok_handle text,
  drive_folder_url text,
  vat_number text,                  -- voor Billit (BE0123456789)
  billing_email text,
  summary text,                     -- korte omschrijving
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contacts_client_idx on public.contacts(client_id);

-- Notities, calls, systeemgebeurtenissen en AI-samenvattingen: één tijdlijn per klant
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note','call','email','system','ai')),
  title text,
  body text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists activities_client_idx on public.activities(client_id, created_at desc);

create table if not exists public.pipeline_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by text,
  created_at timestamptz not null default now()
);
create index if not exists pipeline_events_client_idx on public.pipeline_events(client_id, created_at desc);

-- Wat de AI over een klant weet (laag 2 van de context)
create table if not exists public.client_profiles (
  client_id uuid primary key references public.clients(id) on delete cascade,
  brand_summary text,
  tone_of_voice text,
  target_audience text,
  what_works text,
  avoid text,
  learnings text,
  updated_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  type text not null,               -- 'contact' | 'pricing'
  payload jsonb not null,
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Contracten & facturen (facturen zelf worden in Billit gemaakt)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  package_name text,
  videos_per_month int,
  monthly_amount_cents int not null default 0,
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','quarterly','one_off')),
  billing_day int not null default 1 check (billing_day between 1 and 28),
  start_date date not null,
  end_date date,
  renewal_notice_days int not null default 30,
  status text not null default 'active' check (status in ('draft','active','ended')),
  billit_customer_id text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists contracts_client_idx on public.contracts(client_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  label text,                       -- bv. 'November 2026'
  send_date date not null,          -- wanneer de factuur de deur uit moet
  amount_cents int not null,
  status text not null default 'to_send'
    check (status in ('to_send','draft','sent','paid','overdue','cancelled')),
  billit_invoice_id text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contract_id, send_date)
);
create index if not exists invoices_client_idx on public.invoices(client_id, send_date desc);

-- ─────────────────────────────────────────────────────────────
-- Kalender
-- ─────────────────────────────────────────────────────────────

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  kind text not null default 'meeting' check (kind in ('shoot','sales_call','meeting','deadline','other')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  attendees text[] not null default '{}',
  notes text,
  brief jsonb,                      -- AI-draaiboek voor draaidagen
  google_event_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists calendar_events_start_idx on public.calendar_events(starts_at);

-- ─────────────────────────────────────────────────────────────
-- Content: ideeën, templates, decks
-- ─────────────────────────────────────────────────────────────

create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  summary text,
  format text,
  status text not null default 'proposal'
    check (status in ('proposal','developed','approved','rejected','produced')),
  source text not null default 'ai' check (source in ('ai','manual','grok')),
  hook text,
  structure jsonb not null default '[]',
  shots jsonb not null default '[]',
  needs jsonb not null default '[]',
  cta text,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_ideas_client_idx on public.content_ideas(client_id, created_at desc);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'deck',
  description text,
  storage_path text,                -- pad in Supabase Storage bucket 'templates'
  anthropic_file_id text,           -- na upload naar de Claude Files API
  created_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  title text not null,
  idea_ids uuid[] not null default '{}',
  status text not null default 'queued' check (status in ('queued','generating','ready','failed')),
  storage_path text,
  error text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Resultaten (TikTok)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tiktok_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  open_id text unique,
  handle text,
  display_name text,
  access_token text,                -- alleen via service role; nooit naar de browser
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  connected_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  tiktok_video_id text unique,
  title text,
  cover_url text,
  share_url text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists videos_client_idx on public.videos(client_id, published_at desc);

create table if not exists public.video_stats_snapshots (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0
);
create index if not exists video_stats_video_idx on public.video_stats_snapshots(video_id, captured_at desc);

-- ─────────────────────────────────────────────────────────────
-- IKR-brein & AI-log
-- ─────────────────────────────────────────────────────────────

create table if not exists public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  body text not null default '',
  sort_order int not null default 0,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  task text not null,
  client_id uuid references public.clients(id) on delete set null,
  model text,
  status text not null default 'ok' check (status in ('ok','error')),
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  output jsonb,
  error text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists ai_runs_task_idx on public.ai_runs(task, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

drop trigger if exists content_ideas_touch on public.content_ideas;
create trigger content_ideas_touch before update on public.content_ideas
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS: alles alleen voor IKR-admins
-- ─────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'admin_users','clients','contacts','activities','pipeline_events','client_profiles',
    'form_submissions','contracts','invoices','calendar_events','content_ideas','templates',
    'decks','videos','video_stats_snapshots','knowledge_docs','ai_runs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists ikr_admin_all on public.%I', t);
    execute format(
      'create policy ikr_admin_all on public.%I for all to authenticated using (public.is_ikr_admin()) with check (public.is_ikr_admin())',
      t
    );
  end loop;
end $$;

-- TikTok-tokens: zelfs admins lezen ze niet via de browser — alleen service role.
alter table public.tiktok_accounts enable row level security;

-- Opslag voor templates en gegenereerde decks (privé)
insert into storage.buckets (id, name, public)
values ('templates', 'templates', false), ('decks', 'decks', false)
on conflict (id) do nothing;

drop policy if exists ikr_admin_storage on storage.objects;
create policy ikr_admin_storage on storage.objects for all to authenticated
  using (bucket_id in ('templates','decks') and public.is_ikr_admin())
  with check (bucket_id in ('templates','decks') and public.is_ikr_admin());

-- ─────────────────────────────────────────────────────────────
-- Startinhoud IKR-brein (pas aan in /admin/kennis)
-- ─────────────────────────────────────────────────────────────

insert into public.knowledge_docs (slug, title, body, sort_order) values
('wie-we-zijn', 'Wie we zijn', 'IKnowRight (IKR) is een TikTok-bureau voor food brands in Vlaanderen. We bedenken, filmen en monteren TikTok-content voor merken, en volgen de resultaten op.

[Vul aan: team, sinds wanneer, waar jullie gevestigd zijn.]', 10),
('aanpak', 'Onze aanpak', 'Analyse → Creatie → Iteratie.
- Analyse: merk, doelgroep en wat al werkt op TikTok.
- Creatie: ideeën, draaidag, montage.
- Iteratie: resultaten opvolgen en bijsturen op basis van wat werkt.

[Vul aan met jullie eigen werkwijze.]', 20),
('tone-of-voice', 'Tone of voice', '[Hoe klinkt IKR? Hoe schrijven we hooks en captions? Wat doen we nooit?]', 30),
('wat-werkt', 'Wat werkt op TikTok', '[Jullie lessen: sterke hooks, formats die scoren, ideale lengte, reeksen, mensen in beeld, …]', 40),
('pakketten', 'Pakketten & prijzen', '[Pakketten, aantallen video''s per maand, prijsrichtlijnen. Wordt gebruikt voor voorstellen en verlengingen.]', 50)
on conflict (slug) do nothing;

-- Voeg hier adressen toe die niet op @iknowright.be eindigen:
-- insert into public.admin_users (email, name) values ('jouw@gmail.com', 'Casper');
