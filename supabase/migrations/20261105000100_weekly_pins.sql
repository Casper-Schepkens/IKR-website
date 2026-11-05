-- Prikbord op de weekly: kaartjes (links, documenten, tekst, bespreekpunten) die het hele team ziet.
-- Bedoeld voor Grok Bot ("zet die link klaar"), maar iedereen mag iets toevoegen.
-- Blijft staan tot iemand het (tijdens de weekly) leegmaakt; vastgepinde kaartjes blijven ook dan.
create table if not exists public.weekly_pins (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'tekst' check (kind in ('link', 'document', 'tekst', 'bespreekpunt')),
  title text not null check (char_length(title) between 1 and 200),
  body text check (char_length(body) <= 4000),
  url text check (url is null or url ~* '^https?://'),
  for_owner text check (for_owner is null or for_owner in ('casper', 'cedric', 'milan')),
  pinned boolean not null default false,
  created_by text,
  created_via text not null default 'dashboard' check (created_via in ('dashboard', 'grokbot')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists weekly_pins_created_idx on public.weekly_pins (created_at desc);
alter table public.weekly_pins enable row level security;
drop policy if exists team_all on public.weekly_pins;
create policy team_all on public.weekly_pins for all to authenticated
  using (public.is_team_member()) with check (public.is_team_member());

-- Live verversen.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'weekly_pins') then
    alter publication supabase_realtime add table public.weekly_pins;
  end if;
end $$;
