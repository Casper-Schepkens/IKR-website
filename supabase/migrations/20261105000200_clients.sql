-- Klanten (productie): overzicht per klant. Start klein (naam, freelancer, einde contract) en groeit
-- later (draaidagen, content-kalender, ... zie docs/product/klanten.md). Zichtbaar voor het hele team.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  freelancer text check (char_length(freelancer) <= 200),
  contract_end date,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists clients_name_key on public.clients (lower(name));
alter table public.clients enable row level security;
drop policy if exists team_all on public.clients;
create policy team_all on public.clients for all to authenticated
  using (public.is_team_member()) with check (public.is_team_member());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clients') then
    alter publication supabase_realtime add table public.clients;
  end if;
end $$;
