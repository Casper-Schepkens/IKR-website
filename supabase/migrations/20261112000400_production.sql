-- Productieproces per klant (onboarding + cyclus per draaidag). Hele team; Grokbot via de service role.
create table if not exists public.production (
  client_id uuid primary key references public.clients(id) on delete cascade,
  signed_on date,
  kickoff_on date,
  strategy_on date,
  active boolean not null default true,
  note text check (char_length(note) <= 4000),
  updated_at timestamptz not null default now()
);
create table if not exists public.production_cycles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  no int not null check (no >= 1),
  shoot_on date,
  shoot_time text check (shoot_time ~ '^\d{2}:\d{2}$'),
  calendar_event_id text,
  created_at timestamptz not null default now(),
  unique (client_id, no)
);
-- Enkel wat afwijkt van de berekening (afgevinkt, eigen deadline, link, notitie).
create table if not exists public.production_steps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cycle_id uuid references public.production_cycles(id) on delete cascade,
  step text not null,
  done_at timestamptz,
  done_by text,
  due_on date,
  link text,
  note text check (char_length(note) <= 4000),
  updated_at timestamptz not null default now()
);
create unique index if not exists production_steps_key on public.production_steps (client_id, coalesce(cycle_id, '00000000-0000-0000-0000-000000000000'::uuid), step);

do $$
declare t text;
begin
  foreach t in array array['production', 'production_cycles', 'production_steps'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists team_all on public.%I', t);
    execute format('create policy team_all on public.%I for all to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
