-- Weekly (wekelijkse teammeeting): gedeeld voor het hele team (@iknowright.be).

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@iknowright.be', false)
$$;
revoke execute on function public.is_team_member() from anon;

create table if not exists public.weeklies (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  mode text not null check (mode in ('live', 'online')),
  meet_url text,
  calendar_event_id text,
  calendar_error text,
  status text not null default 'planned' check (status in ('planned', 'started', 'concluded')),
  started_at timestamptz,
  concluded_at timestamptz,
  recording_url text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists weeklies_starts_idx on public.weeklies (starts_at desc);

create table if not exists public.weekly_todos (
  id uuid primary key default gen_random_uuid(),
  owner text not null check (owner in ('casper', 'cedric', 'milan')),
  title text not null,
  kind text not null default 'weekly' check (kind in ('weekly', 'long')),
  -- Gewone to-do: de weekly waartegen ze af moet. Leeg = de volgende weekly die nog ingepland wordt.
  weekly_id uuid references public.weeklies(id) on delete set null,
  pushed_count int not null default 0,
  done_at timestamptz,
  done_by text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists weekly_todos_weekly_idx on public.weekly_todos (weekly_id);

create table if not exists public.weekly_todo_notes (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.weekly_todos(id) on delete cascade,
  body text not null,
  author text,
  created_at timestamptz not null default now()
);
create index if not exists weekly_todo_notes_todo_idx on public.weekly_todo_notes (todo_id, created_at);

alter table public.weeklies enable row level security;
alter table public.weekly_todos enable row level security;
alter table public.weekly_todo_notes enable row level security;
drop policy if exists team_all on public.weeklies;
create policy team_all on public.weeklies for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
drop policy if exists team_all on public.weekly_todos;
create policy team_all on public.weekly_todos for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
drop policy if exists team_all on public.weekly_todo_notes;
create policy team_all on public.weekly_todo_notes for all to authenticated using (public.is_team_member()) with check (public.is_team_member());

-- Google-koppelingen (agenda, later Drive/Gmail). Tokens zijn geheim: geen policies,
-- enkel de server leest ze met de service role.
create table if not exists public.google_connections (
  email text primary key,
  refresh_token text not null,
  scopes text not null,
  connected_by text,
  connected_at timestamptz not null default now()
);
alter table public.google_connections enable row level security;
