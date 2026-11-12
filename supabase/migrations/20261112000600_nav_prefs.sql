-- Zijbalk per teamlid: eigen volgorde en vastgepinde items (blijft bewaard tussen sessies en toestellen).
alter table public.team_profiles
  add column if not exists nav_order text[],
  add column if not exists nav_pinned text[];
