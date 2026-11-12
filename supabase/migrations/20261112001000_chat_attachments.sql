-- Bijlagen in de chat met Grok Bot (bestanden staan in de Drive van contact@, gedeeld met het team).
alter table public.ai_chat add column if not exists attachments jsonb;
