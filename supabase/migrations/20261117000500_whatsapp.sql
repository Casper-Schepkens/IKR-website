-- WhatsApp (read-only bridge, zie whatsapp-bridge/): gedetecteerde chats en berichten van actieve chats.
-- De bridge schrijft met de service role. Van chats die niet actief zijn, komt enkel metadata hierin
-- (naam, laatste activiteit, sleutel van het laatste bericht), nooit de inhoud.

create table if not exists public.whatsapp_chats (
  jid text primary key check (jid ~ '@(s\.whatsapp\.net|g\.us|lid)$'),
  naam text check (char_length(naam) <= 300),
  is_groep boolean not null default false,
  lead_id uuid references public.leads(id) on delete set null,
  klant_id uuid references public.clients(id) on delete set null,
  actief boolean not null default false,
  laatst_actief timestamptz,
  -- Sleutel van het laatste bericht (geen inhoud): nodig om eventueel oudere berichten op te vragen.
  laatste_bericht_id text,
  laatste_bericht_van_mij boolean,
  historiek_opgevraagd_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_chats_lead_idx on public.whatsapp_chats (lead_id) where lead_id is not null;
create index if not exists whatsapp_chats_klant_idx on public.whatsapp_chats (klant_id) where klant_id is not null;
create index if not exists whatsapp_chats_actief_idx on public.whatsapp_chats (actief) where actief;
create index if not exists whatsapp_chats_laatst_idx on public.whatsapp_chats (laatst_actief desc nulls last);

create table if not exists public.whatsapp_berichten (
  jid text not null references public.whatsapp_chats(jid) on delete cascade,
  id text not null,
  richting text not null check (richting in ('in', 'uit')),
  tekst text check (char_length(tekst) <= 20000),
  media_type text check (media_type in ('image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'poll', 'other')),
  tijdstip timestamptz not null,
  -- Bij groepen: wie het bericht stuurde.
  afzender text check (char_length(afzender) <= 300),
  created_at timestamptz not null default now(),
  primary key (jid, id)
);
create index if not exists whatsapp_berichten_tijd_idx on public.whatsapp_berichten (jid, tijdstip desc);

-- Zelfde toegang als sales (hele team via is_sales_user); de bridge en Grok Bot via de service role.
do $$
declare t text;
begin
  foreach t in array array['whatsapp_chats', 'whatsapp_berichten'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists sales_all on public.%I', t);
    execute format('create policy sales_all on public.%I for all to authenticated using ((select public.is_sales_user())) with check ((select public.is_sales_user()))', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
