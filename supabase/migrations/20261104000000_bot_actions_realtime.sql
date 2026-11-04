-- Live verversen in het dashboard: Realtime stuurt inserts in bot_actions door (RLS blijft gelden,
-- dus enkel de sales-gebruiker ontvangt ze).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bot_actions'
  ) then
    alter publication supabase_realtime add table public.bot_actions;
  end if;
end $$;
