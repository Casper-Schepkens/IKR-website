-- WhatsApp: interne chats (bv. de teamgroep van IKR) zonder lead of klant, en bron van een bericht
-- (bridge of import uit "Chat exporteren").
alter table public.whatsapp_chats add column if not exists intern boolean not null default false;
alter table public.whatsapp_berichten add column if not exists bron text not null default 'bridge' check (bron in ('bridge', 'import'));
create index if not exists whatsapp_berichten_tijd_all_idx on public.whatsapp_berichten (tijdstip desc);
