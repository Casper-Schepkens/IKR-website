-- Weekly-to-do's: "afgewerkt" aangevinkt vóór de weekly (grijs, niet doorstreept). Wordt leeggemaakt
-- zodra de weekly start; "done" blijft voor tijdens de weekly.
alter table public.weekly_todos add column if not exists checked_at timestamptz;
