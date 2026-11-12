-- "Context van Grok Bot" per call: markdown, apart van Caspers notitie. Wie en wanneer laatst bijgewerkt.
alter table public.calls
  add column if not exists bot_context text check (char_length(bot_context) <= 20000),
  add column if not exists bot_context_updated_at timestamptz,
  add column if not exists bot_context_updated_by text;
