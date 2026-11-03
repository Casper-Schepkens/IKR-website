-- Context bij een mailconcept: de bot beschrijft wie de lead is, wat er al gebeurde en waarom deze mail.
alter table public.mail_drafts add column if not exists context text;
