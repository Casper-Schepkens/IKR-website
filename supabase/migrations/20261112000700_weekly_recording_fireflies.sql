-- Opname van een (live) weekly naar Fireflies: tijdelijk publieke link op het bestand, ingetrokken zodra
-- het transcript binnen is (of na 24 uur door de dagelijkse cron).
alter table public.weeklies
  add column if not exists recording_file_id text,
  add column if not exists recording_public_permission text;
