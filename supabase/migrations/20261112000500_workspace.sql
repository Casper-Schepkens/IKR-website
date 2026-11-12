-- Werkplek van Grok Bot: per teamlid kaarten die de bot klaarzet (bespreken, brainstorm, vraag, update,
-- opdracht), met een eigen draadje en optioneel een voorgestelde actie ("Doe maar" / "Nee").
-- Schrijven gebeurt enkel via de server (service role). Lezen (voor live verversen): eigen kaarten; Casper alles.
create table if not exists public.bot_cards (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  kind text not null default 'bespreken' check (kind in ('bespreken', 'brainstorm', 'vraag', 'update', 'opdracht')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 20000),
  status text not null default 'open' check (status in ('open', 'besproken', 'archief')),
  client_id uuid references public.clients(id) on delete set null,
  link text,
  action_label text check (char_length(action_label) <= 200),
  action_detail text check (char_length(action_detail) <= 4000),
  action_status text check (action_status in ('voorgesteld', 'goedgekeurd', 'uitgevoerd', 'afgewezen')),
  bot_busy_since timestamptz,
  unread boolean not null default true,
  created_by text not null default 'grokbot',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bot_cards_owner_idx on public.bot_cards (owner_email, status);
create table if not exists public.bot_card_messages (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.bot_cards(id) on delete cascade,
  author text not null,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now()
);
create index if not exists bot_card_messages_card_idx on public.bot_card_messages (card_id, created_at);

alter table public.bot_cards enable row level security;
alter table public.bot_card_messages enable row level security;
drop policy if exists own_read on public.bot_cards;
create policy own_read on public.bot_cards for select to authenticated
  using (lower(owner_email) = lower(auth.jwt() ->> 'email') or lower(auth.jwt() ->> 'email') = 'casper@iknowright.be');
drop policy if exists own_read on public.bot_card_messages;
create policy own_read on public.bot_card_messages for select to authenticated
  using (exists (select 1 from public.bot_cards c where c.id = card_id and (lower(c.owner_email) = lower(auth.jwt() ->> 'email') or lower(auth.jwt() ->> 'email') = 'casper@iknowright.be')));

do $$
declare t text;
begin
  foreach t in array array['bot_cards', 'bot_card_messages'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
