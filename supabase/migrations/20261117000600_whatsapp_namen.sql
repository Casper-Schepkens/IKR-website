-- WhatsApp-namen: telefoonnummer bij chats met een anoniem id (@lid) en een eigen naam uit het dashboard
-- (gaat voor op de naam die de bridge uit WhatsApp haalt).
alter table public.whatsapp_chats add column if not exists telefoon text check (telefoon ~ '^\+\d{6,16}$');
alter table public.whatsapp_chats add column if not exists naam_eigen text check (char_length(naam_eigen) <= 300);

-- Groepen met het hele team (Casper, Milan en Cédric): meestal klantgroepen, die komen bovenaan.
alter table public.whatsapp_chats add column if not exists hele_team boolean not null default false;
alter table public.whatsapp_chats add column if not exists deelnemers int check (deelnemers >= 0);
