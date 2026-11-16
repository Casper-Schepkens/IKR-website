-- Productie volledig data-gedreven:
-- workflow-sjablonen (opstart + per draaidag), per klant een aanpasbare kopie, draaidag-ritme,
-- terugkerende interne taken en een wijzigingslog met terugdraaien.
-- Bestaande data blijft: afgevinkte stappen (production_steps) hangen aan dezelfde stapsleutels.

create table if not exists public.production_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists production_templates_one_default on public.production_templates (is_default) where is_default;

create table if not exists public.production_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.production_templates(id) on delete cascade,
  phase text not null check (phase in ('opstart', 'draaidag')),
  position int not null default 0,
  key text not null check (key ~ '^[a-z0-9_]{1,60}$'),
  title text not null check (char_length(title) between 1 and 200),
  owner text not null check (owner in ('casper', 'cedric', 'milan', 'freelancer', 'klant')),
  rule jsonb not null default '{"kind":"none"}'::jsonb,
  done_when text check (done_when in ('getekend', 'kickoff', 'strategie', 'draaidag')),
  is_shoot boolean not null default false,
  link text check (link ~ '^https://'),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (template_id, key)
);
create index if not exists production_template_steps_template_idx on public.production_template_steps (template_id, phase, position);

create table if not exists public.production_client_steps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  phase text not null check (phase in ('opstart', 'draaidag')),
  position int not null default 0,
  key text not null check (key ~ '^[a-z0-9_]{1,60}$'),
  title text not null check (char_length(title) between 1 and 200),
  owner text not null check (owner in ('casper', 'cedric', 'milan', 'freelancer', 'klant')),
  rule jsonb not null default '{"kind":"none"}'::jsonb,
  done_when text check (done_when in ('getekend', 'kickoff', 'strategie', 'draaidag')),
  is_shoot boolean not null default false,
  link text check (link ~ '^https://'),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (client_id, key)
);
create index if not exists production_client_steps_client_idx on public.production_client_steps (client_id, phase, position);

-- Draaidag-ritme per klant: {"kind":"weeks","n":3} of {"kind":"monthly","nth":2,"weekday":0}.
alter table public.production add column if not exists rhythm jsonb;

create table if not exists public.production_internal_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  owner text not null check (owner in ('casper', 'cedric', 'milan')),
  -- {"kind":"weekly","weekday":1} of {"kind":"monthly","nth":-1,"weekday":1}
  schedule jsonb not null,
  link text check (link ~ '^https://'),
  note text check (char_length(note) <= 2000),
  active boolean not null default true,
  start_on date not null default current_date,
  created_at timestamptz not null default now()
);
create table if not exists public.production_internal_done (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.production_internal_tasks(id) on delete cascade,
  occurrence date not null,
  done_at timestamptz not null default now(),
  done_by text,
  created_at timestamptz not null default now(),
  unique (task_id, occurrence)
);

-- Wijzigingslog: één regel per actie, met elke rij ervoor en erna (om terug te draaien).
create table if not exists public.production_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  by text not null,
  summary text not null,
  client_id uuid references public.clients(id) on delete set null,
  changes jsonb not null,
  reverted_at timestamptz,
  reverted_by text,
  revert_of uuid references public.production_changes(id) on delete set null
);
create index if not exists production_changes_created_idx on public.production_changes (created_at desc);
create index if not exists production_changes_client_idx on public.production_changes (client_id, created_at desc);
create index if not exists production_changes_revert_of_idx on public.production_changes (revert_of);

