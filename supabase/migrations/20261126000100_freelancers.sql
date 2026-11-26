-- Freelancers: één centrale lijst van onze freelancers (filmen, monteren, contentplanning, schermgezichten),
-- zodat we zien wie bij welke klant zit en bij een afzegging snel iemand vinden die het al bewezen heeft.
-- Zichtbaar en aanpasbaar voor het hele team (zelfde RLS als clients en sops). Start leeg: geen voorbeelddata.
--
-- score = de fase uit Milans kleurensysteem (geen aparte fase of cijfer):
--   rood      goed vermoeden dat ze het kunnen, nog niets bewezen voor IKR
--   oranje    heeft de laboratoriumtest bij IKR gedaan (klein idee bedenken, filmen, monteren)
--   groen     heeft één opdracht voor een klant uitgevoerd, gecheckt door Milan, Cédric of een groene freelancer
--   zekerheid heeft al veel gedaan, we zijn zeker dat ze het kunnen
create table if not exists public.freelancers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 50),
  score text check (score in ('rood', 'oranje', 'groen', 'zekerheid')),
  -- Klanten / opdrachten: vrije tekst, plus (optioneel) koppelingen aan klanten in het dashboard.
  assignments text check (char_length(assignments) <= 2000),
  client_ids uuid[] not null default '{}',
  -- Portfolio (link); enkel http(s), de app controleert dat ook.
  portfolio_url text check (char_length(portfolio_url) <= 2000 and portfolio_url ~* '^https?://'),
  -- Bron en opmerking.
  notes text check (char_length(notes) <= 4000),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists freelancers_name_idx on public.freelancers (lower(name));

alter table public.freelancers enable row level security;
drop policy if exists team_all on public.freelancers;
create policy team_all on public.freelancers for all to authenticated
  using (public.is_team_member()) with check (public.is_team_member());

-- updated_at door de database (zoals de andere teamtabellen).
drop trigger if exists touch_updated_at on public.freelancers;
create trigger touch_updated_at before update on public.freelancers
  for each row execute function public.touch_updated_at();

-- Wordt een klant verwijderd, dan verdwijnt de koppeling bij de freelancers mee (geen losse id's).
create or replace function public.freelancers_drop_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.freelancers set client_ids = array_remove(client_ids, old.id) where old.id = any (client_ids);
  return old;
end
$$;
revoke execute on function public.freelancers_drop_client() from public, anon, authenticated;
drop trigger if exists freelancers_drop_client on public.clients;
create trigger freelancers_drop_client after delete on public.clients
  for each row execute function public.freelancers_drop_client();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'freelancers') then
    alter publication supabase_realtime add table public.freelancers;
  end if;
end $$;
