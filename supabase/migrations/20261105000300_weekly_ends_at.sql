-- Einduur van een weekly. Online: altijd 1 uur na de start. Live: zelf gekozen.
-- Leeg (oude weeklies) = 1 uur na de start.
alter table public.weeklies add column if not exists ends_at timestamptz;
alter table public.weeklies drop constraint if exists weeklies_ends_after_start;
alter table public.weeklies add constraint weeklies_ends_after_start check (ends_at is null or ends_at > starts_at);