-- Standaard-sjabloon = de stappen zoals ze tot nu vast in de code stonden (zelfde sleutels).
do $$
declare tid uuid;
begin
  select id into tid from public.production_templates where is_default;
  if tid is null then
    insert into public.production_templates (name, is_default) values ('Standaard', true) returning id into tid;
    insert into public.production_template_steps (template_id, phase, position, key, title, owner, rule, done_when, is_shoot, note)
    select tid, v.* from (values
  ('opstart', 10, 'contract', 'Getekend contract in de groep en in de Drive', 'casper', '{"kind":"offset","anchor":"getekend","days":7}'::jsonb, null, false, 'In de WhatsApp-groep naar Milan en Cédric (die tekenen ook), daarna in de Drive-map van de klant.'),
  ('opstart', 20, 'groep', 'WhatsApp-groep met de klant en de freelancer', 'cedric', '{"kind":"offset","anchor":"getekend","days":7}'::jsonb, null, false, 'Meteen na ondertekening.'),
  ('opstart', 30, 'freelancer', 'Freelancer regelen (vóór de kick-off)', 'milan', '{"kind":"offset","anchor":"getekend","days":7}'::jsonb, null, false, 'De freelancer gaat mee in de groep.'),
  ('opstart', 40, 'kickoff_plannen', 'Kick-off plannen via een poll in de groep', 'cedric', '{"kind":"offset","anchor":"getekend","days":7}'::jsonb, 'kickoff', false, null),
  ('opstart', 50, 'kickoff', 'Kick-off meeting (online)', 'cedric', '{"kind":"offset","anchor":"kickoff","days":0}'::jsonb, null, false, 'Klant, Cédric, Milan en de freelancer. Vragen: zie het kick-off-document.'),
  ('opstart', 60, 'strategie', 'Contentstrategie en PowerPoint', 'cedric', '{"kind":"offset","anchor":"kickoff","days":14}'::jsonb, null, false, null),
  ('opstart', 70, 'ideeen', 'Eerste contentideeën bij de strategie', 'milan', '{"kind":"offset","anchor":"kickoff","days":14}'::jsonb, null, false, null),
  ('opstart', 80, 'strategiemeeting', 'Strategiemeeting: strategie en ideeën voorstellen', 'cedric', '{"kind":"offset","anchor":"strategie","days":0,"fallback":{"anchor":"kickoff","days":14}}'::jsonb, null, false, null),
  ('opstart', 90, 'feedback', 'Feedbackronde op de strategie verwerken', 'cedric', '{"kind":"offset","anchor":"strategie","days":7}'::jsonb, null, false, 'De klant krijgt 1 feedbackronde.'),
  ('draaidag', 10, 'draaidag_plannen', 'Draaidag plannen', 'cedric', '{"kind":"offset","anchor":"vorige_draaidag","days":21,"fallback":{"anchor":"strategie","days":7}}'::jsonb, 'draaidag', false, null),
  ('draaidag', 20, 'ideeen_uitwerken', 'Ideeën bijschaven, uitschrijven en naar Cédric', 'milan', '{"kind":"offset","anchor":"draaidag","days":-8}'::jsonb, null, false, 'De freelancer mag meedenken (bv. via een call), maar hoeft niet.'),
  ('draaidag', 30, 'briefing', 'Briefing in de groep', 'cedric', '{"kind":"offset","anchor":"draaidag","days":-7}'::jsonb, null, false, 'Contentideeën, locatie, wanneer (dag en uren) en met wie.'),
  ('draaidag', 40, 'greenlight', 'Greenlight van de klant', 'klant', '{"kind":"offset","anchor":"draaidag","days":-5}'::jsonb, null, false, '2 dagen om feedback te geven en goed te keuren; snel antwoorden op vragen (materiaal, kostuums).'),
  ('draaidag', 50, 'draaidag', 'Draaidag', 'freelancer', '{"kind":"offset","anchor":"draaidag","days":0}'::jsonb, null, true, null),
  ('draaidag', 60, 'montage', 'Alle video''s gemonteerd in de groep', 'freelancer', '{"kind":"offset","anchor":"draaidag","days":7}'::jsonb, null, false, null),
  ('draaidag', 70, 'revisie', 'Revisieronde van de klant', 'klant', '{"kind":"offset","anchor":"draaidag","days":14}'::jsonb, null, false, 'Enkel kleine montage-aanpassingen.'),
  ('draaidag', 80, 'online', 'Aanpassingen doorgevoerd, eerste video online en contentplanning doorgestuurd', 'freelancer', '{"kind":"offset","anchor":"draaidag","days":21}'::jsonb, null, false, null)
    ) as v(phase, position, key, title, owner, rule, done_when, is_shoot, note);
  end if;

  -- Elke klant die al in productie is, krijgt een eigen kopie (afgevinkte stappen blijven gekoppeld via de sleutel).
  insert into public.production_client_steps (client_id, phase, position, key, title, owner, rule, done_when, is_shoot, link, note)
  select p.client_id, s.phase, s.position, s.key, s.title, s.owner, s.rule, s.done_when, s.is_shoot, s.link, s.note
  from public.production p
  cross join public.production_template_steps s
  where s.template_id = tid
    and not exists (select 1 from public.production_client_steps c where c.client_id = p.client_id);
end $$;

do $$
declare t text;
begin
  foreach t in array array['production_templates', 'production_template_steps', 'production_client_steps', 'production_internal_tasks', 'production_internal_done', 'production_changes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists team_all on public.%I', t);
    execute format('create policy team_all on public.%I for all to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
