-- Audit "database" (PR 7/10). Niet automatisch toegepast: eerst nakijken, dan toepassen in Supabase.
-- Vereist: 20261117000100_team_members.sql (PR 5/10) is al toegepast.
-- Alle checks hieronder zijn op 17 november 2026 nagekeken tegen de bestaande rijen.

-- ─── D1: een lead verwijderen wist geen calls of verstuurde mails meer ───────────
-- De app verwijdert eerst de open concepten en weigert als er calls of verstuurde mails zijn.
alter table public.calls drop constraint if exists calls_lead_id_fkey;
alter table public.calls add constraint calls_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete restrict;
alter table public.mail_drafts drop constraint if exists mail_drafts_lead_id_fkey;
alter table public.mail_drafts add constraint mail_drafts_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete restrict;

-- ─── D2: een klant met productie kan niet zomaar weg ─────────────────────────────
alter table public.production drop constraint if exists production_client_id_fkey;
alter table public.production add constraint production_client_id_fkey foreign key (client_id) references public.clients(id) on delete restrict;

-- ─── D4: vaste lijsten in plaats van vrije tekst ────────────────────────────────
alter table public.ai_jobs drop constraint if exists ai_jobs_type_check;
alter table public.ai_jobs add constraint ai_jobs_type_check
  check (type in ('inbox_reply', 'na_verzending', 'call_verwerken', 'mail_rewrite', 'chat', 'werkplek', 'contract_afleiden', 'weekly_sops', 'style_profile'));

alter table public.finance_transactions drop constraint if exists finance_transactions_category_check;
alter table public.finance_transactions add constraint finance_transactions_category_check
  check (category in ('klant', 'vennoot_in', 'terug', 'overig_in', 'freelancer', 'boosting', 'marketing', 'tools', 'boekhouder', 'vennoten',
                      'vervoer', 'onkosten', 'materiaal', 'overheid', 'overig_uit', 'btw', 'onbekend'));
alter table public.finance_rules drop constraint if exists finance_rules_category_check;
alter table public.finance_rules add constraint finance_rules_category_check
  check (category in ('klant', 'vennoot_in', 'terug', 'overig_in', 'freelancer', 'boosting', 'marketing', 'tools', 'boekhouder', 'vennoten',
                      'vervoer', 'onkosten', 'materiaal', 'overheid', 'overig_uit', 'btw', 'onbekend'));

alter table public.sops drop constraint if exists sops_category_check;
alter table public.sops add constraint sops_category_check
  check (category in ('draaidagen', 'creatief', 'klanten', 'freelancers', 'sales', 'contracten', 'intern', 'overig'));

alter table public.bot_cards drop constraint if exists bot_cards_owner_fkey;
alter table public.bot_cards add constraint bot_cards_owner_fkey foreign key (owner_email) references public.team_members(email);
alter table public.team_google drop constraint if exists team_google_member_fkey;
alter table public.team_google add constraint team_google_member_fkey foreign key (member_email) references public.team_members(email) on delete cascade;
alter table public.team_profiles drop constraint if exists team_profiles_email_fkey;
alter table public.team_profiles add constraint team_profiles_email_fkey foreign key (email) references public.team_members(email) on delete cascade;

-- ─── C15: constraints volgen de code ─────────────────────────────────────────────
alter table public.mail_drafts drop constraint if exists mail_drafts_from_email_check;
alter table public.mail_drafts add constraint mail_drafts_from_email_check check (from_email = 'casper@iknowright.be');
alter table public.style_profiles drop constraint if exists style_profiles_key_check;
alter table public.style_profiles add constraint style_profiles_key_check check (key = 'casper');
alter table public.style_feedback drop constraint if exists style_feedback_key_check;
alter table public.style_feedback add constraint style_feedback_key_check check (key = 'casper');

-- ─── C5: "enkel op tegenpartij" bewaren bij een eigen regel ──────────────────────
alter table public.finance_rules add column if not exists field text not null default 'alles' check (field in ('alles', 'tegenpartij'));

-- ─── D5: de twee filters op JSON-velden een index geven ──────────────────────────
create index if not exists ai_jobs_chat_user_idx on public.ai_jobs ((input ->> 'user_id'), status, created_at) where type = 'chat';
create index if not exists bot_actions_lead_idx on public.bot_actions ((args ->> 'lead_id'), created_at desc) where args ? 'lead_id';
create index if not exists bot_actions_tool_idx on public.bot_actions (tool, created_at desc);

-- ─── D8: Realtime enkel voor wat het dashboard toont ─────────────────────────────
-- De chat en de inbox volgen hun AI-taak zelf; het log hoeft niet naar elke browser.
do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bot_actions') then
    alter publication supabase_realtime drop table public.bot_actions;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'ai_jobs') then
    alter publication supabase_realtime drop table public.ai_jobs;
  end if;
end $$;

-- ─── D9: updated_at door de database ─────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array['mail_drafts', 'calls', 'clients', 'sops', 'bot_cards', 'production', 'production_steps', 'call_transcripts',
                           'weekly_pins', 'team_google', 'team_profiles', 'style_profiles'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ─── B10: financiën enkel lezen voor ingelogde teamleden (de server schrijft met de service role) ──
do $$
declare t text;
begin
  foreach t in array array['finance_transactions', 'finance_rules', 'finance_state'] loop
    execute format('drop policy if exists team_all on public.%I', t);
    execute format('drop policy if exists team_read on public.%I', t);
    execute format('create policy team_read on public.%I for select to authenticated using (public.is_team_member())', t);
  end loop;
end $$;
