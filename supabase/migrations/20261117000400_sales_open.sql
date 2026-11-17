-- Sales open voor het hele team: elk teamlid mag leads, inbox, concepten, calls en cold mails zien en gebruiken.
-- Alle sales-policies gebruiken is_sales_user(); die volgt nu is_team_member() (uit 20261117000100_team_members).
-- Welke pagina's iemand in zijn menu ziet, kiest hij zelf in Instellingen (team_profiles.nav_hidden).
-- Pas toe NA 20261117000100_team_members en VOOR of SAMEN MET de deploy van deze PR.

create or replace function public.is_sales_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_team_member()
$$;
revoke execute on function public.is_sales_user() from public, anon;
grant execute on function public.is_sales_user() to authenticated, service_role;

-- Verborgen pagina's in het menu, per persoon. null = standaard (Casper: alles; anderen: sales verborgen).
alter table public.team_profiles add column if not exists nav_hidden text[];
