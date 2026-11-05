-- Doorschuiven ongedaan maken: onthoud wanneer en van welke weekly een to-do doorgeschoven werd.
-- Wordt leeggemaakt zodra de to-do aan de volgende ingeplande weekly gekoppeld wordt.
alter table public.weekly_todos add column if not exists pushed_at timestamptz;
alter table public.weekly_todos add column if not exists pushed_from uuid references public.weeklies(id) on delete set null;
