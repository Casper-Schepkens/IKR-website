-- Chat met Grok Bot, op elke admin-pagina. Per gebruiker gescheiden.
create table if not exists public.ai_chat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'bot')),
  text text not null,
  -- Route waar het bericht verstuurd werd (bv. /admin/sales/leads/<id>).
  page text,
  -- Optioneel gekoppeld object, bv. ('lead', <id>) of ('concept', <id>).
  object_type text,
  object_id text,
  -- Voor later: acties die de frontend uitvoert, bv. [{ "actie": "open", "route": "/admin/..." }].
  actions jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_chat_user_idx on public.ai_chat (user_id, created_at desc);

alter table public.ai_chat enable row level security;
-- Elke admin ziet en voedt enkel zijn eigen chat; antwoorden van de bot schrijft de server (service role).
drop policy if exists ai_chat_own_read on public.ai_chat;
create policy ai_chat_own_read on public.ai_chat for select to authenticated
  using (user_id = auth.uid() and public.is_team_member());
drop policy if exists ai_chat_own_insert on public.ai_chat;
create policy ai_chat_own_insert on public.ai_chat for insert to authenticated
  with check (user_id = auth.uid() and role = 'user' and public.is_team_member());
