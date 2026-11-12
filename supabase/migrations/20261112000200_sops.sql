-- SOP's: afspraken en best practices van het team, per categorie. Zichtbaar en aanpasbaar voor het hele team.
-- status: afgesproken (geldt), voorstel (bv. door Grokbot uit een weekly; vinkje of kruisje), verouderd.
create table if not exists public.sops (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 20000),
  category text not null default 'overig',
  status text not null default 'afgesproken' check (status in ('afgesproken', 'voorstel', 'verouderd')),
  source text check (char_length(source) <= 300),
  source_url text,
  quote text check (char_length(quote) <= 2000),
  created_by text,
  created_via text not null default 'dashboard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sops_category_idx on public.sops (category);
alter table public.sops enable row level security;
drop policy if exists team_all on public.sops;
create policy team_all on public.sops for all to authenticated
  using (public.is_team_member()) with check (public.is_team_member());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sops') then
    alter publication supabase_realtime add table public.sops;
  end if;
end $$;
