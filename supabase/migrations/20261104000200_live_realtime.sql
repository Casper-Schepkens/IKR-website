-- Live verversen: Realtime stuurt wijzigingen in deze tabellen door naar het dashboard.
-- RLS blijft gelden: sales-tabellen enkel voor casper@, weekly voor het team.
do $$
declare t text;
begin
  foreach t in array array['bot_actions', 'ai_jobs', 'leads', 'mail_drafts', 'weeklies', 'weekly_todos', 'weekly_todo_notes'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
