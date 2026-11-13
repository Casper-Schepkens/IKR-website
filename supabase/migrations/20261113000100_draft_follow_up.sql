-- Mailconcept: optioneel eigen "volgende actie" en opvolgdatum voor de lead na het versturen.
-- Leeg = standaard ("antwoord opvolgen", 5 werkdagen na verzending).
alter table public.mail_drafts
  add column if not exists follow_up_action text,
  add column if not exists follow_up_on date;
