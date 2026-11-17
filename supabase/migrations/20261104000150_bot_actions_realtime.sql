-- Stond al in productie (versie 20261104080601) maar ontbrak in de repo. Letterlijk overgenomen.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bot_actions'
  ) then
    alter publication supabase_realtime add table public.bot_actions;
  end if;
end $$;
