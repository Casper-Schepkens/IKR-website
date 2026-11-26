-- Ideeëndoc na elke draaidag: nieuw AI-taaktype `ideeendoc` (Grok Bot zet een Google Doc met
-- contentideeën klaar en het dashboard hangt de link aan "ideeen_uitwerken" van de volgende draaidag).
-- Eén taak per klant + draaidag: de bestaande unieke index ai_jobs_ref_key (type, ref) met
-- ref = 'ideeendoc:<client_id>:<nr>' maakt dat dubbel aanmaken onmogelijk is.
alter table public.ai_jobs drop constraint if exists ai_jobs_type_check;
alter table public.ai_jobs add constraint ai_jobs_type_check
  check (type in ('inbox_reply', 'na_verzending', 'call_verwerken', 'mail_rewrite', 'chat', 'werkplek', 'contract_afleiden', 'weekly_sops', 'style_profile', 'ideeendoc'));

-- Klantfiche (begin): wat Grok Bot nodig heeft om ideeën te bedenken, en de Drive-map van de klant.
-- Allemaal optioneel; leeg = Grok Bot zoekt het zelf op (strategie- en kick-off-documenten in de Drive).
alter table public.clients add column if not exists content_goal text check (char_length(content_goal) <= 2000);
alter table public.clients add column if not exists niche text check (char_length(niche) <= 500);
alter table public.clients add column if not exists audience text check (char_length(audience) <= 2000);
alter table public.clients add column if not exists available text check (char_length(available) <= 2000);
alter table public.clients add column if not exists drive_folder_id text check (drive_folder_id ~ '^[\w-]{10,}$');
