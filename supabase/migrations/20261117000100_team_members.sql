-- Audit B7 en B14: enkel het team (niet iedereen met een @iknowright.be-adres) en de RLS-functies niet
-- aanroepbaar zonder login.
-- Pas toe VOOR of SAMEN MET de deploy van de PR "Audit 5/10" (de app laat sindsdien enkel dit team binnen).

create table if not exists public.team_members (
  email text primary key check (email = lower(email)),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.team_members enable row level security;
-- Geen policies: enkel de service role en de functies hieronder lezen deze tabel.

insert into public.team_members (email, name) values
  ('casper@iknowright.be', 'Casper'),
  ('cedric@iknowright.be', 'Cédric'),
  ('milan@iknowright.be', 'Milan')
on conflict (email) do nothing;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.active
  )
$$;

-- B14: niet aanroepbaar zonder login (de policies gebruiken ze als 'authenticated').
revoke execute on function public.is_team_member() from public, anon;
revoke execute on function public.is_sales_user() from public, anon;
grant execute on function public.is_team_member() to authenticated, service_role;
grant execute on function public.is_sales_user() to authenticated, service_role;
