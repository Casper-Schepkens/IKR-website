-- Snelheid (Supabase performance advisor):
-- 1) RLS: auth.uid()/auth.jwt() in een subselect, zodat Postgres ze één keer per query uitrekent i.p.v. per rij.
-- 2) Indexen op foreign keys (joins en cascades bij verwijderen).

alter policy ai_chat_own_insert on public.ai_chat
  with check ((user_id = (select auth.uid())) and (role = 'user') and public.is_team_member());

alter policy ai_chat_own_read on public.ai_chat
  using ((user_id = (select auth.uid())) and public.is_team_member());

alter policy own_read on public.bot_cards
  using (
    lower(owner_email) = lower((select auth.jwt() ->> 'email'))
    or lower((select auth.jwt() ->> 'email')) = 'casper@iknowright.be'
  );

alter policy own_read on public.bot_card_messages
  using (
    exists (
      select 1 from public.bot_cards c
      where c.id = bot_card_messages.card_id
        and (
          lower(c.owner_email) = lower((select auth.jwt() ->> 'email'))
          or lower((select auth.jwt() ->> 'email')) = 'casper@iknowright.be'
        )
    )
  );

create index if not exists bot_cards_client_idx on public.bot_cards (client_id);
create index if not exists call_transcripts_call_idx on public.call_transcripts (call_id);
create index if not exists calls_thank_you_draft_idx on public.calls (thank_you_draft_id);
create index if not exists clients_contract_job_idx on public.clients (contract_job_id);
create index if not exists finance_rules_client_idx on public.finance_rules (client_id);
create index if not exists finance_transactions_client_idx on public.finance_transactions (client_id);
create index if not exists production_steps_cycle_idx on public.production_steps (cycle_id);
create index if not exists weekly_todos_pushed_from_idx on public.weekly_todos (pushed_from);
