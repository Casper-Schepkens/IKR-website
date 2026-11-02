-- Sales (Casper): één leads-tabel als bron van waarheid.
-- Een lead bestaat pas vanaf het eerste mailverkeer (contacten in Apollo zijn nog geen leads).
-- Alleen casper@iknowright.be heeft toegang; Grokbot schrijft later via een eigen server-sleutel.

create or replace function public.is_sales_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = 'casper@iknowright.be', false)
$$;
revoke execute on function public.is_sales_user() from anon;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  source text not null default 'cold_mail'
    check (source in ('cold_mail', 'website', 'event', 'linkedin', 'referral', 'other')),
  stage text not null default 'lead'
    check (stage in ('lead', 'setter_planned', 'setter_done', 'sales_planned', 'sales_done', 'next_steps', 'won', 'lost')),
  lost_reason text check (lost_reason in ('no_reply', 'not_interested', 'not_for_me')),
  lost_note text,
  stage_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists leads_email_key on public.leads (lower(email)) where email is not null;
create index if not exists leads_stage_idx on public.leads (stage, updated_at desc);

create or replace function public.leads_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  end if;
  return new;
end
$$;
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.leads_touch();

alter table public.leads enable row level security;
drop policy if exists leads_sales_only on public.leads;
create policy leads_sales_only on public.leads for all to authenticated
  using (public.is_sales_user()) with check (public.is_sales_user());
