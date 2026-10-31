-- Vaste search_path voor de trigger-functie
alter function public.touch_updated_at() set search_path = public;

-- is_ikr_admin() is alleen nodig voor RLS-checks van ingelogde gebruikers
revoke execute on function public.is_ikr_admin() from public, anon;
grant execute on function public.is_ikr_admin() to authenticated;

comment on table public.tiktok_accounts is
  'Bewust zonder RLS-policies: tokens zijn alleen leesbaar via de service role (server-side).';
